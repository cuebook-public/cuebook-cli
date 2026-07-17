import { describe, expect, it } from "vitest"
import { startOAuthCallbackServer } from "../src/oauth-callback.js"

describe("OAuth callback server", () => {
  it("captures an authorization code and state", async () => {
    const callback = await startOAuthCallbackServer(0, 2_000)
    try {
      const response = await fetch(`${callback.redirectUrl}?code=abc&state=expected`)
      expect(response.status).toBe(200)
      await expect(callback.waitForResult()).resolves.toEqual({ code: "abc", state: "expected" })
    } finally {
      await callback.close()
    }
  })

  it("captures OAuth errors without treating them as success", async () => {
    const callback = await startOAuthCallbackServer(0, 2_000)
    try {
      const response = await fetch(
        `${callback.redirectUrl}?error=access_denied&error_description=User%20cancelled`,
      )
      expect(response.status).toBe(400)
      await expect(callback.waitForResult()).resolves.toEqual({
        error: "access_denied",
        errorDescription: "User cancelled",
      })
    } finally {
      await callback.close()
    }
  })
})
