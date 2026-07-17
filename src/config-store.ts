import { randomUUID } from "node:crypto"
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js"
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js"

export interface AuthProfile {
  clientInformation?: OAuthClientInformationMixed
  tokens?: OAuthTokens
  codeVerifier?: string
  oauthState?: string
  discoveryState?: OAuthDiscoveryState
  redirectUrl?: string
  updatedAt?: string
}

interface ConfigFileV1 {
  version: 1
  profiles: Record<string, AuthProfile>
}

function emptyConfig(): ConfigFileV1 {
  return { version: 1, profiles: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeServerKey(serverUrl: string): string {
  const url = new URL(serverUrl)
  url.hash = ""
  url.search = ""
  return url.toString().replace(/\/$/, "")
}

export function defaultConfigPath(): string {
  const override = process.env.CUEBOOK_CONFIG_DIR?.trim()
  if (override) return join(override, "credentials.json")
  if (process.platform === "win32" && process.env.APPDATA) {
    return join(process.env.APPDATA, "Cuebook", "credentials.json")
  }
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config")
  return join(base, "cuebook", "credentials.json")
}

export class ConfigStore {
  constructor(readonly path = defaultConfigPath()) {}

  async getProfile(serverUrl: string): Promise<AuthProfile> {
    const state = await this.read()
    return { ...(state.profiles[normalizeServerKey(serverUrl)] ?? {}) }
  }

  async updateProfile(
    serverUrl: string,
    update: (current: AuthProfile) => AuthProfile,
  ): Promise<AuthProfile> {
    const state = await this.read()
    const key = normalizeServerKey(serverUrl)
    const next = {
      ...update({ ...(state.profiles[key] ?? {}) }),
      updatedAt: new Date().toISOString(),
    }
    state.profiles[key] = next
    await this.write(state)
    return { ...next }
  }

  async clearTokens(serverUrl: string): Promise<void> {
    await this.updateProfile(serverUrl, (current) => {
      const next = { ...current }
      delete next.tokens
      delete next.codeVerifier
      delete next.oauthState
      return next
    })
  }

  async forgetClient(serverUrl: string): Promise<void> {
    const state = await this.read()
    delete state.profiles[normalizeServerKey(serverUrl)]
    await this.write(state)
  }

  private async read(): Promise<ConfigFileV1> {
    let raw: string
    try {
      raw = await readFile(this.path, "utf8")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyConfig()
      throw error
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.profiles)) {
      throw new Error(`Unsupported or malformed Cuebook CLI config: ${this.path}`)
    }
    return parsed as unknown as ConfigFileV1
  }

  private async write(state: ConfigFileV1): Promise<void> {
    const directory = dirname(this.path)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`
    const body = `${JSON.stringify(state, null, 2)}\n`
    await writeFile(temporary, body, { encoding: "utf8", mode: 0o600 })
    await rename(temporary, this.path)
    if (process.platform !== "win32") await chmod(this.path, 0o600)
  }
}
