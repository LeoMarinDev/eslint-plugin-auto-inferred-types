import {
	IDENTIFIER_PATTERN,
	TOKEN_SPLIT_PATTERN,
} from "@config/rules/type-identifier-extraction-config";
import {
	GLOBAL_TYPE_NAMES,
	PRIMITIVE_TYPE_NAMES,
} from "@config/rules/type-imports-constants";

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
		let tokenIndex: number = 0;
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
		const isEmpty: boolean = false;
		return isEmpty;
	}

	if (
		IDENTIFIER_PATTERN.test(token) === false
	) {
		const notIdentifier: boolean = false;
		return notIdentifier;
	}

	if (
		PRIMITIVE_TYPE_NAMES.has(token)
	) {
		const isPrimitive: boolean = false;
		return isPrimitive;
	}

	if (
		GLOBAL_TYPE_NAMES.has(token)
	) {
		const isGlobal: boolean = false;
		return isGlobal;
	}

	const isValid: boolean = true;
	return isValid;
}

export {
	extractTypeIdentifiers,
};
