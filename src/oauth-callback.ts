import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { CliError } from "./errors.js"

export interface OAuthCallbackResult {
  code?: string
  state?: string
  error?: string
  errorDescription?: string
}

export interface OAuthCallbackServer {
  redirectUrl: string
  waitForResult: () => Promise<OAuthCallbackResult>
  close: () => Promise<void>
}

function responseHtml(ok: boolean, detail: string): string {
  const title = ok ? "Cuebook connected" : "Cuebook connection failed"
  const safeDetail = detail.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return entities[character] ?? character
  })
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
  <body style="font-family:system-ui;max-width:36rem;margin:4rem auto;padding:0 1.5rem;line-height:1.5">
    <h1>${title}</h1><p>${safeDetail}</p><p>You can close this window and return to the terminal.</p>
  </body>
</html>`
}

function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

export async function startOAuthCallbackServer(
  requestedPort: number,
  timeoutMs = 5 * 60_000,
): Promise<OAuthCallbackServer> {
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
    throw new CliError("OAuth callback port must be an integer between 0 and 65535")
  }

  let resolveResult: (value: OAuthCallbackResult) => void = () => {}
  let rejectResult: (error: Error) => void = () => {}
  const result = new Promise<OAuthCallbackResult>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })

  let settled = false
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1")
    if (url.pathname !== "/callback") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      response.end("Not found")
      return
    }

    const callback: OAuthCallbackResult = {
      ...(url.searchParams.get("code") ? { code: url.searchParams.get("code") ?? undefined } : {}),
      ...(url.searchParams.get("state")
        ? { state: url.searchParams.get("state") ?? undefined }
        : {}),
      ...(url.searchParams.get("error")
        ? { error: url.searchParams.get("error") ?? undefined }
        : {}),
      ...(url.searchParams.get("error_description")
        ? { errorDescription: url.searchParams.get("error_description") ?? undefined }
        : {}),
    }
    const ok = Boolean(callback.code) && !callback.error
    response.writeHead(ok ? 200 : 400, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    })
    response.end(
      responseHtml(
        ok,
        ok
          ? "Authorization completed successfully."
          : callback.errorDescription || callback.error || "No authorization code was returned.",
      ),
    )
    if (!settled) {
      settled = true
      resolveResult(callback)
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(requestedPort, "127.0.0.1", () => {
      server.off("error", reject)
      resolve()
    })
  }).catch((error) => {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "EADDRINUSE") {
      throw new CliError(
        `OAuth callback port ${requestedPort} is already in use.`,
        1,
        "Retry with: cuebook auth login --callback-port <another-port>",
      )
    }
    throw error
  })

  const port = (server.address() as AddressInfo).port
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true
      rejectResult(new CliError("Timed out waiting for Cuebook authorization"))
      void closeServer(server)
    }
  }, timeoutMs)

  return {
    redirectUrl: `http://127.0.0.1:${port}/callback`,
    waitForResult: () => result,
    close: async () => {
      clearTimeout(timeout)
      await closeServer(server)
    },
  }
}
