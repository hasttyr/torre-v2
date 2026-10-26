/**
 * Expected outcomes are values, not exceptions (CONVENTIONS.md §2): a domain function returns
 * `Result<T, DomainError>`; throwing is reserved for programming errors.
 */
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * An expected domain failure with a stable machine-readable code (`UPPER_SNAKE_CASE`, CONVENTIONS.md §6)
 * and structured details. The API maps it to `application/problem+json`; the UI translates the code.
 */
export class DomainError<C extends string = string> {
  constructor(
    readonly code: C,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {}
}
