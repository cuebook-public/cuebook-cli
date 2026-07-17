import { describe, expect, it, vi } from "vitest"
import { isTransientNetworkError, withTransientRetry } from "../src/retry.js"

describe("transient network retries", () => {
  it("recognizes wrapped transport failures", () => {
    const error = new TypeError("fetch failed", {
      cause: Object.assign(new Error("socket reset"), { code: "ECONNRESET" }),
    })
    expect(isTransientNetworkError(error)).toBe(true)
    expect(isTransientNetworkError(new Error("invalid request"))).toBe(false)
  })

  it("retries a bounded number of times and then succeeds", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }))
      .mockResolvedValue("ok")
    const wait = vi.fn(async () => {})

    await expect(withTransientRetry(operation, { wait })).resolves.toBe("ok")
    expect(operation).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenNthCalledWith(1, 150)
    expect(wait).toHaveBeenNthCalledWith(2, 300)
  })

  it("does not retry non-network errors", async () => {
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(new Error("invalid input"))

    await expect(withTransientRetry(operation, { wait: async () => {} })).rejects.toThrow(
      "invalid input",
    )
    expect(operation).toHaveBeenCalledOnce()
  })

  it("lets callers disable retries for write-capable operations", async () => {
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(new TypeError("fetch failed"))

    await expect(
      withTransientRetry(operation, { shouldRetry: () => false, wait: async () => {} }),
    ).rejects.toThrow("fetch failed")
    expect(operation).toHaveBeenCalledOnce()
  })
})
