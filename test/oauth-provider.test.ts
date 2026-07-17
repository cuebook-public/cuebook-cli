import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ConfigStore } from "../src/config-store.js"
import { CuebookOAuthProvider } from "../src/oauth-provider.js"

const temporaryDirectories: string[] = []

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "cuebook-cli-oauth-"))
  temporaryDirectories.push(directory)
  const store = new ConfigStore(join(directory, "credentials.json"))
  const serverUrl = "https://cuebook.xyz/mcp"
  const redirectUrl = "http://127.0.0.1:53682/callback"
  return {
    store,
    serverUrl,
    provider: new CuebookOAuthProvider(store, serverUrl, redirectUrl),
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe("CuebookOAuthProvider", () => {
  it("declares a public PKCE client", async () => {
    const { provider } = await fixture()
    expect(provider.clientMetadata.client_name).toBe("Cuebook CLI")
    expect(provider.clientMetadata.token_endpoint_auth_method).toBe("none")
    expect(provider.clientMetadata.grant_types).toContain("authorization_code")
    expect(provider.clientMetadata.redirect_uris).toEqual([provider.redirectUrl])
  })

  it("persists registration and tokens but clears one-time OAuth state", async () => {
    const { store, serverUrl, provider } = await fixture()
    const state = await provider.state()
    await provider.saveCodeVerifier("verifier")
    await provider.saveClientInformation({ client_id: "client-1" })

    expect(await provider.expectedState()).toBe(state)
    expect(await provider.codeVerifier()).toBe("verifier")
    expect(await provider.clientInformation()).toEqual({ client_id: "client-1" })

    await provider.saveTokens({ access_token: "access", token_type: "Bearer" })
    const profile = await store.getProfile(serverUrl)
    expect(profile.tokens?.access_token).toBe("access")
    expect(profile.codeVerifier).toBeUndefined()
    expect(profile.oauthState).toBeUndefined()
  })
})
