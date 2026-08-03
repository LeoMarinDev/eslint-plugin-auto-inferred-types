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
 * Shape of the `eslint-plugin-auto-inferred-types` plugin object.
 *
 * `configs` and `rules` use `unknown` value types intentionally; later
 * subagents refine them to the concrete `RuleDefinition` and `ConfigObject`
 * types once the rule and config modules are written.
 */
export interface AutoInferredTypesPlugin {
	meta: PluginMeta;
	configs: Record<string, unknown>;
	rules: Record<string, unknown>;
}
