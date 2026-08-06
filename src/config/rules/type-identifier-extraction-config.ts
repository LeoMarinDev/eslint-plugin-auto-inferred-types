/**
 * Pattern used to split a type-text string into candidate tokens.
 *
 * Strips TypeScript punctuation: angle brackets, square brackets, pipe,
 * ampersand, braces, parentheses, commas, semicolons, colons, equals,
 * dots, and whitespace.
 */
export const TOKEN_SPLIT_PATTERN: RegExp = /[<>[\]|&{}(),;:=.\s]+/;

/**
 * Pattern that a valid identifier token must match: an ASCII letter,
 * underscore, or dollar sign followed by any number of alphanumeric,
 * underscore, or dollar-sign characters.
 */
export const IDENTIFIER_PATTERN: RegExp = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
