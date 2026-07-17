import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { ConfigStore } from "./config-store.js"
import { DEFAULT_CALLBACK_PORT, VERSION } from "./constants.js"
import { AuthRequiredError } from "./errors.js"
import { CuebookOAuthProvider } from "./oauth-provider.js"

export interface McpSession {
  client: Client
  transport: StreamableHTTPClientTransport
  provider?: CuebookOAuthProvider
}

export interface McpConnection extends McpSession {
  close: () => Promise<void>
}

interface SessionOptions {
  serverUrl: string
  store: ConfigStore
  redirectUrl?: string
  onRedirect?: (url: URL) => void | Promise<void>
  useEnvironmentToken?: boolean
}

export function createMcpSession(options: SessionOptions): McpSession {
  const client = new Client({ name: "cuebook-cli", version: VERSION }, { capabilities: {} })
  const environmentToken =
    options.useEnvironmentToken === false ? undefined : process.env.CUEBOOK_ACCESS_TOKEN?.trim()

  if (environmentToken) {
    const transport = new StreamableHTTPClientTransport(new URL(options.serverUrl), {
      requestInit: {
        headers: { Authorization: `Bearer ${environmentToken}` },
      },
    })
    return { client, transport }
  }

  const redirectUrl = options.redirectUrl ?? `http://127.0.0.1:${DEFAULT_CALLBACK_PORT}/callback`
  const provider = new CuebookOAuthProvider(
    options.store,
    options.serverUrl,
    redirectUrl,
    options.onRedirect,
  )
  const transport = new StreamableHTTPClientTransport(new URL(options.serverUrl), {
    authProvider: provider,
  })
  return { client, transport, provider }
}

export async function connectMcp(options: SessionOptions): Promise<McpConnection> {
  const session = createMcpSession(options)
  try {
    await session.client.connect(session.transport)
  } catch (error) {
    await session.transport.close().catch(() => {})
    if (error instanceof UnauthorizedError) throw new AuthRequiredError()
    throw error
  }
  return {
    ...session,
    close: async () => {
      await session.client.close()
    },
  }
}
