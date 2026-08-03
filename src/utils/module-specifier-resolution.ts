import type {
	ResolveLocalAliasSpecifierParams,
	ResolveModuleSpecifierParams,
	StripPrefixParams,
} from "@types-internal/utils/type-imports-types";
import type ts from "typescript";

/**
 * Path segment marking the boundary of a `node_modules` dependency tree.
 */
const NODE_MODULES_SEGMENT = "node_modules";

/**
 * Sub-path marking TypeScript built-in declaration files.
 */
const TYPESCRIPT_LIB_SUBPATH = "node_modules/typescript/lib/";

/**
 * Sub-path marking the DefinitelyTyped React declarations.
 */
const TYPES_REACT_SUBPATH = "node_modules/@types/react/";

/**
 * File extension pattern for stripping `.ts`, `.tsx`, and `.d.ts` suffixes
 * when converting a file path to a module specifier.
 */
const EXTENSION_PATTERN = /\.(ts|tsx|d\.ts)$/;

/**
 * Leading `./` prefix pattern, stripped from path targets before matching.
 */
const LEADING_DOT_SLASH_PATTERN = /^\.\//;

/**
 * Trailing `*` pattern, stripped from alias and target patterns before
 * length comparison.
 */
const TRAILING_STAR_PATTERN = /\*$/;

/**
 * Backslash pattern for normalizing Windows-style path separators.
 */
const BACKSLASH_PATTERN = /\\/g;

/**
 * `src/` prefix checked as a final fallback when mapping local files
 * to `@`-prefixed aliases.
 */
const SRC_PREFIX = "src/";

/**
 * Index offset from `node_modules` to the scope-or-package segment.
 */
const NM_SCOPE_OFFSET = 1;

/**
 * Index offset from `node_modules` to the package-name segment under a
 * scoped package (e.g. `@scope/name`).
 */
const NM_SCOPED_NAME_OFFSET = 2;

/**
 * Resolve a declaration file path to a module specifier suitable for an
 * `import type` statement.
 *
 * - **Local files** are matched against `tsconfig.json` `paths` patterns,
 *   producing aliases like `@/payload-types`, `@types/foo`, etc.
 * - **node_modules** are resolved to their package name (handles scoped
 *   packages like `@scope/name`).
 * - **@types/react** and **typescript/lib** are intentionally skipped —
 *   `qualifyKnownGlobalType` prefixes React types with `React.` so they
 *   don't need importing, and TS built-in types are global.
 *
 * Uses `compilerOptions.baseUrl` (not `process.cwd()`) for path alias
 * matching, falling back to `cwd` when `baseUrl` is unset. Path entries
 * are sorted by `targetPattern.length` descending so that catch-all
 * aliases (`@/*` -> `./*`) are checked after specific aliases.
 *
 * @param {ResolveModuleSpecifierParams} params - The parameters object.
 * @param {string} params.declFilePath - The declaration file path to resolve.
 * @param {ts.CompilerOptions} params.compilerOptions - The TypeScript compiler options.
 * @returns {string | undefined} The module specifier, or `undefined` when the path should not be imported.
 */
function resolveModuleSpecifier(
	params: ResolveModuleSpecifierParams,
): string | undefined {
	const {
		declFilePath,
		compilerOptions,
	}: ResolveModuleSpecifierParams = params;

	const normalized: string = declFilePath.replace(BACKSLASH_PATTERN, "/");

	if (
		normalized.includes(`${NODE_MODULES_SEGMENT  }/`)
	) {
		const nodeModuleSpecifier: string | undefined = resolveNodeModuleSpecifier(
			normalized,
		);
		return nodeModuleSpecifier;
	}

	const aliasSpecifier: string | undefined = resolveLocalAliasSpecifier({
		normalized,
		compilerOptions,
	});
	if (
		aliasSpecifier !== undefined
	) {
		return aliasSpecifier;
	}

	const fallbackSpecifier: string | undefined = resolveCwdFallbackSpecifier(
		normalized,
	);

	return fallbackSpecifier;
}

