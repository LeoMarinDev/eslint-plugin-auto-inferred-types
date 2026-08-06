/**
 * ESLint `meta.type` value for the `typedef` rule.
 *
 * The `as const` assertion narrows the binding to the literal type
 * `"suggestion"` so it satisfies the `meta.type` field requirement of
 * `@typescript-eslint/utils` (which accepts `"problem" | "suggestion" | "layout"`).
 *
 * Kept as a literal: `meta.type` must be one of those three literal strings.
 * The `as const` assertion is an explicit type, so the plugin's typedef rule
 * correctly skips it (an inferred/widened annotation would contradict it).
 */
export const RULE_TYPE_SUGGESTION = "suggestion" as const;

/**
 * ESLint `meta.fixable` value for the `typedef` rule.
 *
 * The `as const` assertion narrows the binding to the literal type
 * `"code"` so it satisfies the `meta.fixable` field requirement of
 * `@typescript-eslint/utils` (which accepts `"code" | "whitespace"`).
 *
 * Kept as a literal for the same reason as `RULE_TYPE_SUGGESTION`: the `as const`
 * assertion is explicit, and the plugin's typedef rule skips `as const` bindings.
 */
export const RULE_FIXABLE_CODE = "code" as const;

/**
 * Separator inserted between an identifier and its inferred type text
 * when building autofix annotations (e.g. `name: string`).
 */
export const ANNOTATION_SEPARATOR: string = ": ";
