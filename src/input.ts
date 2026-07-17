import { readFile } from "node:fs/promises"
import { CliError } from "./errors.js"

export interface JsonInputOptions {
  inline?: string
  file?: string
}

export async function parseJsonInput(options: JsonInputOptions): Promise<Record<string, unknown>> {
  if (options.inline && options.file) {
    throw new CliError("Use either --input or --file, not both")
  }
  const source = options.file ? await readFile(options.file, "utf8") : options.inline
  if (!source) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new CliError(
      `Tool input must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CliError("Tool input must be a JSON object")
  }
  return parsed as Record<string, unknown>
}

export function parsePositiveInteger(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new CliError("Expected a positive integer")
  return parsed
}

export function parseCallbackPort(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new CliError("Callback port must be an integer between 1 and 65535")
  }
  return parsed
}

export function paperAmount(
  quantity: string | undefined,
  notionalUsd: string | undefined,
): { quantity?: string; notionalUsd?: string } {
  if (Boolean(quantity) === Boolean(notionalUsd)) {
    throw new CliError("Provide exactly one of --quantity or --notional-usd")
  }
  const value = quantity ?? notionalUsd
  if (!value || !/^\d+(\.\d+)?$/.test(value) || Number(value) <= 0) {
    throw new CliError("Paper order amount must be a positive decimal")
  }
  return quantity ? { quantity } : { notionalUsd: value }
}
