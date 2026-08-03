import type {
	TypedefMessageIds,
	TypedefRuleContext,
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESLint,
} from "@typescript-eslint/utils";

/**
 * Bundles the ESLint rule context together with the resolved rule options
 * into a single `TypedefRuleContext` object that visitors and helpers
 * receive in place of module-scope mutable state.
 *
 * @param {object} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>} params.context - The ESLint rule context.
 * @param {TypedefRuleOptions} params.options - The resolved rule options.
 * @returns {TypedefRuleContext} The bundled rule context.
 */
function createTypedefRuleContext(
	params: {
		context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>;
		options: TypedefRuleOptions;
	},
): TypedefRuleContext {
	const {
		context,
		options,
	} = params;

	const ruleContext: TypedefRuleContext = {
		context,
		options,
	};

	return ruleContext;
}

export {
	createTypedefRuleContext,
};
