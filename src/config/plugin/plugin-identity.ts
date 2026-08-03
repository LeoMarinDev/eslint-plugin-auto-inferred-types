/**
 * Published name of the ESLint plugin package.
 *
 * Matches the `name` field in `package.json` and is used as the
 * `meta.name` of the plugin object exposed by `src/index.ts`.
 */
export const PLUGIN_NAME = "eslint-plugin-auto-inferred-types";

/**
 * Published version of the ESLint plugin package.
 *
 * Mirrors the `version` field in `package.json` and is surfaced as
 * `meta.version` on the plugin object.
 */
export const PLUGIN_VERSION = "0.1.0";

/**
 * Namespace under which the plugin is registered in the consuming
 * ESLint config (the key used in `plugins: { [namespace]: plugin }`).
 *
 * Also prefixes every rule config key in the `recommended` config
 * (e.g. `auto-inferred-types/typedef`).
 */
export const PLUGIN_NAMESPACE = "auto-inferred-types";
