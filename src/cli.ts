#!/usr/bin/env node

import { Command } from "commander"
import open from "open"
import { authStatus, login, logout } from "./auth-flow.js"
import { ConfigStore } from "./config-store.js"
import {
  connectionsUrl,
  DEFAULT_CALLBACK_PORT,
  DEFAULT_MCP_URL,
  resolveServerUrl,
  VERSION,
} from "./constants.js"
import { runDoctor } from "./doctor.js"
import { CliError } from "./errors.js"
import { paperAmount, parseCallbackPort, parseJsonInput, parsePositiveInteger } from "./input.js"
import { connectMcp, type McpConnection } from "./mcp-client.js"
import { extractToolPayload, printJson, printToolPayload, renderToolList } from "./output.js"
import { assertToolCallAllowed } from "./safety.js"

interface GlobalOptions {
  server: string
  json: boolean
}

function globalOptions(command: Command): GlobalOptions {
  const options = command.optsWithGlobals<GlobalOptions>()
  return { server: resolveServerUrl(options.server), json: Boolean(options.json) }
}

async function withConnection<T>(
  command: Command,
  operation: (connection: McpConnection, globals: GlobalOptions) => Promise<T>,
): Promise<T> {
  const globals = globalOptions(command)
  const connection = await connectMcp({ serverUrl: globals.server, store: new ConfigStore() })
  try {
    return await operation(connection, globals)
  } finally {
    await connection.close()
  }
}

async function invokeReadTool(
  command: Command,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  await withConnection(command, async (connection, globals) => {
    const result = await connection.client.callTool({ name, arguments: args })
    printToolPayload(extractToolPayload(result), globals.json)
  })
}

async function invokeDiscoveredTool(
  command: Command,
  name: string,
  args: Record<string, unknown>,
  confirmed: boolean,
): Promise<void> {
  await withConnection(command, async (connection, globals) => {
    const listing = await connection.client.listTools()
    const tool = listing.tools.find((candidate) => candidate.name === name)
    if (!tool) throw new CliError(`Cuebook does not currently expose a tool named "${name}"`)
    assertToolCallAllowed(name, confirmed, tool.annotations)
    const result = await connection.client.callTool({ name, arguments: args })
    printToolPayload(extractToolPayload(result), globals.json)
  })
}

function writeHuman(lines: string[]): void {
  process.stdout.write(`${lines.join("\n")}\n`)
}

const program = new Command()
  .name("cuebook")
  .description("Use Cuebook market intelligence from people, scripts, and AI agents.")
  .version(VERSION)
  .option(
    "--server <url>",
    "Cuebook MCP server URL",
    process.env.CUEBOOK_MCP_URL || DEFAULT_MCP_URL,
  )
  .option("--json", "emit machine-readable JSON")
  .showHelpAfterError()
  .showSuggestionAfterError()

program.addHelpText(
  "after",
  `
Examples:
  $ cuebook auth login
  $ cuebook assets search bitcoin --json
  $ cuebook market state btc
  $ cuebook cues latest --asset btc
  $ cuebook call get_candles --input '{"ticker":"btc","interval":"1d"}'

Environment:
  CUEBOOK_MCP_URL       Override the remote MCP URL
  CUEBOOK_ACCESS_TOKEN  Use an externally managed bearer token
  CUEBOOK_CONFIG_DIR    Override the local credential directory
`,
)

const auth = program.command("auth").description("Manage Cuebook authorization")

auth
  .command("login")
  .description("Connect this CLI to your Cuebook account in a browser")
  .option("--no-browser", "print the authorization URL without opening it")
  .option(
    "--callback-port <port>",
    "local OAuth callback port",
    parseCallbackPort,
    DEFAULT_CALLBACK_PORT,
  )
  .option("--force", "start a new authorization flow")
  .action(
    async (
      options: { browser: boolean; callbackPort: number; force?: boolean },
      command: Command,
    ) => {
      const globals = globalOptions(command)
      const result = await login({
        serverUrl: globals.server,
        store: new ConfigStore(),
        callbackPort: options.callbackPort,
        browser: options.browser,
        force: Boolean(options.force),
      })
      if (globals.json) printJson({ connected: true, ...result })
      else {
        writeHuman([
          result.alreadyAuthenticated
            ? "Cuebook CLI is already connected."
            : "Cuebook CLI is connected.",
          `${result.toolCount} tools are available.`,
        ])
      }
    },
  )

auth
  .command("status")
  .description("Show local credentials and verify the remote connection")
  .option("--offline", "only inspect local credential state")
  .action(async (options: { offline?: boolean }, command: Command) => {
    const globals = globalOptions(command)
    const result = await authStatus(globals.server, new ConfigStore(), !options.offline)
    if (globals.json) printJson(result)
    else if (result.connected) {
      writeHuman([
        `Connected to ${globals.server}`,
        `Credential source: ${result.source}`,
        `Available tools: ${result.toolCount ?? 0}`,
      ])
    } else if (result.localCredentials) {
      writeHuman([
        "Local credentials exist, but the remote connection could not be verified.",
        ...(result.error ? [`Reason: ${result.error}`] : []),
      ])
    } else {
      writeHuman(["Not connected.", "Run: cuebook auth login"])
    }
  })

auth
  .command("logout")
  .description("Revoke local OAuth tokens and remove them from this machine")
  .option("--forget-client", "also discard the dynamic client registration")
  .action(async (options: { forgetClient?: boolean }, command: Command) => {
    const globals = globalOptions(command)
    const result = await logout(globals.server, new ConfigStore(), Boolean(options.forgetClient))
    if (globals.json) printJson(result)
    else {
      writeHuman([
        result.hadCredentials
          ? "Local Cuebook credentials were removed."
          : "No local credentials found.",
        result.tokenRevocationSucceeded
          ? "Stored OAuth tokens were revoked when possible."
          : `Remote token revocation could not be confirmed: ${result.warning}`,
        `To remove the connection and release its Agent slot, visit: ${result.manageUrl}`,
      ])
    }
  })

