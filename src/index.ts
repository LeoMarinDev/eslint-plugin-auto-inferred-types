import {
	typedefRule,
} from "@rules/typedef";

import type {
	AutoInferredTypesPlugin,
} from "@types-internal/plugin/plugin-types";
import type {
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";

const PLUGIN_NAME = "eslint-plugin-auto-inferred-types";
const PLUGIN_VERSION = "0.1.0";
const PLUGIN_NAMESPACE = "auto-inferred-types";
const RULE_LEVEL_ERROR = "error";
const RULE_CONFIG_TYPEDEF = "auto-inferred-types/typedef";

const RECOMMENDED_OPTIONS: TypedefRuleOptions = {
	arrayDestructuring: true,
	arrowParameter: false,
	memberVariableDeclaration: true,
	objectDestructuring: true,
	parameter: true,
	propertyDeclaration: true,
	variableDeclaration: true,
	variableDeclarationIgnoreFunction: false,
};

const plugin: AutoInferredTypesPlugin = {
	meta: {
		name: PLUGIN_NAME,
		version: PLUGIN_VERSION,
		namespace: PLUGIN_NAMESPACE,
	},
	configs: {},
	rules: {
		typedef: typedefRule,
	},
};

plugin.configs.recommended = {
	plugins: {
		[PLUGIN_NAMESPACE]: plugin,
	},
	rules: {
		[RULE_CONFIG_TYPEDEF]: [
			RULE_LEVEL_ERROR,
			RECOMMENDED_OPTIONS,
		],
	},
};

const rules = plugin.rules;
const configs = plugin.configs;

export {
	configs,
	rules,
};

export default plugin;
