import type {
	TypedefMessageIds,
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESLint,
} from "@typescript-eslint/utils";

/**
 * Metadata identifying the ESLint plugin package.
 *
 * ESLint v10 plugins expose a `meta` object with `name`, `version`, and an
 * optional `namespace`. This plugin requires all three so the plugin can be
 * referenced deterministically in flat configs as
 * `auto-inferred-types/typedef`.
 */
export interface PluginMeta {
	name: string;
	version: string;
	namespace: string;
}

/**
 * Minimal flat-config shape this plugin's `configs` entries expose.
 *
 * Defined locally rather than imported from `eslint` so the plugin's type
 * surface stays decoupled from ESLint's internal type revisions. The
 * `plugins` map values are intentionally `unknown` because consumer
 * plugins can be any shape; `rules` values are likewise `unknown` since
 * rule entries in a flat config carry severity plus options as a tuple
 * whose precise shape varies per rule.
 */
export interface FlatConfig {
	name?: string;
	plugins?: Record<string, unknown>;
	rules?: Record<string, unknown>;
	languageOptions?: {
		parser?: unknown;
		parserOptions?: Record<string, unknown>;
	};
}

/**
 * Shape of the `eslint-plugin-auto-inferred-types` plugin object.
 *
 * `configs` maps a config name (e.g. `recommended`) to a `FlatConfig`
 * entry. `rules` maps a rule name (currently only `typedef`) to its
 * `TSESLint.RuleModule` typed with this plugin's message IDs and options.
 */
export interface AutoInferredTypesPlugin {
	meta: PluginMeta;
	configs: Record<string, FlatConfig>;
	rules: Record<string, TSESLint.RuleModule<TypedefMessageIds, [TypedefRuleOptions]>>;
}