program
  .command("connections")
  .description("Open Cuebook's connected Agent management page")
  .option("--no-browser", "print the URL without opening it")
  .action(async (options: { browser: boolean }, command: Command) => {
    const globals = globalOptions(command)
    const url = connectionsUrl(globals.server)
    if (globals.json) printJson({ url })
    else writeHuman([url])
    if (options.browser) await open(url, { wait: false })
  })

const tools = program.command("tools").description("Inspect the live Cuebook MCP tool surface")

tools
  .command("list")
  .description("List tools from the connected Cuebook MCP server")
  .action(async (_options: unknown, command: Command) => {
    await withConnection(command, async (connection, globals) => {
      const listing = await connection.client.listTools()
      if (globals.json) printJson(listing.tools)
      else writeHuman([renderToolList(listing.tools)])
    })
  })

program
  .command("call")
  .description("Call any currently exposed Cuebook MCP tool")
  .argument("<tool>", "tool name from `cuebook tools list`")
  .option("--input <json>", "tool arguments as a JSON object")
  .option("--file <path>", "read tool arguments from a JSON file")
  .option("--confirm", "allow a write-capable or unknown tool")
  .action(
    async (
      tool: string,
      options: { input?: string; file?: string; confirm?: boolean },
      command: Command,
    ) => {
      const args = await parseJsonInput(options)
      await invokeDiscoveredTool(command, tool, args, Boolean(options.confirm))
    },
  )

const assets = program.command("assets").description("Resolve Cuebook assets")

assets
  .command("search")
  .description("Search assets by name or symbol")
  .argument("<query>", "asset name or symbol")
  .option("--limit <number>", "maximum results", parsePositiveInteger, 10)
  .action(async (query: string, options: { limit: number }, command: Command) => {
    await invokeReadTool(command, "search_assets", { query, limit: options.limit })
  })

const market = program.command("market").description("Read Cuebook market data")

market
  .command("state")
  .description("Read the latest persisted market state")
  .argument("<tickers...>", "one to ten canonical tickers")
  .action(async (tickers: string[], _options: unknown, command: Command) => {
    if (tickers.length > 10) throw new CliError("At most 10 tickers may be requested")
    await invokeReadTool(command, "get_market_state", { tickers })
  })

const cues = program.command("cues").description("Read Cuebook's published market cognition")

cues
  .command("latest")
  .description("Read the newest Cuebook stories globally or for one asset")
  .option("--asset <ticker>", "canonical ticker from assets search")
  .option("--keyword <text>", "filter an asset's title and summary")
  .option("--limit <number>", "maximum results", parsePositiveInteger, 10)
  .option("--cursor <cursor>", "opaque cursor from a previous response")
  .action(
    async (
      options: { asset?: string; keyword?: string; limit: number; cursor?: string },
      command: Command,
    ) => {
      if (!options.asset && options.keyword) {
        throw new CliError("--keyword requires --asset")
      }
      if (options.asset) {
        await invokeReadTool(command, "list_asset_cues", {
          ticker: options.asset,
          limit: options.limit,
          ...(options.keyword ? { keyword: options.keyword } : {}),
          ...(options.cursor ? { cursor: options.cursor } : {}),
        })
        return
      }
      await invokeReadTool(command, "list_cues_timeline", {
        limit: options.limit,
        ...(options.cursor ? { cursor: options.cursor } : {}),
      })
    },
  )

const paper = program.command("paper").description("Use Cuebook's simulated paper portfolio")

paper
  .command("portfolio")
  .description("Show the simulated portfolio; never real funds")
  .action(async (_options: unknown, command: Command) => {
    await invokeReadTool(command, "get_paper_portfolio", {})
  })

paper
  .command("preview")
  .description("Preview a simulated order without placing it")
  .argument("<ticker>", "canonical ticker")
  .requiredOption("--side <buy|sell>", "simulated order side")
  .option("--quantity <amount>", "asset quantity as a positive decimal")
  .option("--notional-usd <amount>", "USD notional as a positive decimal")
  .action(
    async (
      ticker: string,
      options: { side: string; quantity?: string; notionalUsd?: string },
      command: Command,
    ) => {
      if (options.side !== "buy" && options.side !== "sell") {
        throw new CliError("--side must be buy or sell")
      }
      await invokeReadTool(command, "preview_paper_order", {
        ticker,
        action: options.side,
        ...paperAmount(options.quantity, options.notionalUsd),
      })
    },
  )

program
  .command("doctor")
  .description("Check discovery metadata, local auth, and MCP connectivity")
  .action(async (_options: unknown, command: Command) => {
    const globals = globalOptions(command)
    const result = await runDoctor(globals.server, new ConfigStore())
    printJson(result)
    if (!result.ok) process.exitCode = 1
  })

try {
  await program.parseAsync(process.argv)
} catch (error) {
  const debug = process.env.CUEBOOK_DEBUG === "1"
  const message = error instanceof Error ? error.message : String(error)
  const hint = error instanceof CliError ? error.hint : undefined
  const exitCode = error instanceof CliError ? error.exitCode : 1

  if (process.argv.includes("--json")) {
    printJson({ error: { message, ...(hint ? { hint } : {}) } })
  } else {
    console.error(`Error: ${message}`)
    if (hint) console.error(`Hint: ${hint}`)
    if (debug && error instanceof Error && error.stack) console.error(error.stack)
  }
  process.exitCode = exitCode
}
