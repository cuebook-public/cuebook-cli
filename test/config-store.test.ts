import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ConfigStore } from "../src/config-store.js"

const temporaryDirectories: string[] = []

async function makeStore(): Promise<ConfigStore> {
  const directory = await mkdtemp(join(tmpdir(), "cuebook-cli-store-"))
  temporaryDirectories.push(directory)
  return new ConfigStore(join(directory, "credentials.json"))
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe("ConfigStore", () => {
  it("persists profiles per normalized server URL", async () => {
    const store = await makeStore()
    await store.updateProfile("https://cuebook.xyz/mcp/", () => ({
      tokens: { access_token: "access", refresh_token: "refresh", token_type: "Bearer" },
    }))

    const profile = await store.getProfile("https://cuebook.xyz/mcp")
    expect(profile.tokens?.access_token).toBe("access")
    expect(profile.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    if (process.platform !== "win32") {
      expect((await stat(store.path)).mode & 0o777).toBe(0o600)
    }
  })

  it("clears tokens without discarding client registration", async () => {
    const store = await makeStore()
    const server = "https://cuebook.xyz/mcp"
    await store.updateProfile(server, () => ({
      clientInformation: { client_id: "client-1" },
      tokens: { access_token: "access", token_type: "Bearer" },
      codeVerifier: "verifier",
      oauthState: "state",
    }))

    await store.clearTokens(server)
    const profile = await store.getProfile(server)
    expect(profile.clientInformation).toEqual({ client_id: "client-1" })
    expect(profile.tokens).toBeUndefined()
    expect(profile.codeVerifier).toBeUndefined()
    expect(profile.oauthState).toBeUndefined()
  })

  it("can forget a registered client completely", async () => {
    const store = await makeStore()
    const server = "https://cuebook.xyz/mcp"
    await store.updateProfile(server, () => ({ clientInformation: { client_id: "client-1" } }))
    await store.forgetClient(server)
    expect(await store.getProfile(server)).toEqual({})
  })
})