/**
 * Resolve a `node_modules` file path to its package name, or `undefined`
 * when the path is inside `@types/react/` or `typescript/lib/`.
 *
 * @param {string} normalized - The forward-slash-normalized file path.
 * @returns {string | undefined} The package name, or `undefined` when the path is skipped.
 */
function resolveNodeModuleSpecifier(
	normalized: string,
): string | undefined {
	if (
		normalized.includes(TYPES_REACT_SUBPATH)
		|| normalized.includes(TYPESCRIPT_LIB_SUBPATH)
	) {
		const skipped = undefined;
		return skipped;
	}

	const parts: string[] = normalized.split("/");
	const nmIdx: number = parts.indexOf(NODE_MODULES_SEGMENT);
	const scopeIdx: number = nmIdx + NM_SCOPE_OFFSET;

	if (
		scopeIdx >= parts.length
	) {
		const noPackage = undefined;
		return noPackage;
	}

	const scopeOrPkg: string = parts[scopeIdx];

	if (
		scopeOrPkg.startsWith("@")
	) {
		const scopedNameIdx: number = nmIdx + NM_SCOPED_NAME_OFFSET;
		if (
			scopedNameIdx >= parts.length
		) {
			const incompleteScoped = undefined;
			return incompleteScoped;
		}
		const scopedName: string = parts[scopedNameIdx];
		const scopedSpecifier = `${scopeOrPkg}/${scopedName}`;
		return scopedSpecifier;
	}

	return scopeOrPkg;
}

/**
 * Resolve a local (non-`node_modules`) file path to a `tsconfig.json`
 * `paths` alias specifier.
 *
 * @param {ResolveLocalAliasSpecifierParams} params - The parameters object.
 * @param {string} params.normalized - The forward-slash-normalized file path.
 * @param {ts.CompilerOptions} params.compilerOptions - The TypeScript compiler options.
 * @returns {string | undefined} The alias specifier, or `undefined` when no alias matches.
 */
function resolveLocalAliasSpecifier(
	params: ResolveLocalAliasSpecifierParams,
): string | undefined {
	const {
		normalized,
		compilerOptions,
	}: ResolveLocalAliasSpecifierParams = params;

	const baseUrl: string = resolveBaseUrl(
		compilerOptions,
	);
	const relativeToBase: string = stripPrefix({
		path: normalized,
		prefix: baseUrl,
	});

	const paths: Record<string, string[]> | undefined = compilerOptions.paths;
	if (
		paths === undefined
	) {
		const noPaths = undefined;
		return noPaths;
	}

	const pathEntries: PathEntry[] = buildSortedPathEntries(
		paths,
	);

	for (
		let entryIndex = 0;
		entryIndex < pathEntries.length;
		entryIndex++
	) {
		const entry: PathEntry = pathEntries[entryIndex];
		if (
			relativeToBase.startsWith(entry.targetPattern)
		) {
			const suffix: string = relativeToBase
				.slice(entry.targetPattern.length)
				.replace(EXTENSION_PATTERN, "");
			const specifier: string = entry.aliasPattern + suffix;
			return specifier;
		}
	}

	const noMatch = undefined;
	return noMatch;
}

/**
 * Final fallback when no `paths` alias matched: if the file lives under
 * `src/` relative to `process.cwd()`, map it to an `@`-prefixed alias.
 *
 * @param {string} normalized - The forward-slash-normalized file path.
 * @returns {string | undefined} The `@`-prefixed specifier, or `undefined` when not under `src/`.
 */
