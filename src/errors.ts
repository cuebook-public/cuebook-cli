export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
    readonly hint?: string,
  ) {
    super(message)
    this.name = "CliError"
  }
}

export class AuthRequiredError extends CliError {
  constructor() {
    super("Cuebook authorization is required.", 2, "Run: cuebook auth login")
    this.name = "AuthRequiredError"
  }
}
