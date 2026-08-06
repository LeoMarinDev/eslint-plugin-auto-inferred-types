import {
	ESLintUtils,
} from "@typescript-eslint/utils";

import {
	RULE_FIXABLE_CODE,
	RULE_TYPE_SUGGESTION,
} from "@config/rules/typedef-meta";
import {
	DEFAULT_OPTIONS,
	OPTION_KEYS,
} from "@config/rules/typedef-options";

import {
	createTypedefRuleContext,
} from "@rules/typedef/typedef-context";
import {
	buildVisitors,
} from "@rules/typedef/visitors";

import type {
	TypedefMessageIds,
	TypedefRuleContext,
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESLint,
} from "@typescript-eslint/utils";

const createRule: ReturnType<typeof ESLintUtils.RuleCreator<unknown>> = ESLintUtils.RuleCreator(
	(name: string): string => `https://github.com/brainy-builds/eslint-plugin-auto-inferred-types/blob/main/docs/${name}.md`,
);

const typedefRule: TSESLint.RuleModule<TypedefMessageIds, [TypedefRuleOptions]> = createRule({
	name: "typedef",
	meta: {
		type: RULE_TYPE_SUGGESTION,
		docs: {
			description: "Require explicit type annotations and autofix them from TypeScript inference.",
		},
		fixable: RULE_FIXABLE_CODE,
		messages: {
			expectedTypedef: "Expected a type annotation.",
			expectedTypedefNamed: "Expected {{ name }} to have a type annotation.",
		},
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					[OPTION_KEYS.ArrayDestructuring]: { type: "boolean" },
					[OPTION_KEYS.ArrowParameter]: { type: "boolean" },
					[OPTION_KEYS.MemberVariableDeclaration]: { type: "boolean" },
					[OPTION_KEYS.ObjectDestructuring]: { type: "boolean" },
					[OPTION_KEYS.Parameter]: { type: "boolean" },
					[OPTION_KEYS.PropertyDeclaration]: { type: "boolean" },
					[OPTION_KEYS.VariableDeclaration]: { type: "boolean" },
					[OPTION_KEYS.VariableDeclarationIgnoreFunction]: { type: "boolean" },
					[OPTION_KEYS.Debug]: { type: "boolean" },
				},
			},
		],
	},
	defaultOptions: [DEFAULT_OPTIONS],
	// eslint-disable-next-line max-params -- create signature is fixed by ESLintUtils.RuleCreator
	create(
		context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>,
		options: readonly [TypedefRuleOptions],
	): TSESLint.RuleListener {
		const ruleContext: TypedefRuleContext = createTypedefRuleContext({
			context,
			options: options[0],
		});

		const visitors: TSESLint.RuleListener = buildVisitors(
			ruleContext,
		);

		return visitors;
	},
});

export {
	typedefRule,
};
