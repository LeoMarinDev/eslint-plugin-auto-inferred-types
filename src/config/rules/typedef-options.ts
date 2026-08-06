import type {
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";

/**
 * Mapping from the PascalCase option key used internally to the
 * camelCase option key exposed in the rule schema and user config.
 *
 * The PascalCase keys are used to build the JSON schema and to index
 * `DEFAULT_OPTIONS`; the camelCase values are what users write in their
 * ESLint config.
 *
 * The `as const` object is deliberately left unannotated: the literal
 * property keys drive the computed property names in the rule schema and a
 * widened annotation would break that. The `as const` assertion is explicit,
 * so the plugin's typedef rule skips it.
 */
export const OPTION_KEYS = {
	ArrayDestructuring: "arrayDestructuring",
	ArrowParameter: "arrowParameter",
	MemberVariableDeclaration: "memberVariableDeclaration",
	ObjectDestructuring: "objectDestructuring",
	Parameter: "parameter",
	PropertyDeclaration: "propertyDeclaration",
	VariableDeclaration: "variableDeclaration",
	VariableDeclarationIgnoreFunction: "variableDeclarationIgnoreFunction",
	Debug: "debug",
} as const;

/**
 * Default options for the `typedef` rule.
 *
 * All flags default to `false` so the rule is opt-in per syntactic
 * position. The `recommended` config overrides the relevant flags to
 * `true`.
 */
export const DEFAULT_OPTIONS: TypedefRuleOptions = {
	arrayDestructuring: false,
	arrowParameter: false,
	memberVariableDeclaration: false,
	objectDestructuring: false,
	parameter: false,
	propertyDeclaration: false,
	variableDeclaration: false,
	variableDeclarationIgnoreFunction: false,
	debug: false,
};
