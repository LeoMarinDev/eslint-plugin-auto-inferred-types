import {
	PLUGIN_NAME,
	PLUGIN_NAMESPACE,
	PLUGIN_VERSION,
} from "@config/plugin/plugin-identity";
import {
	RECOMMENDED_OPTIONS,
	RULE_CONFIG_TYPEDEF,
	RULE_LEVEL_ERROR,
} from "@config/plugin/recommended-options";

import {
	typedefRule,
} from "@rules/typedef";

import type {
	AutoInferredTypesPlugin,
} from "@types-internal/plugin/plugin-types";

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

plugin.configs["flat/recommended"] = plugin.configs.recommended;

const {
	rules,
	configs,
}: AutoInferredTypesPlugin = plugin;

export {
	configs,
	rules,
};

export default plugin;
