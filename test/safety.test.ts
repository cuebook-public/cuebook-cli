import { describe, expect, it } from "vitest"
import { assertToolCallAllowed, toolRisk } from "../src/safety.js"

describe("tool safety", () => {
  it("allows known read-only tools", () => {
    expect(toolRisk("search_assets")).toBe("read")
    expect(() => assertToolCallAllowed("search_assets", false)).not.toThrow()
  })

  it("fails closed for known writes and future unknown tools", () => {
    expect(toolRisk("place_paper_order")).toBe("confirmation-required")
    expect(toolRisk("future_tool")).toBe("confirmation-required")
    expect(() => assertToolCallAllowed("place_paper_order", false)).toThrow(
      expect.objectContaining({ message: expect.stringMatching(/--confirm/), exitCode: 2 }),
    )
    expect(() => assertToolCallAllowed("future_tool", false)).toThrow(/--confirm/)
  })

  it("honors server read-only annotations and explicit confirmation", () => {
    expect(toolRisk("future_read", { readOnlyHint: true })).toBe("read")
    expect(() => assertToolCallAllowed("future_write", true)).not.toThrow()
  })
})
