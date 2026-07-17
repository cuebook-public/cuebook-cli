import { CliError } from "./errors.js"

export type ToolRisk = "read" | "confirmation-required"

const KNOWN_READ_ONLY_TOOLS = new Set([
  "search_assets",
  "get_market_state",
  "list_asset_cues",
  "get_cues",
  "list_cues_timeline",
  "get_candles",
  "list_market_calendar",
  "list_filings",
  "list_asset_disclosures",
  "get_positioning",
  "list_asset_events",
  "list_prediction_markets",
  "list_market_briefings",
  "get_news_cluster",
  "search_news",
  "list_themes",
  "get_cues_detail",
  "get_reasoning_graph",
  "list_settlements",
  "get_paper_portfolio",
  "preview_paper_order",
  "list_paper_orders",
])

interface ToolAnnotations {
  readOnlyHint?: boolean
}

export function toolRisk(name: string, annotations?: ToolAnnotations): ToolRisk {
  if (annotations?.readOnlyHint === true) return "read"
  if (annotations?.readOnlyHint === false) return "confirmation-required"
  return KNOWN_READ_ONLY_TOOLS.has(name) ? "read" : "confirmation-required"
}

export function assertToolCallAllowed(
  name: string,
  confirmed: boolean,
  annotations?: ToolAnnotations,
): void {
  if (toolRisk(name, annotations) === "read" || confirmed) return
  throw new CliError(
    `Tool "${name}" is write-capable or unknown. Review the exact input and rerun with --confirm.`,
    2,
  )
}
