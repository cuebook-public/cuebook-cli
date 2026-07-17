export const VERSION = "0.1.0"
export const DEFAULT_MCP_URL = "https://cuebook.xyz/mcp"
export const DEFAULT_CALLBACK_PORT = 53_682
export const CLIENT_NAME = "Cuebook CLI"
export const CLIENT_SOFTWARE_ID = "app.cuebook.cli"
export const CLIENT_REPOSITORY_URL = "https://github.com/cuebook-public/cuebook-cli"

export function resolveServerUrl(value?: string): string {
  const candidate = value?.trim() || process.env.CUEBOOK_MCP_URL?.trim() || DEFAULT_MCP_URL
  const url = new URL(candidate)
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("MCP server must use HTTPS unless it is a loopback development server")
  }
  url.hash = ""
  url.search = ""
  return url.toString().replace(/\/$/, "")
}

export function connectionsUrl(serverUrl: string): string {
  return new URL("/mcp/connections", serverUrl).toString()
}
