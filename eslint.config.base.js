/**
 * eslint.config.base.js - Base TypeScript / Node.js / Bun Configuration
 *
 * -- Architectural Role ----------------------------
 * This file is the standalone, backend-safe ESLint config. It enforces every
 * rule from ./.cursor/rules/_code-rules-TypeScript.mdc at the AST level and deliberately contains
 * zero React, JSX, or DOM constructs.
 *
 * It can be used on its own for pure Node.js / Bun TypeScript projects.
 * eslint.config.react.js imports and spreads this file, then appends React 19,
 * browser globals, and Tailwind v4 constraints.
 *
 * -- Named Exports ------------------------------
 * TYPE_SCRIPT_FILES      Glob array targeting all TypeScript source files.
 *                        Includes .tsx so that base TS rules apply to component
 *                        files too. Extension configs add React-specific rules
 *                        on top - they do not need to re-declare the TS rules.
 *
 * BASE_RESTRICTED_SYNTAX Array of no-restricted-syntax selectors. Exported so
 *                        that eslint.config.react.js can spread it alongside
 *                        REACT_RESTRICTED_SYNTAX in a single combined rule, which
 *                        is mandatory because ESLint flat config replaces (not
 *                        merges) the same rule when multiple config objects match
 *                        the same file.
 *
 * -- Required packages ----------------------------
 *   npm i -D @eslint/js typescript-eslint eslint-plugin-import globals
 *
 * -- tsconfig requirements --------------------------
 *   "strict": true, "strictNullChecks": true
 *   Point parserOptions.project to your tsconfig (default: "./tsconfig.json").
 *   For monorepos: replace the string with true (auto-detect per-package).
 *
 * @see ./.cursor/rules/_code-rules-TypeScript.mdc
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import {
	createTypeScriptImportResolver,
} from "eslint-import-resolver-typescript";
import importPlugin from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// - Shared numeric constants -------------------------
// These are referenced by the rule options below and documented here rather than
// as inline literals so that changing a project-wide limit is a one-line edit.
const MAX_COMPLEXITY = 12;
const MAX_DEPTH = 5;
const MAX_FUNCTION_LINES = 100; // ./.cursor/rules/_code-rules-TypeScript.mdc: "Maximum 100 physical lines"
const MAX_PARAMS = 1;           // ./.cursor/rules/_code-rules-TypeScript.mdc: "pass multiple related inputs as a single object"

// - File globs --------------------------------
// .tsx is intentionally included so that all base TypeScript rules (naming
// conventions, import order, strict boolean expressions, etc.) apply to React
// component files. eslint.config.react.js then adds the React-specific layer
// on top without needing to re-state the full TS rule set.
/** @type {readonly string[]} */
export const TYPE_SCRIPT_FILES = Object.freeze([
	"**/*.ts",
	"**/*.tsx",
	"**/*.mts",
	"**/*.cts",
]);

