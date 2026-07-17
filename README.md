# Cuebook CLI

[简体中文](README.zh-CN.md)

The official command-line client for [Cuebook](https://cuebook.xyz). It gives
people, scripts, and terminal-native AI agents a stable interface to Cuebook's
remote MCP server.

```text
person or AI agent
        │
        ▼
   cuebook CLI
        │  Streamable HTTP + OAuth 2.1
        ▼
https://cuebook.xyz/mcp
```

The CLI is a thin client. Market data, published Cuebook research,
authorization, rate limits, and paper-trading rules remain on Cuebook's hosted
service.

## Status

`v0.1.1` is an early public preview. The source repository is ready to use;
publishing the `@cuebook/cli` npm package is a separate release step and has
not happened yet.

## Install from source

Node.js 20 or newer is required.

```bash
git clone https://github.com/cuebook-public/cuebook-cli.git
cd cuebook-cli
npm ci
npm run build
npm link
```

Then connect your Cuebook account:

```bash
cuebook auth login
```

The CLI opens Cuebook in your browser. Signing in does not grant access until
you approve the connection.

## Commands

```bash
# Authentication and connection management
cuebook auth login
cuebook auth status
cuebook auth logout
cuebook connections

# Discover the live server surface
cuebook tools list

# Friendly read commands
cuebook assets search bitcoin
cuebook market state btc
cuebook cues latest
cuebook cues latest --asset btc
cuebook paper portfolio
cuebook paper preview btc --side buy --notional-usd 100

# Call any currently exposed MCP tool
cuebook call get_candles \
  --input '{"ticker":"btc","interval":"1d"}'
```

Use `--json` for deterministic agent and script output:

```bash
cuebook --json assets search NVDA
cuebook --json cues latest --asset nvda
```

Arguments for `cuebook call` can also come from a file:

```bash
cuebook call get_reasoning_graph --file request.json
```

## Write safety

The CLI treats the live MCP tool list as the capability source of truth.
Known read operations run normally. A write-capable or unknown tool is blocked
unless the caller supplies `--confirm`:

```bash
cuebook call place_paper_order --file order.json --confirm
```

This confirmation is an additional client-side guard, not an authorization
boundary. Cuebook's remote MCP server still validates OAuth scopes, account
state, idempotency, limits, and tool-specific rules.

Cuebook paper trading uses simulated portfolios and virtual funds. The CLI
does not place real trades, transfer money, access exchange accounts, or ask
for exchange or wallet credentials.

## OAuth and local credentials

- Authorization uses OAuth 2.1, PKCE, and a loopback callback.
- Dynamic client registration identifies the connection as `Cuebook CLI`.
- Credentials are stored in an owner-only local file (`0600` on Unix-like
  systems).
- Override the directory with `CUEBOOK_CONFIG_DIR`.
- For managed automation, supply a short-lived bearer token through
  `CUEBOOK_ACCESS_TOKEN`; it is never written to disk by the CLI.

The CLI counts as one connected Agent in Cuebook. `cuebook auth logout`
removes local tokens. To remove the Cuebook-side connection and release its
Agent slot, run `cuebook connections` and disconnect it in Cuebook.

## Configuration

| Variable | Purpose |
| --- | --- |
| `CUEBOOK_MCP_URL` | Override the remote MCP endpoint |
| `CUEBOOK_ACCESS_TOKEN` | Use an externally managed bearer token |
| `CUEBOOK_CONFIG_DIR` | Override the local credential directory |
| `CUEBOOK_DEBUG=1` | Print stack traces for CLI errors |

The default endpoint is `https://cuebook.xyz/mcp`.

## Diagnostics

```bash
cuebook doctor
```

`doctor` checks protected-resource discovery, authorization-server metadata,
local credentials, and an authenticated MCP handshake. It never prints OAuth
tokens.

## Development

```bash
npm ci
npm run check
```

The quality gate runs formatting/lint checks, TypeScript checks, tests, the
production build, and an npm package dry run. CI covers Node.js 20, 22, and 24.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and
[SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License and service terms

The CLI source is available under the [MIT License](LICENSE). Use of Cuebook's
hosted service and data remains subject to Cuebook's applicable product terms
and data rights.

Cuebook provides market information and simulated tools, not investment
advice. Nothing returned by this CLI is a recommendation to trade.
