<p align="center">
  <a href="https://cuebook.xyz">
    <img
      src="https://raw.githubusercontent.com/cuebook-public/cuebook-cli/main/assets/cuebook-cli-logo.png"
      width="200"
      alt="Cuebook CLI"
    />
  </a>
</p>

<h1 align="center">Cuebook CLI — market intelligence for humans and AI agents</h1>

<p align="center">
  The official command-line interface for Cuebook. Bring sourced Cues,
  market context, catalysts, and safe paper-trading workflows into Codex,
  Claude Code, OpenClaw, scripts, or any terminal.
</p>

<p align="center">
  <a href="https://github.com/cuebook-public/cuebook-cli/releases/latest">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/cuebook-public/cuebook-cli?style=flat-square&amp;color=F5C400" />
  </a>
  <a href="https://github.com/cuebook-public/cuebook-cli/actions/workflows/ci.yml">
    <img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/cuebook-public/cuebook-cli/ci.yml?branch=main&amp;style=flat-square&amp;label=CI" />
  </a>
  <img alt="Node.js 20 or newer" src="https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=flat-square&amp;logo=nodedotjs&amp;logoColor=white" />
  <img alt="MCP over Streamable HTTP" src="https://img.shields.io/badge/MCP-Streamable_HTTP-F5C400?style=flat-square" />
  <a href="LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-111111?style=flat-square" />
  </a>
</p>

<p align="center">
  <a href="#cuebook-surfaces">Surfaces</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-cuebook-cli">Why Cuebook CLI</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#agent-workflows">Agent Workflows</a> ·
  <a href="#write-safety">Write Safety</a> ·
  <a href="#authentication">Authentication</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://github.com/cuebook-public/cuebook-skills">Skills</a>
</p>

---

## Overview

Every trade starts with a cue. `cuebook` (alias: `cbk`) makes Cuebook
available wherever you already work: a terminal, a script, or an AI coding
agent.

Use focused commands for everyday tasks, or discover and call the full Tool
surface at runtime:

- resolve assets and inspect market state;
- read sourced Cues, themes, events, filings, and disclosures;
- explore reasoning graphs, positioning, calendars, and prediction markets;
- inspect a virtual portfolio and preview paper orders;
- return deterministic JSON for agents and automation.

No exchange API keys. No wallet credentials. No real-money execution.

## Cuebook Surfaces