// - Base AST-level restrictions ------------------------
// Exported so that eslint.config.react.js can combine these with
// REACT_RESTRICTED_SYNTAX into one no-restricted-syntax rule for .tsx files.
// Each selector maps to a specific rule in ./.cursor/rules/_code-rules-TypeScript.mdc.
/** @type {readonly import("eslint").Linter.RuleEntry[]} */
export const BASE_RESTRICTED_SYNTAX = Object.freeze([

	// - CommonJS ban -----------------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "ES6 import/export exclusively; no CommonJS"
	{
		selector: "CallExpression[callee.name='require']",
		message:
			"TypeScript Rules: CommonJS require() is forbidden. Use ESM import syntax.",
	},
	{
		selector: "MemberExpression[object.name='module'][property.name='exports']",
		message:
			"TypeScript Rules: CommonJS module.exports is forbidden. Use named ESM exports.",
	},
	{
		selector: "MemberExpression[object.name='exports'][property]",
		message:
			"TypeScript Rules: CommonJS exports.* is forbidden. Use named ESM exports.",
	},

	// - Module-scope function expression ban -----------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always named function or async function declarations
	// at module scope. Never bind the module's main routines as const fn = () => …"
	// Note: callbacks passed as arguments to APIs are NOT covered by these selectors
	// because they are not Program-direct children.
	{
		selector:
			"Program > VariableDeclaration > VariableDeclarator[init.type='ArrowFunctionExpression']",
		message:
			"TypeScript Rules: Module-scope arrow functions are forbidden. Use a named function declaration.",
	},
	{
		selector:
			"Program > VariableDeclaration > VariableDeclarator[init.type='FunctionExpression']",
		message:
			"TypeScript Rules: Module-scope function expressions are forbidden. Use a named function declaration.",
	},

	// - Nested function declaration ban --------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never write a function or async function nested
	// inside another function's body"
	// Arrow/anonymous function expressions passed as callbacks are exempt - only
	// *declarations* (the `function` keyword) are banned when nested.
	{
		selector: "FunctionDeclaration FunctionDeclaration",
		message:
			"TypeScript Rules: Nested function declarations are forbidden. Move the helper to module scope (below its first caller).",
	},
	{
		selector: "FunctionExpression FunctionDeclaration",
		message:
			"TypeScript Rules: Nested function declarations inside function expressions are forbidden. Move to module scope.",
	},
	{
		selector: "ArrowFunctionExpression FunctionDeclaration",
		message:
			"TypeScript Rules: Nested function declarations inside arrow callbacks are forbidden. Move to module scope.",
	},

	// - Loop construct ban --------------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never for…of, for…in as an array walker,
	// or .map/.forEach/.filter for iteration. Use a classical counted for loop."
	{
		selector: "ForOfStatement",
		message:
			"TypeScript Rules: for…of is forbidden. Use a classical counted for loop.",
	},
	{
		selector: "ForInStatement",
		message:
			"TypeScript Rules: for…in is forbidden. Use a classical counted for loop.",
	},
	{
		selector:
			"CallExpression[callee.property.name=/^(map|forEach|filter|reduce|reduceRight|flatMap)$/]",
		message:
			"TypeScript Rules: Array iteration helpers are forbidden for looping. Use a classical for loop.",
	},

	// - Promise chain ban ---------------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always async/await; never .then() or raw callbacks"
	{
		selector:
			"CallExpression[callee.property.name=/^(then|catch|finally)$/]",
		message:
			"TypeScript Rules: Promise chains (.then/.catch/.finally) are forbidden. Use async/await with try/catch.",
	},

	// - Throw pattern enforcement -----------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Every throw throws only a const-bound Error
	// identifier - never throw new Error(…) inline"
	// Two selectors: one catches the inline `new` expression specifically
	// (clearer message), the other catches any non-identifier throw as a fallback.
	{
		selector: "ThrowStatement > NewExpression",
		message:
			"TypeScript Rules: Do not throw new Error(…) inline. Assign to a const first, then throw that identifier.",
	},
	{
		selector: "ThrowStatement[argument.type!='Identifier']",
		message:
			"TypeScript Rules: Throw only a const-bound Error identifier. Never throw a composite expression.",
	},

	// - Return pattern enforcement ----------------------
	// ./.cursor/rules/_code-rules-TypeScript.mdc: "Every return passes exactly one identifier that
	// already holds the outgoing value - never return a composite expression,
	// a call, await, arithmetic, &&/|| stacks, object/array literals, ternaries…"
	// [argument!=null] excludes bare `return;` (void returns) - the AST sets
	// argument to null for void returns, not undefined, so this check is precise.
	{
		selector:
			"ReturnStatement[argument!=null][argument.type!='Identifier']",
		message:
			"TypeScript Rules: Return only an identifier. Assign calls, await expressions, literals, and composite expressions to a named binding first.",
	},

]);

