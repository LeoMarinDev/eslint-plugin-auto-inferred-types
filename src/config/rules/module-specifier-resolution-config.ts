/**
 * Path segment marking the boundary of a `node_modules` dependency tree.
 */
export const NODE_MODULES_SEGMENT: string = "node_modules";

/**
 * Sub-path marking TypeScript built-in declaration files.
 */
export const TYPESCRIPT_LIB_SUBPATH: string = "node_modules/typescript/lib/";

/**
 * Sub-path marking the DefinitelyTyped React declarations.
 */
export const TYPES_REACT_SUBPATH: string = "node_modules/@types/react/";

/**
 * File extension pattern for stripping `.ts`, `.tsx`, and `.d.ts` suffixes
 * when converting a file path to a module specifier.
 */
export const EXTENSION_PATTERN: RegExp = /\.(ts|tsx|d\.ts)$/;

/**
 * Leading `./` prefix pattern, stripped from path targets before matching.
 */
export const LEADING_DOT_SLASH_PATTERN: RegExp = /^\.\//;

/**
 * Trailing `*` pattern, stripped from alias and target patterns before
 * length comparison.
 */
export const TRAILING_STAR_PATTERN: RegExp = /\*$/;

/**
 * Backslash pattern for normalizing Windows-style path separators.
 */
export const BACKSLASH_PATTERN: RegExp = /\\/g;

/**
 * `src/` prefix checked as a final fallback when mapping local files
 * to `@`-prefixed aliases.
 */
export const SRC_PREFIX: string = "src/";

/**
 * Index offset from `node_modules` to the scope-or-package segment.
 */
export const NM_SCOPE_OFFSET: number = 1;

/**
 * Index offset from `node_modules` to the package-name segment under a
 * scoped package (e.g. `@scope/name`).
 */
export const NM_SCOPED_NAME_OFFSET: number = 2;