function resolveCwdFallbackSpecifier(
	normalized: string,
): string | undefined {
	const cwd: string = process.cwd().replace(BACKSLASH_PATTERN, "/");
	const relativeToCwd: string = stripPrefix({
		path: normalized,
		prefix: cwd,
	});

	if (
		relativeToCwd.startsWith(SRC_PREFIX)
	) {
		const suffix: string = relativeToCwd
			.slice(SRC_PREFIX.length)
			.replace(EXTENSION_PATTERN, "");
		const specifier = `@${suffix}`;
		return specifier;
	}

	const noMatch = undefined;
	return noMatch;
}

/**
 * Resolve the `baseUrl` from compiler options, falling back to
 * `process.cwd()` when unset.
 *
 * @param {ts.CompilerOptions} compilerOptions - The TypeScript compiler options.
 * @returns {string} The forward-slash-normalized base URL.
 */
function resolveBaseUrl(
	compilerOptions: ts.CompilerOptions,
): string {
	const rawBaseUrl: string | undefined = compilerOptions.baseUrl;
	const baseUrl: string = rawBaseUrl ?? process.cwd();
	const normalized: string = baseUrl.replace(BACKSLASH_PATTERN, "/");

	return normalized;
}

/**
 * Strip a directory prefix from a path, returning the relative remainder.
 *
 * @param {StripPrefixParams} params - The parameters object.
 * @param {string} params.path - The full path.
 * @param {string} params.prefix - The directory prefix to strip.
 * @returns {string} The path relative to the prefix, or the original path when it does not start with the prefix.
 */
function stripPrefix(
	params: StripPrefixParams,
): string {
	const {
		path,
		prefix,
	}: StripPrefixParams = params;

	const withSlash = `${prefix  }/`;
	if (
		path.startsWith(withSlash)
	) {
		const stripped: string = path.slice(withSlash.length);
		return stripped;
	}

	return path;
}

/**
 * Build a list of path entries from the `paths` mapping, sorted by
 * `targetPattern.length` descending so that specific aliases are checked
 * before catch-all aliases.
 *
 * @param {Record<string, string[]>} paths - The `paths` mapping from `tsconfig.json`.
 * @returns {PathEntry[]} The sorted path entries.
 */
function buildSortedPathEntries(
	paths: Record<string, string[]>,
): PathEntry[] {
	const entries: PathEntry[] = [];
	const rawEntries: Array<[string, string[]]> = Object.entries(paths);

	for (
		let entryIndex = 0;
		entryIndex < rawEntries.length;
		entryIndex++
	) {
		const [
			alias,
			targets,
		]: [string, string[]
] = rawEntries[entryIndex];
		const aliasPattern: string = alias.replace(TRAILING_STAR_PATTERN, "");
		const firstTarget: string = targets[0] ?? "";
		const targetPattern: string = firstTarget
			.replace(LEADING_DOT_SLASH_PATTERN, "")
			.replace(TRAILING_STAR_PATTERN, "");

		const entry: PathEntry = {
			aliasPattern,
			targetPattern,
		};
		entries.push(entry);
	}

	const sorted: PathEntry[] = entries.sort(
		comparePathEntriesByTargetLength,
	);

	return sorted;
}

/**
 * Comparator that sorts path entries by `targetPattern.length` descending
 * so that specific aliases are checked before catch-all aliases.
 *
 * `Array.sort` requires a two-argument comparator by API contract; the
 * `max-params` limit of 1 is intentionally waived for this function.
 *
 * @param {PathEntry} a - The first entry.
 * @param {PathEntry} b - The second entry.
 * @returns {number} Negative when `b` is longer, positive when `a` is longer.
 */
// eslint-disable-next-line max-params -- Array.sort comparator requires two arguments
function comparePathEntriesByTargetLength(
	a: PathEntry,
	b: PathEntry,
): number {
	const lengthDiff: number = b.targetPattern.length - a.targetPattern.length;
	return lengthDiff;
}

/**
 * Internal shape of a single `paths` entry after stripping wildcards.
 */
interface PathEntry {
	aliasPattern: string;
	targetPattern: string;
}

export {
	resolveModuleSpecifier,
};
