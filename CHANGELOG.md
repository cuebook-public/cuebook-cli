# Changelog

All notable changes to Cuebook CLI will be documented here.

## [Unreleased]

## [0.1.1] - 2026-07-17

### Fixed

- Retry transient network resets during MCP connection setup and idempotent read operations.
- Keep write-capable Tool calls single-attempt, even when a connection resets.

## [0.1.0] - 2026-07-17

### Added

- OAuth 2.1 and PKCE login against Cuebook's remote MCP server.
- Persistent, owner-only local credential storage.
- Live MCP tool discovery and generic JSON tool calls.
- Friendly commands for assets, market state, published Cues, paper portfolio,
  and simulated order previews.
- Fail-closed confirmation for write-capable and unknown tools.
- Connection management and diagnostic commands.
- English and Simplified Chinese documentation.

[Unreleased]: https://github.com/cuebook-public/cuebook-cli/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/cuebook-public/cuebook-cli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cuebook-public/cuebook-cli/releases/tag/v0.1.0