| Surface | Best for | Current contract |
| --- | --- | --- |
| **[Cuebook CLI](https://github.com/cuebook-public/cuebook-cli)** | Terminal use, scripts, automation, and direct Tool inspection | Live Tool discovery, structured JSON, OAuth connection management, and fail-closed write confirmation |
| **[Cuebook Skills](https://github.com/cuebook-public/cuebook-skills)** | Natural-language research and guided Frame creation in Codex | Two public entrypoints; internal research, rendering, and publication modules load on demand |

Both surfaces connect to Cuebook MCP. The server remains authoritative for the Tools and scopes available to each connection. Use the CLI when you want explicit commands and machine-readable output; use Skills when you want Cuebook to interview, research, compose, and visually express an idea.

## Quick Start

### Requirements

- Node.js 20 or newer
- A Cuebook account

### Install

```bash
git clone https://github.com/cuebook-public/cuebook-cli.git
cd cuebook-cli
npm ci
npm run build
npm link
```

This installs both `cuebook` and the shorter `cbk` alias.

### Connect your account

```bash
cuebook auth login
```

Your browser opens Cuebook. Review the request and approve it to connect the
CLI.

### Make your first calls

```bash
cuebook tools list
cuebook assets search bitcoin
cuebook market state btc
cuebook cues latest --asset btc
```

## Why Cuebook CLI

| What an agent needs | How Cuebook CLI answers it |
| --- | --- |
| A surface it can learn at runtime | `cuebook tools list` returns the current Tool catalog |
| Commands it can compose without guessing | Focused verbs cover assets, market state, Cues, diagnostics, and paper trading |
| Output it can parse reliably | Global `--json` returns structured results and errors |
| Secure account access | OAuth 2.1, PKCE, and explicit browser approval |
| Safe behavior around new capabilities | Known reads run normally; writes and unknown Tools require `--confirm` |
| Network resilience without duplicate actions | Transient reads can retry; write calls never retry automatically |

The result is a small, self-describing command surface that works equally well
for a person at the keyboard and an agent operating through a shell.

## Commands

### Command reference

| Command | Purpose |
| --- | --- |
| `cuebook auth login` | Connect the CLI to your Cuebook account |
| `cuebook auth status` | Check the current connection |
| `cuebook auth logout` | Remove local OAuth credentials |
| `cuebook connections` | Manage connected Agents |
| `cuebook tools list` | Discover available Tools |
| `cuebook assets search <query>` | Find an asset and its canonical ticker |
| `cuebook market state <tickers...>` | Read the latest market snapshot |
| `cuebook cues latest` | Read the newest Cues |
| `cuebook cues latest --asset <ticker>` | Read Cues for one asset |
| `cuebook paper portfolio` | Inspect your virtual portfolio |
| `cuebook paper preview <ticker> ...` | Preview a paper order |
| `cuebook call <tool>` | Call any available Tool |
| `cuebook doctor` | Diagnose authentication and connectivity |

### Everyday examples

```bash
# Resolve an asset, then inspect its market state
cuebook assets search bitcoin
cuebook market state btc

# Read current market narratives
cuebook cues latest
cuebook cues latest --asset nvda --limit 5

# Preview a simulated order — nothing is placed
cuebook paper preview btc --side buy --notional-usd 100

# Read historical candles
cuebook call get_candles \
  --input '{"ticker":"btc","interval":"1d"}'

# Read arguments from a JSON file
cuebook call get_reasoning_graph --file request.json
```

### What you can explore

| Area | Capabilities |
| --- | --- |
| Assets and market | Asset search, market snapshots, historical candles |
| Cues and reasoning | Asset Cues, global timeline, themes, details, reasoning graphs |
| Events and research | Events, market briefings, news clusters, search, filings, disclosures |
| Positioning and catalysts | Positioning, market calendar, prediction markets, settlements |
| Paper trading | Virtual portfolio, order preview, paper orders, position closing, order history |

The available surface can evolve. `cuebook tools list` shows the current Tool
names, descriptions, inputs, and safety classification granted to that
connection. The README does not promise a Tool that the server has not exposed.

## Agent Workflows

Use the global `--json` flag whenever another program will consume the result:

```bash
cuebook --json assets search NVDA
cuebook --json cues latest --asset nvda
cuebook --json market state btc | jq -r '.data.quotes[0].price'
```

### Output contract

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully |
| `1` | The command failed |
| `2` | Authorization or explicit write confirmation is required |

JSON errors use a stable envelope:

```json
{
  "error": {
    "message": "Cuebook authorization is required.",
    "hint": "Run: cuebook auth login"
  }
}
```

### Generic Tool calls

`cuebook call` is the escape hatch for capabilities that do not yet have a
focused command:

```bash
cuebook call <tool> --input '{"key":"value"}'
cuebook call <tool> --file request.json
```

An agent can start with `cuebook tools list`, select a Tool, assemble its
arguments, and call it without relying on a hard-coded catalog.

## Write Safety

Cuebook CLI fails closed around writes:

1. Known read operations run normally.
2. A write-capable or newly introduced Tool requires `--confirm`.
3. Confirmed writes are sent once and never retried automatically.
4. Paper-trading actions use virtual funds only.

```bash
# Blocked: explicit confirmation is missing
cuebook call place_paper_order --file order.json

# Sends one simulated paper order after review
cuebook call place_paper_order --file order.json --confirm
```

Confirmation is an additional client-side guard. Cuebook still applies the
permissions, limits, idempotency rules, and validation required for each Tool.

Cuebook CLI cannot place real trades, transfer money, access an exchange
account, or request exchange and wallet secrets.

## Authentication

`cuebook auth login` uses OAuth 2.1 with PKCE and opens Cuebook in your
browser. Access is granted only after you approve the connection.

- Credentials are stored in an owner-only local file (`0600` on Unix-like
  systems).
- Set `CUEBOOK_CONFIG_DIR` to choose a different credential directory.
- Set `CUEBOOK_ACCESS_TOKEN` for externally managed automation; the CLI never
  writes that value to disk.
- Each authorized CLI uses one Agent connection.
- A Cuebook account can keep up to three active Agent connections.

### Disconnect and release a slot

```bash
cuebook connections
```

Choose **Disconnect** next to the connection you no longer use. Local logout
removes credentials from the current machine; disconnecting in Cuebook also
releases the Agent slot.

## Configuration

| Variable | Purpose |
| --- | --- |
| `CUEBOOK_MCP_URL` | Use a different MCP endpoint |
| `CUEBOOK_ACCESS_TOKEN` | Use an externally managed Bearer Token |
| `CUEBOOK_CONFIG_DIR` | Choose the local credential directory |
| `CUEBOOK_DEBUG=1` | Print stack traces for CLI errors |

The default endpoint is `https://cuebook.xyz/mcp`.

## Troubleshooting

Start with:

```bash
cuebook doctor
```

| Symptom | Resolution |
| --- | --- |
| `Cuebook authorization is required` | Run `cuebook auth login` and approve the request |
| Connection limit reached | Run `cuebook connections` and disconnect an unused Agent |
| OAuth callback port is busy | Run `cuebook auth login --callback-port 53683` |
| Persistent `fetch failed` | Check TLS, proxy, VPN, and network access, then run `cuebook doctor` |
| Local logout did not free a slot | Disconnect the connection from `cuebook connections` |

`cuebook doctor` never prints OAuth tokens.

## Development

```bash
npm ci
npm run check
```

The quality gate runs Biome, TypeScript checks, automated tests, a production
build, a CLI smoke test, and an npm package dry run. CI covers Node.js 20, 22,
and 24.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and
[SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License and Disclaimer

Cuebook CLI is available under the [MIT License](LICENSE).

Cuebook provides market information, structured reasoning, and simulated
tools. It does not provide investment advice. A Cue is not a recommendation
to trade, and every decision remains yours.
