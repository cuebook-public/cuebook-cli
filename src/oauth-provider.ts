import { randomBytes } from "node:crypto"
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js"
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js"
import type { ConfigStore } from "./config-store.js"
import { CLIENT_NAME, CLIENT_REPOSITORY_URL, CLIENT_SOFTWARE_ID, VERSION } from "./constants.js"

type RedirectHandler = (authorizationUrl: URL) => void | Promise<void>

export class CuebookOAuthProvider implements OAuthClientProvider {
  constructor(
    private readonly store: ConfigStore,
    private readonly serverUrl: string,
    private readonly callbackUrl: string,
    private readonly onRedirect: RedirectHandler = () => {},
  ) {}

  get redirectUrl(): string {
    return this.callbackUrl
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.callbackUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: CLIENT_NAME,
      client_uri: CLIENT_REPOSITORY_URL,
      software_id: CLIENT_SOFTWARE_ID,
      software_version: VERSION,
    }
  }

  async state(): Promise<string> {
    const value = randomBytes(24).toString("base64url")
    await this.store.updateProfile(this.serverUrl, (current) => ({
      ...current,
      oauthState: value,
      redirectUrl: this.callbackUrl,
    }))
    return value
  }

  async expectedState(): Promise<string | undefined> {
    return (await this.store.getProfile(this.serverUrl)).oauthState
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    return (await this.store.getProfile(this.serverUrl)).clientInformation
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    await this.store.updateProfile(this.serverUrl, (current) => ({
      ...current,
      clientInformation,
      redirectUrl: this.callbackUrl,
    }))
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await this.store.getProfile(this.serverUrl)).tokens
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.store.updateProfile(this.serverUrl, (current) => {
      const next = { ...current, tokens, redirectUrl: this.callbackUrl }
      delete next.codeVerifier
      delete next.oauthState
      return next
    })
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this.onRedirect(authorizationUrl)
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.store.updateProfile(this.serverUrl, (current) => ({
      ...current,
      codeVerifier,
      redirectUrl: this.callbackUrl,
    }))
  }

  async codeVerifier(): Promise<string> {
    const value = (await this.store.getProfile(this.serverUrl)).codeVerifier
    if (!value) throw new Error("OAuth code verifier is missing; restart `cuebook auth login`")
    return value
  }

  async saveDiscoveryState(discoveryState: OAuthDiscoveryState): Promise<void> {
    await this.store.updateProfile(this.serverUrl, (current) => ({
      ...current,
      discoveryState,
    }))
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return (await this.store.getProfile(this.serverUrl)).discoveryState
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): Promise<void> {
    await this.store.updateProfile(this.serverUrl, (current) => {
      if (scope === "all") return {}
      const next = { ...current }
      if (scope === "client") delete next.clientInformation
      if (scope === "tokens") delete next.tokens
      if (scope === "verifier") {
        delete next.codeVerifier
        delete next.oauthState
      }
      if (scope === "discovery") delete next.discoveryState
      return next
    })
  }
}