// ---------------------------------------
// ESLint v10 Flat Config export
// ---------------------------------------
/** @type {import("eslint").Linter.Config[]} */
const config = [

	// - Global ignores ----------------------------
	// Applied before any other config; these paths are never linted.
	{
		ignores: [
			"**/node_modules/**",
			"**/.next/**",
			"**/dist/**",
			"**/build/**",
			"**/out/**",
			"**/coverage/**",
			"**/.turbo/**",
			"**/.vite/**",
			"**/.cache/**",
			"**/.output/**",
			"**/generated/**",
			// Reference-only vendored ESLint source/docs (not part of this project).
			"_source-eslint/**",
			"_docs-eslint/**",
			"_prompts/**",
			"_tmp/**",
			// Payload database migrations (generated/managed by migrate tooling).
			"src/migrations/**",
			// Payload auto-generated TypeScript types (regenerated by generate:types).
			"src/payload-types.ts",
			"**/*.d.ts",
			// JavaScript sources are outside tsconfig include; lint TypeScript only.
			"**/*.js",
			"**/*.mjs",
			"**/*.cjs",
			// Payload auto-generated import map (regenerated by generate:importmap).
			"**/importMap.js",
			// Config files are linted by their own project tooling, not this config.
			"eslint.config.js",
			"eslint.config.base.js",
			"eslint.config.react.js",
			"eslint.config-vite.js",
			"eslint.config-next.js",
			"eslint.config.strip-inferred-types.js",
			"eslint.config.restore-inferred-types.js",
			"vitest.config.mts",
			"vitest.config.ts",
			"next.config.ts",
			// Build tool config uses tsup-specific APIs; linted by its own tooling.
			"tsup.config.ts",
			// Dedicated ESLint tsconfig; not application source.
			"tsconfig.eslint.json",
			"tsconfig.build.json",
			// Test fixtures are rule test data, not application code.
			"tests/fixtures/**",
			// Payload config imports generated types and is excluded from typedef roundtrip.
			"src/payload.config.ts",
			// Agent/dev CLI scripts are not held to application code rules.
			"scripts/**",
			// PostCSS config uses CommonJS default export by convention - exempt.
			"postcss.config.js",
			"postcss.config.mjs",
		],
	},

	// - @eslint/js recommended ------------------------
	// Provides core JS rules (no-undef, no-unused-vars placeholder, etc.).
	// Many of these are superseded by the TypeScript-aware equivalents below.
	js.configs.recommended,

	// - typescript-eslint type-checked presets ----------------
	// recommendedTypeChecked: strict type-safety rules (no-unsafe-*, await-thenable,
	//   no-floating-promises, etc.) - requires parserOptions.project below.
	// stylisticTypeChecked: stylistic consistency rules that also need type info
	//   (consistent-type-exports, no-unnecessary-type-assertion, etc.).
	// Non-TypeScript sources (.js, .mjs) are excluded via global ignores because
	// they are outside tsconfig include and cannot supply type information.
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,

	// ══════════════════════════════════════════════════════════════════════════
	// PRIMARY TYPESCRIPT CONFIGURATION
	// Applies to all TypeScript source files including .tsx.
	// For .tsx files used in React projects: eslint.config.react.js adds the
	// React-specific layer on top - this config is the shared foundation.
	// ══════════════════════════════════════════════════════════════════════════
	{
		files: [...TYPE_SCRIPT_FILES],

		languageOptions: {
			ecmaVersion: 2024,
			sourceType: "module",

			globals: {
				// Node.js and Bun globals only.
				// Browser globals (window, document, fetch, etc.) are NOT included here -
				// they are added exclusively in eslint.config.react.js.
				// This ensures backend files cannot accidentally reference DOM APIs.
				...globals.es2024,
				...globals.node,
			},

			parser: tseslint.parser,

			parserOptions: {
				// Uses a dedicated tsconfig that includes both src/ and tests/
				// so type-aware rules resolve every linted file. For monorepos
				// with per-package tsconfigs, replace the path string with
				// `project: true` (typescript-eslint auto-detects the nearest tsconfig).
				project: "./tsconfig.eslint.json",
				tsconfigRootDir: __dirname,
				sourceType: "module",
				ecmaVersion: 2024,
			},
		},

		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"import": importPlugin,
		},

		settings: {
			"import-x/resolver-next": [
				createTypeScriptImportResolver({
					alwaysTryTypes: true,
				}),
			],
		},

		rules: {

			// - FORMATTING ---------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Indent with 1 tab (\t) per level"
			"indent": [
				"error",
				"tab",
				{
					SwitchCase: 1,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Double quotes for all string literals"
			"quotes": [
				"error",
				"double",
				{
					avoidEscape: false,
					// Allow template literals when interpolation or escaping requires them.
					allowTemplateLiterals: true,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Terminate every statement with a semicolon"
			"semi": [
				"error",
				"always",
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Multiline array/object/arg-list: trailing
			// comma after last item."
			// KNOWN LIMITATION: formal parameter lists require trailing commas even on
			// a single physical line (e.g. `function foo(bar: Baz,)`), but ESLint's
			// comma-dangle cannot distinguish formal parameters from call-site arguments.
			// "always-multiline" is the closest enforceable option. Single-line formal
			// parameter trailing commas must be enforced by code review or a custom rule.
			"comma-dangle": [
				"error",
				{
					arrays: "always-multiline",
					objects: "always-multiline",
					imports: "always-multiline",
					exports: "always-multiline",
					functions: "always-multiline",
				},
			],

			// Enforce 1tbs brace style; allow single-line blocks for concise cases
			"brace-style": [
				"error",
				"1tbs",
				{
					allowSingleLine: true,
				},
			],

			// JSX attribute quotes: double quotes (applies when .tsx files are linted)
			"jsx-quotes": [
				"error",
				"prefer-double",
			],

			// Enforce consistent newlines in array/object literals
			"array-bracket-newline": [
				"error",
				"consistent",
			],
			"array-element-newline": [
				"error",
				"consistent",
			],
			"object-curly-newline": [
				"error",
				{
					ObjectExpression: {
						multiline: true,
						consistent: true,
					},
					ObjectPattern: {
						multiline: true,
						consistent: true,
					},
					ImportDeclaration: {
						multiline: true,
						consistent: true,
					},
					ExportDeclaration: {
						multiline: true,
						consistent: true,
					},
				},
			],
			"object-property-newline": [
				"error",
				{
					allowAllPropertiesOnSameLine: true,
				},
			],

			// - COMPLEXITY & SIZE LIMITS --------------------
			"complexity": [
				"error",
				{
					max: MAX_COMPLEXITY,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Maximum 100 physical lines per named function"
			// skipBlankLines: false - blank lines count toward the limit per the rule.
			// skipComments: true - JSDoc above the function does NOT count per the rule.
			"max-lines-per-function": [
				"error",
				{
					max: MAX_FUNCTION_LINES,
					skipBlankLines: false,
					skipComments: true,
					IIFEs: true,
				},
			],

			"max-depth": [
				"error",
				MAX_DEPTH,
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always pass multiple related inputs as a
			// single object annotated with an interface or type alias."
			// This forces the single-object-parameter architectural pattern.
			// Callbacks supplied to external APIs naturally receive multiple params
			// from the API - those are the expected exceptions in practice.
			"max-params": [
				"error",
				MAX_PARAMS,
			],

			// - FUNCTION DECLARATIONS ----------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always named function or async function
			// declarations at module scope."
			// "declaration" + allowArrowFunctions: false bans const fn = () => {} at
			// module scope. Callbacks passed as arguments are not function declarations
			// and are unaffected by this rule.
			// NOTE: eslint.config.react.js overrides this rule to allowArrowFunctions: true
			// for .tsx files only, because React hooks (useEffect, useMemo, etc.) create
			// an impossible conflict with no-restricted-syntax's nested function declaration
			// ban inside arrow callbacks. Backend .ts files keep the stricter setting.
			"func-style": [
				"error",
				"declaration",
				{
					allowArrowFunctions: false,
				},
			],

			// Require all function expressions to have names for clearer stack traces.
			// (Named function declarations are already required by func-style.)
			"func-names": [
				"error",
				"always",
			],

			// - VARIABLES ----------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never var"
			"no-var": "error",

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "const by default; let only when reassigned"
			"prefer-const": [
				"error",
				{
					destructuring: "all",
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "One var declaration per statement"
			"one-var": [
				"error",
				"never",
			],

			// - CONDITIONALS --------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always === and !=="
			"eqeqeq": [
				"error",
				"always",
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always {} braces per case body; never fall-through"
			"no-fallthrough": "error",

			// Require braces for all control-flow bodies (if/else/for/while)
			"curly": [
				"error",
				"all",
			],

			// - EXPRESSIONS ---------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: prefer template literals over concatenation
			"prefer-template": "error",

			// Disallow pointless string concatenation ("a" + "b")
			"no-useless-concat": "error",

			// Prefer shorthand object properties ({a} over {a: a})
			"object-shorthand": [
				"error",
				"always",
			],

			// Disable prefer-arrow-callback: the codebase style is named declarations,
			// not arrow-function-everywhere
			"prefer-arrow-callback": "off",

			// Prevent accidental global variable creation
			"no-implicit-globals": "error",

			// - IMPORTS & PATHS -------------------------
			// Disable base rule; @typescript-eslint/no-shadow handles this with types
			"no-duplicate-imports": "off",

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never relative ascending paths (../)"
			// Belt-and-suspenders alongside import/no-relative-parent-imports.
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: [
								"../**",
							],
							message:
								"TypeScript Rules: Relative ascending imports are forbidden. Use an @-prefixed path alias (e.g. @types/…, @config/…, @states/…).",
						},
					],
				},
			],

			// - RESTRICTED SYNTAX (AST-level architectural rules) --------
			// See BASE_RESTRICTED_SYNTAX export above for full per-selector documentation.
			// eslint.config.react.js MUST import and spread BASE_RESTRICTED_SYNTAX when
			// overriding this rule for .tsx files - otherwise base restrictions are lost.
			"no-restricted-syntax": [
				"error",
				...BASE_RESTRICTED_SYNTAX,
			],

			// - BASE RULE DISABLE (replaced by @typescript-eslint equivalents) -
			"no-shadow": "off",
			"no-redeclare": "off",
			"no-use-before-define": "off",
			"no-empty-function": "off",
			"no-magic-numbers": "off",

			// - IMPORT PLUGIN --------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "import type { … } for compile-time-only types"
			"import/consistent-type-specifier-style": [
				"error",
				"prefer-top-level",
			],

			// All imports must precede any executable code
			"import/first": "error",

			// Require exactly one blank line after the import block
			"import/newline-after-import": [
				"error",
				{
					count: 1,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "No CommonJS" (belt-and-suspenders)
			"import/no-amd": "error",
			"import/no-commonjs": "error",

			// Prevent duplicate import declarations for the same module
			"import/no-duplicates": "error",

			// Prevent exporting a let binding (prefer const or explicit reassignment)
			"import/no-mutable-exports": "error",

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never relative ascending paths (../)"
			// Disabled: this rule resolves @-prefixed aliases to their real file paths and then
			// flags cross-directory alias imports as "parent" imports (false positive).
			// The no-restricted-imports rule above already enforces the no-../ constraint by
			// checking the import specifier string directly, which is the correct behavior for
			// alias-based projects.
			"import/no-relative-parent-imports": "off",

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Group imports separated by blank lines;
			// alphabetical within groups."
			//
			// Path group priority (highest → lowest within the internal group):
			//   @types/**         compile-time shapes - declared first as pure metadata
			//   @config/**        behavioral constants - consumed by business logic
			//   @content/**       user-facing static strings
			//   @states/**        pure state transition logic
			//   @classNames/**    Tailwind/styling class strings
			//
			// eslint.config.react.js adds @types-components/** and @config-components/**
			// to this list when overriding this rule for .tsx files.
			"import/order": [
				"error",
				{
					"newlines-between": "always",
					alphabetize: {
						order: "asc",
						caseInsensitive: true,
					},
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
						"object",
						"type",
					],
					pathGroups: [
						{
							pattern: "@types/**",
							group: "internal",
							position: "before",
						},
						{
							pattern: "@config/**",
							group: "internal",
							position: "before",
						},
						{
							pattern: "@content/**",
							group: "internal",
							position: "before",
						},
						{
							pattern: "@states/**",
							group: "internal",
							position: "before",
						},
						{
							pattern: "@classNames/**",
							group: "internal",
							position: "before",
						},
					],
					pathGroupsExcludedImportTypes: [
						"builtin",
					],
				},
			],

			// - @TYPESCRIPT-ESLINT - TYPE & CONSISTENCY RULES ----------
			// Prefer T[] for simple element types, Array<T> for complex generics
			"@typescript-eslint/array-type": [
				"error",
				{
					default: "array-simple",
				},
			],

			// Prevent await on non-Promise / non-Thenable values
			"@typescript-eslint/await-thenable": "error",

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "interface for reusable object shapes; type
			// when interface cannot express the shape"
			"@typescript-eslint/consistent-type-definitions": [
				"error",
				"interface",
			],

			// Require all type-only exports to use export type { … }
			"@typescript-eslint/consistent-type-exports": [
				"error",
				{
					fixMixedExportsWithInlineTypeSpecifier: true,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "import type { … } for compile-time-only types"
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					fixStyle: "separate-type-imports",
					disallowTypeAnnotations: false,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always annotate" - explicit return types on
			// all functions and methods, including expressions and HOFs.
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: false,
					allowHigherOrderFunctions: false,
					allowDirectConstAssertionInArrowFunctions: false,
				},
			],

			// Explicit types on every exported function boundary
			"@typescript-eslint/explicit-module-boundary-types": "error",

			// Prefer property-style method signatures in interfaces (foo: () => void)
			// rather than method-style (foo(): void) for stronger type checking
			"@typescript-eslint/method-signature-style": [
				"error",
				"property",
			],

			// - NAMING CONVENTIONS ------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc:
			//   camelCase   → variables, functions, parameters
			//   UPPER_CASE  → hardcoded config literals assigned to const
			//   PascalCase  → classes, interfaces, type aliases
			//   No I prefix → interfaces (UserAccount not IUserAccount)
			//   snake_case  → only when mirroring external schemas (REST/JSON, DB rows)
			//
			// NOTE: In eslint.config.react.js the "function" selector is overridden to
			// also allow PascalCase, which is required for React component names.
			"@typescript-eslint/naming-convention": [
				"error",
				// Fallback for anything not matched by a more specific selector
				{
					selector: "default",
					format: [
						"camelCase",
					],
					leadingUnderscore: "allow",
					trailingUnderscore: "forbid",
				},
			// Variables may be UPPER_CASE (config literals) or PascalCase
			// (constructor functions, imported class values, enum objects)
			{
				selector: "variable",
				format: [
					"camelCase",
					"UPPER_CASE",
					"PascalCase",
				],
				leadingUnderscore: "allow",
				trailingUnderscore: "forbid",
			},
			// Imports: allow camelCase and PascalCase. PascalCase is needed for
			// default imports of components and constructor functions (e.g. Link
			// from "next/link", Script from "next/script", GoogleGenerativeAI from
			// "@google/generative-ai", motion from "framer-motion").
			{
				selector: "import",
				format: [
					"camelCase",
					"PascalCase",
				],
				leadingUnderscore: "allow",
				trailingUnderscore: "forbid",
			},
				// Parameters: camelCase; leading _ marks intentionally unused
				{
					selector: "parameter",
					format: [
						"camelCase",
					],
					leadingUnderscore: "allow",
					trailingUnderscore: "forbid",
				},
				// Functions: camelCase only in backend.
				// React config overrides this to also allow PascalCase.
				{
					selector: "function",
					format: [
						"camelCase",
					],
					leadingUnderscore: "forbid",
					trailingUnderscore: "forbid",
				},
				// Classes, interfaces, type aliases, enums: PascalCase
				{
					selector: "typeLike",
					format: [
						"PascalCase",
					],
				},
				// Interfaces: PascalCase WITHOUT the I prefix
				{
					selector: "interface",
					format: [
						"PascalCase",
					],
					custom: {
						// Regex matches the forbidden pattern; match: false = ban the pattern
						regex: "^I[A-Z]",
						match: false,
					},
				},
				// Object properties: also allow snake_case for mirroring external schemas
				// (REST/JSON payloads, database rows, vendor SDKs)
				{
					selector: "property",
					format: [
						"camelCase",
						"snake_case",
						"UPPER_CASE",
						"PascalCase",
					],
					leadingUnderscore: "allow",
					trailingUnderscore: "forbid",
				},
				// Enum members: treat as configuration-like constants
				{
					selector: "enumMember",
					format: [
						"UPPER_CASE",
						"PascalCase",
					],
				},
			],

			// - EMPTY FUNCTIONS -------------------------
			// Disallow all empty function bodies; force meaningful implementations
			"@typescript-eslint/no-empty-function": [
				"error",
				{
					allow: [],
				},
			],

			// - NO ANY ------------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never any. Use unknown for values not
			// statically known; narrow immediately with type guards."
			"@typescript-eslint/no-explicit-any": "error",

			// - FLOATING PROMISES ------------------------
			// All Promises must be awaited or explicitly handled
			"@typescript-eslint/no-floating-promises": [
				"error",
				{
					ignoreVoid: false,
					ignoreIIFE: false,
				},
			],

			// - NO MAGIC NUMBERS -------------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Never use a bare numeric literal directly
			// in an expression. Assign to a named UPPER_CASE const first."
			// Allowed exceptions:
			//   [-1, 0, 1]  - bookkeeping sentinels and obvious increments/decrements
			//   array indexes - for (let i = 0; i < arr.length; i++) arr[i] …
			//   default values, enum members, type index signatures
			"@typescript-eslint/no-magic-numbers": [
				"error",
				{
					ignore: [
						-1,
						0,
						1,
					],
					ignoreArrayIndexes: true,
					ignoreDefaultValues: true,
					enforceConst: true,
					detectObjects: false,
					ignoreEnums: true,
					ignoreNumericLiteralTypes: true,
					ignoreReadonlyClassProperties: true,
					ignoreTypeIndexes: true,
				},
			],

			// Prevent Promises from being used in boolean conditions or spreads
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksConditionals: true,
					checksSpreads: true,
					checksVoidReturn: true,
				},
			],

			// Use the TypeScript-aware redeclare rule (base rule is disabled above)
			"@typescript-eslint/no-redeclare": "error",

			// Use the TypeScript-aware shadow rule (base rule is disabled above)
			"@typescript-eslint/no-shadow": "error",

			// Prevent conditions that TypeScript can statically prove are always true/false
			"@typescript-eslint/no-unnecessary-condition": "error",

			// Unsafe operations on unknown/any-typed values
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",

			// - UNUSED VARS ---------------------------
			// Leading _ pattern marks intentionally unused parameters and variables
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],

			// Prevent referencing variables/types before their declaration.
			// functions: false - hoisting of named function declarations is allowed
			// and is explicitly part of the file-ordering convention.
			"@typescript-eslint/no-use-before-define": [
				"error",
				{
					functions: false,
					classes: true,
					variables: true,
					typedefs: true,
				},
			],

			// Ban wrapper object types (String, Number, Boolean) - use primitives
			"@typescript-eslint/no-wrapper-object-types": "error",

			// We ban for-of via no-restricted-syntax; disable the TS prefer-for-of suggestion
			"@typescript-eslint/prefer-for-of": "off",

			// All async functions must return Promises (not void or synchronous values)
			"@typescript-eslint/promise-function-async": "error",

			// Async functions must contain at least one await expression
			"@typescript-eslint/require-await": "error",

			// Always return await inside async functions so that errors are caught in
			// the same try/catch block rather than propagating as unhandled rejections
			"@typescript-eslint/return-await": [
				"error",
				"always",
			],

			// - STRICT BOOLEAN EXPRESSIONS --------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always enable strict null checks;
			// always guard null and undefined explicitly."
			// This rule forces if (value !== null && value !== undefined) patterns
			// instead of if (value) - prevents bugs from falsy values (0, "", false).
			// All allowable coercions are disabled for maximum strictness.
			"@typescript-eslint/strict-boolean-expressions": [
				"error",
				{
					allowAny: false,
					allowNullableBoolean: false,
					allowNullableEnum: false,
					allowNullableNumber: false,
					allowNullableObject: false,
					allowNullableString: false,
					allowNumber: false,
					allowString: false,
				},
			],

			// ./.cursor/rules/_code-rules-TypeScript.mdc: "switch: always include a default branch that
			// throws a named Error" - TypeScript exhaustiveness check ensures all union
			// variants are handled; the default branch surfaces missed variants at runtime.
			"@typescript-eslint/switch-exhaustiveness-check": "error",

			// - EXPLICIT TYPE ANNOTATIONS --------------------
			// ./.cursor/rules/_code-rules-TypeScript.mdc: "Always write explicit : string, : number,
			// or : boolean on function parameters, locals, and const/let bindings -
			// never rely on primitive inference."
			// Also covers destructuring patterns and member variable declarations.
			// mirrors its checks and inserts inferred annotations via --fix.
			"@typescript-eslint/typedef": "off",
		},
	},
];

export default config;
