import { CliError } from "./errors.js"
import { toolRisk } from "./safety.js"

interface TextContent {
  type: string
  text?: string
}

interface ToolResultLike {
  isError?: boolean
  structuredContent?: unknown
  content?: TextContent[]
}

interface ToolLike {
  name: string
  description?: string
  annotations?: { readOnlyHint?: boolean }
}

function parseTextPayload(content: TextContent[] | undefined): unknown {
  const textItems = content?.filter((item) => item.type === "text" && item.text) ?? []
  if (textItems.length === 0) return content ?? null
  if (textItems.length > 1) return textItems.map((item) => item.text)
  const text = textItems[0]?.text ?? ""
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function extractToolPayload(result: unknown): unknown {
  const candidate =
    typeof result === "object" && result !== null
      ? (result as ToolResultLike)
      : ({} as ToolResultLike)
  const payload = candidate.structuredContent ?? parseTextPayload(candidate.content)
  if (candidate.isError) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload as { error?: { message?: string }; message?: string } | null)?.error?.message ||
          (payload as { message?: string } | null)?.message ||
          JSON.stringify(payload)
    throw new CliError(`Cuebook tool failed: ${message}`)
  }
  return payload
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function printToolPayload(value: unknown, json: boolean): void {
  if (json || typeof value !== "string") {
    printJson(value)
    return
  }
  process.stdout.write(`${value}\n`)
}

function compactDescription(description: string | undefined, width = 88): string {
  const normalized = description?.replace(/\s+/g, " ").trim() || ""
  return normalized.length > width ? `${normalized.slice(0, width - 1)}…` : normalized
}

export function renderToolList(tools: ToolLike[]): string {
  const nameWidth = Math.max("TOOL".length, ...tools.map((tool) => tool.name.length))
  const riskWidth = "CONFIRM".length
  const rows = [
    `${"TOOL".padEnd(nameWidth)}  ${"ACCESS".padEnd(riskWidth)}  DESCRIPTION`,
    `${"-".repeat(nameWidth)}  ${"-".repeat(riskWidth)}  ${"-".repeat(40)}`,
  ]
  for (const tool of tools) {
    const risk = toolRisk(tool.name, tool.annotations) === "read" ? "read" : "confirm"
    rows.push(
      `${tool.name.padEnd(nameWidth)}  ${risk.padEnd(riskWidth)}  ${compactDescription(tool.description)}`,
    )
  }
  return rows.join("\n")
}
