import { authStatus } from "./auth-flow.js"
import type { ConfigStore } from "./config-store.js"

interface ProbeResult {
  ok: boolean
  status?: number
  error?: string
}

async function probe(url: string): Promise<ProbeResult> {
  let lastResult: ProbeResult = { ok: false, error: "metadata probe did not run" }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } })
      if (!response.ok) {
        lastResult = { ok: false, status: response.status }
      } else {
        await response.json()
        return { ok: true, status: response.status }
      }
    } catch (error) {
      lastResult = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
  }
  return lastResult
}

export async function runDoctor(serverUrl: string, store: ConfigStore) {
  const origin = new URL(serverUrl).origin
  const [resourceMetadata, authorizationMetadata, authentication] = await Promise.all([
    probe(`${origin}/.well-known/oauth-protected-resource`),
    probe(`${origin}/.well-known/oauth-authorization-server`),
    authStatus(serverUrl, store, true),
  ])
  return {
    serverUrl,
    checks: {
      resourceMetadata,
      authorizationMetadata,
      authentication,
    },
    ok: resourceMetadata.ok && authorizationMetadata.ok && authentication.connected,
  }
}
