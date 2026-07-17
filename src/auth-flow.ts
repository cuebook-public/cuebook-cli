import {
  discoverOAuthServerInfo,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js"
import open from "open"
import type { ConfigStore } from "./config-store.js"
import { connectionsUrl } from "./constants.js"
import { AuthRequiredError, CliError } from "./errors.js"
import { connectMcp, createMcpSession } from "./mcp-client.js"
import { startOAuthCallbackServer } from "./oauth-callback.js"
import { withTransientRetry } from "./retry.js"

export interface LoginOptions {
  serverUrl: string
  store: ConfigStore
  callbackPort: number
  browser: boolean
  force: boolean
}

export interface LoginResult {
  alreadyAuthenticated: boolean
  toolCount: number
}

async function verifyConnection(serverUrl: string, store: ConfigStore): Promise<number> {
  return withTransientRetry(async () => {
    const connection = await connectMcp({
      serverUrl,
      store,
      useEnvironmentToken: false,
      connectAttempts: 1,
    })
    try {
      return (await connection.client.listTools()).tools.length
    } finally {
      await connection.close()
    }
  })
}

export async function login(options: LoginOptions): Promise<LoginResult> {
  const current = await options.store.getProfile(options.serverUrl)
  if (current.tokens && !options.force) {
    try {
      return {
        alreadyAuthenticated: true,
        toolCount: await verifyConnection(options.serverUrl, options.store),
      }
    } catch (error) {
      if (!(error instanceof AuthRequiredError)) throw error
    }
  }

  if (options.force) await options.store.clearTokens(options.serverUrl)

  const callback = await startOAuthCallbackServer(options.callbackPort)
  let authorizationUrl: URL | undefined
  const session = createMcpSession({
    serverUrl: options.serverUrl,
    store: options.store,
    redirectUrl: callback.redirectUrl,
    useEnvironmentToken: false,
    onRedirect: async (url) => {
      authorizationUrl = url
      console.error("Open this URL to authorize Cuebook CLI:")
      console.error(url.toString())
      if (options.browser) {
        try {
          await open(url.toString(), { wait: false })
        } catch {
          console.error("Could not open a browser automatically; use the URL above.")
        }
      }
    },
  })

  try {
    await session.client.connect(session.transport)
    return {
      alreadyAuthenticated: true,
      toolCount: (await session.client.listTools()).tools.length,
    }
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error
    if (!authorizationUrl) {
      throw new CliError("Cuebook requested authorization but returned no authorization URL")
    }

    const result = await callback.waitForResult()
    if (result.error) {
      throw new CliError(
        `Cuebook authorization failed: ${result.errorDescription || result.error}`,
        2,
        `Manage existing connections at ${connectionsUrl(options.serverUrl)}`,
      )
    }
    if (!result.code) throw new CliError("Cuebook did not return an authorization code")

    const expectedState = await session.provider?.expectedState()
    if (!expectedState || !result.state || result.state !== expectedState) {
      throw new CliError("OAuth state validation failed; no credentials were accepted")
    }

    await session.transport.finishAuth(result.code)
    return {
      alreadyAuthenticated: false,
      toolCount: await verifyConnection(options.serverUrl, options.store),
    }
  } finally {
    await callback.close().catch(() => {})
    await session.transport.close().catch(() => {})
  }
}

export interface AuthStatus {
  localCredentials: boolean
  connected: boolean
  toolCount?: number
  source?: "stored-oauth" | "environment-token"
  error?: string
}

export async function authStatus(
  serverUrl: string,
  store: ConfigStore,
  checkRemote: boolean,
): Promise<AuthStatus> {
  const profile = await store.getProfile(serverUrl)
  const environmentToken = Boolean(process.env.CUEBOOK_ACCESS_TOKEN?.trim())
  const localCredentials = Boolean(profile.tokens) || environmentToken
  const source = environmentToken
    ? ("environment-token" as const)
    : profile.tokens
      ? ("stored-oauth" as const)
      : undefined

  if (!checkRemote || !localCredentials) {
    return { localCredentials, connected: false, ...(source ? { source } : {}) }
  }

  try {
    const toolCount = await withTransientRetry(async () => {
      const connection = await connectMcp({ serverUrl, store, connectAttempts: 1 })
      try {
        return (await connection.client.listTools()).tools.length
      } finally {
        await connection.close()
      }
    })
    return { localCredentials, connected: true, toolCount, ...(source ? { source } : {}) }
  } catch (error) {
    return {
      localCredentials,
      connected: false,
      ...(source ? { source } : {}),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export interface LogoutResult {
  hadCredentials: boolean
  tokenRevocationSucceeded: boolean
  forgotClient: boolean
  manageUrl: string
  warning?: string
}

async function revokeToken(endpoint: string, token: string, hint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, token_type_hint: hint }),
  })
  if (!response.ok) throw new Error(`token revocation failed with HTTP ${response.status}`)
}

export async function logout(
  serverUrl: string,
  store: ConfigStore,
  forgetClient: boolean,
): Promise<LogoutResult> {
  const profile = await store.getProfile(serverUrl)
  const tokens = profile.tokens
  let tokenRevocationSucceeded = true
  let warning: string | undefined

  if (tokens) {
    try {
      const discovery = await discoverOAuthServerInfo(serverUrl)
      const endpoint = (
        discovery.authorizationServerMetadata as { revocation_endpoint?: string } | undefined
      )?.revocation_endpoint
      if (!endpoint) throw new Error("authorization server did not advertise token revocation")
      if (tokens.refresh_token) await revokeToken(endpoint, tokens.refresh_token, "refresh_token")
      await revokeToken(endpoint, tokens.access_token, "access_token")
    } catch (error) {
      tokenRevocationSucceeded = false
      warning = error instanceof Error ? error.message : String(error)
    }
  }

  if (forgetClient) await store.forgetClient(serverUrl)
  else await store.clearTokens(serverUrl)

  return {
    hadCredentials: Boolean(tokens),
    tokenRevocationSucceeded,
    forgotClient: forgetClient,
    manageUrl: connectionsUrl(serverUrl),
    ...(warning ? { warning } : {}),
  }
}
