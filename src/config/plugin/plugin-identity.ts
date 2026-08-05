import {
	readFileSync,
} from "node:fs";

/**
 * Shape of the `package.json` fields consumed by this module.
 *
 * Declared locally because the parsed artifact never leaves this module;
 * only `version` is surfaced through `PLUGIN_VERSION`.
 */
interface PackageJson {
	name: string;
	version: string;
}

/**
 * Location of `package.json` relative to this module at runtime.
 *
 * tsup bundles this module into `dist/index.js`, so the path is relative to
 * the built artifact (one directory above `dist/`), not to the source
 * location under `src/config/plugin/`.
 */
const PACKAGE_JSON_RELATIVE_PATH = "../package.json";

const packageJsonRaw: string = readFileSync(
	new URL(PACKAGE_JSON_RELATIVE_PATH, import.meta.url),
	"utf8",
);

const packageJson: PackageJson = JSON.parse(packageJsonRaw) as PackageJson;

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
 * Derived from the `version` field of `package.json` at module load, so the
 * plugin metadata never drifts from the npm package version.
 */
export const PLUGIN_VERSION: string = packageJson.version;

/**
 * Namespace under which the plugin is registered in the consuming
 * ESLint config (the key used in `plugins: { [namespace]: plugin }`).
 *
 * Also prefixes every rule config key in the `recommended` config
 * (e.g. `auto-inferred-types/typedef`).
 */
export const PLUGIN_NAMESPACE = "auto-inferred-types";
