export type DomainErrorCode = "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode = "VALIDATION",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
