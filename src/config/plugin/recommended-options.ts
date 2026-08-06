import type {
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";

/**
 * Rule severity applied to every entry in the `recommended` config.
 *
 * Kept as a literal type: `RULE_CONFIG_TYPEDEF` composes `[RULE_LEVEL_ERROR, options]`,
 * so widening to plain `string` would break the rule-config tuple. The `as const`
 * assertion is explicit, and the plugin's typedef rule skips `as const` bindings.
 */
export const RULE_LEVEL_ERROR = "error" as const;

/**
 * Fully qualified rule config key for the `typedef` rule under the
 * plugin namespace, as referenced in the `recommended` config.
 */
export const RULE_CONFIG_TYPEDEF: string = "auto-inferred-types/typedef";

/**
 * Option set applied to the `typedef` rule in the `recommended` config.
 *
 * Each flag toggles typedef enforcement for a specific syntactic
 * position. The values here represent the intended behavior of the
 * plugin's recommended preset.
 */
export const RECOMMENDED_OPTIONS: TypedefRuleOptions = {
	arrayDestructuring: true,
	arrowParameter: false,
	memberVariableDeclaration: true,
	objectDestructuring: true,
	parameter: true,
	propertyDeclaration: true,
	variableDeclaration: true,
	variableDeclarationIgnoreFunction: false,
	debug: false,
};
