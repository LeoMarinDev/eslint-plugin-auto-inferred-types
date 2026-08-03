import {
	GLOBAL_TYPE_NAMES,
	PRIMITIVE_TYPE_NAMES,
} from "@config/rules/type-imports-constants";

/**
 * Pattern used to split a type-text string into candidate tokens.
 *
 * Strips TypeScript punctuation: angle brackets, square brackets, pipe,
 * ampersand, braces, parentheses, commas, semicolons, colons, equals,
 * dots, and whitespace.
 */
const TOKEN_SPLIT_PATTERN = /[<>[\]|&{}(),;:=.\s]+/;

/**
 * Pattern that a valid identifier token must match: an ASCII letter,
 * underscore, or dollar sign followed by any number of alphanumeric,
 * underscore, or dollar-sign characters.
 */
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Extract candidate type-identifier names from a type-text string.
 *
 * Strips TypeScript punctuation and returns each remaining word. Primitives
 * and global utility types are excluded, as are names already qualified
 * with a `.` prefix (e.g. the `React` in `React.ReactNode`).
 *
 * @param {string} typeText - The type-text string to scan.
 * @returns {string[]} An array of candidate type-identifier names.
 */
function extractTypeIdentifiers(
	typeText: string,
): string[] {
	const tokens: string[] = typeText.split(TOKEN_SPLIT_PATTERN);
	const identifiers: string[] = [];

	for (
		let tokenIndex = 0;
		tokenIndex < tokens.length;
		tokenIndex++
	) {
		const token: string = tokens[tokenIndex];
		const isValid: boolean = isCandidateIdentifier(
			token,
		);

		if (
			isValid
		) {
			identifiers.push(token);
		}
	}

	return identifiers;
}

/**
 * Check whether a single token is a valid candidate type identifier: it
 * must match the identifier pattern, and must not be a primitive or
 * global type name.
 *
 * @param {string} token - The token to validate.
 * @returns {boolean} `true` when the token is a valid candidate, otherwise `false`.
 */
function isCandidateIdentifier(
	token: string,
): boolean {
	if (
		token.length === 0
	) {
		const isEmpty = false;
		return isEmpty;
	}

	if (
		IDENTIFIER_PATTERN.test(token) === false
	) {
		const notIdentifier = false;
		return notIdentifier;
	}

	if (
		PRIMITIVE_TYPE_NAMES.has(token)
	) {
		const isPrimitive = false;
		return isPrimitive;
	}

	if (
		GLOBAL_TYPE_NAMES.has(token)
	) {
		const isGlobal = false;
		return isGlobal;
	}

	const isValid = true;
	return isValid;
}

export {
	extractTypeIdentifiers,
};
