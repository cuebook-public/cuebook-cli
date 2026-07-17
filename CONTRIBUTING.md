# Contributing

Thanks for helping improve Cuebook CLI.

1. Open an issue for user-facing behavior or protocol changes.
2. Fork the repository and create a focused branch.
3. Run `npm ci` and `npm run check` before opening a pull request.
4. Do not commit OAuth tokens, user data, mutable market snapshots, or generated
   research output.

Changes that add a write-capable command must fail closed and require explicit
user confirmation. The remote Cuebook MCP server remains the source of truth
for authorization and tool schemas.
