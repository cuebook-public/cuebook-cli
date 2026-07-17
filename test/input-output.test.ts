import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { paperAmount, parseJsonInput } from "../src/input.js"
import { extractToolPayload, renderToolList } from "../src/output.js"

describe("JSON input", () => {
  it("accepts inline objects and rejects arrays", async () => {
    await expect(parseJsonInput({ inline: '{"ticker":"asset:btc"}' })).resolves.toEqual({
      ticker: "asset:btc",
    })
    await expect(parseJsonInput({ inline: "[]" })).rejects.toThrow(/JSON object/)
  })

  it("reads an input file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cuebook-cli-input-"))
    const path = join(directory, "input.json")
    try {
      await writeFile(path, '{"limit":5}')
      await expect(parseJsonInput({ file: path })).resolves.toEqual({ limit: 5 })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe("paper amounts", () => {
  it("requires exactly one positive amount", () => {
    expect(paperAmount("1.5", undefined)).toEqual({ quantity: "1.5" })
    expect(paperAmount(undefined, "100")).toEqual({ notionalUsd: "100" })
    expect(() => paperAmount(undefined, undefined)).toThrow(/exactly one/)
    expect(() => paperAmount("1", "100")).toThrow(/exactly one/)
  })
})

describe("MCP output", () => {
  it("prefers structured content and parses legacy text envelopes", () => {
    expect(extractToolPayload({ structuredContent: { ok: true }, content: [] })).toEqual({
      ok: true,
    })
    expect(extractToolPayload({ content: [{ type: "text", text: '{"data":1}' }] })).toEqual({
      data: 1,
    })
  })

  it("raises typed tool errors", () => {
    expect(() =>
      extractToolPayload({
        isError: true,
        content: [{ type: "text", text: '{"error":{"message":"not found"}}' }],
      }),
    ).toThrow(/not found/)
  })

  it("labels unknown tools as confirmation-required", () => {
    const output = renderToolList([
      { name: "search_assets", description: "Search" },
      { name: "new_write", description: "Write" },
    ])
    expect(output).toContain("search_assets")
    expect(output).toMatch(/new_write\s+confirm/)
  })
})
