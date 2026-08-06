/**
 * @fileoverview Mocha + RuleTester tests for the `typedef` rule.
 *
 * Mirrors ESLint's one-file-per-rule convention (see
 * `./_source-eslint/tests/lib/rules/semi.js`). The rule is loaded from the
 * built distributable (`../../../dist/index.js`) so the tests validate the
 * artifact consumers actually load. The `test` npm script runs `npm run
 * build` before Mocha to keep `dist/` fresh.
 *
 * Every case is type-aware: the constructor-level `languageOptions` wires
 * `@typescript-eslint/parser` and points `parserOptions.project` at the
 * fixtures `tsconfig.json`. Inline `code` strings reuse
 * `tests/fixtures/inline.ts` as their `filename` so the parser's project
 * includes them (the fixtures tsconfig globs all .ts files).
 */

import { readFileSync } from "node:fs";

import * as parser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";
import sinon from "sinon";

import { rules } from "../../../dist/index.js";

const typedefRule = rules.typedef;

const FIXTURE_PATH = "tests/fixtures/inline.ts";
const FIXTURE_TSCONFIG = "./tests/fixtures/tsconfig.json";

const RECOMMENDED_OPTIONS = {
	arrayDestructuring: true,
	arrowParameter: false,
	memberVariableDeclaration: true,
	objectDestructuring: true,
	parameter: true,
	propertyDeclaration: true,
	variableDeclaration: true,
	variableDeclarationIgnoreFunction: false,
	debug: false,
};

const ruleTester = new RuleTester({
	languageOptions: {
		parser,
		parserOptions: {
			project: FIXTURE_TSCONFIG,
		},
	},
});

/**
 * Builds an `errors` entry for a named `expectedTypedefNamed` report.
 *
 * @param {string} name - The identifier name interpolated into the message.
 * @returns {{ messageId: string, data: { name: string } }} The error descriptor.
 */
function namedError(name) {
	return {
		messageId: "expectedTypedefNamed",
		data: {
			name,
		},
	};
}

const VALID_CASES = [
	{
		name: "already-annotated const string",
		code: "const x: string = \"a\";",
		options: [{ variableDeclaration: true }],
	},
	{
		name: "already-annotated function parameter",
		code: "function f(a: number) {}",
		options: [{ parameter: true }],
	},
	{
		name: "default options do not report const without annotation",
		code: "const x = \"a\";",
		options: [{}],
	},
	{
		name: "fixture test-primitive.ts is fully annotated",
		code: readFileSync("tests/fixtures/test-primitive.ts", "utf8"),
		options: [RECOMMENDED_OPTIONS],
		filename: "tests/fixtures/test-primitive.ts",
	},
	{
		name: "fixture test-autoimport.ts is fully annotated (imports already present)",
		code: readFileSync("tests/fixtures/test-autoimport.ts", "utf8"),
		options: [RECOMMENDED_OPTIONS],
		filename: "tests/fixtures/test-autoimport.ts",
	},
	{
		name: "fixture test-coalesce.ts is fully annotated (imports already present)",
		code: readFileSync("tests/fixtures/test-coalesce.ts", "utf8"),
		options: [RECOMMENDED_OPTIONS],
		filename: "tests/fixtures/test-coalesce.ts",
	},
];

const INVALID_CASES = [
	{
		name: "const string literal widens to string",
		code: "const x = \"a\";",
		output: "const x: string = \"a\";",
		options: [{ variableDeclaration: true }],
		errors: [namedError("x")],
	},
	{
		name: "const number literal widens to number",
		code: "const n = 1;",
		output: "const n: number = 1;",
		options: [{ variableDeclaration: true }],
		errors: [namedError("n")],
	},
	{
		name: "const boolean literal widens to boolean",
		code: "const b = true;",
		output: "const b: boolean = true;",
		options: [{ variableDeclaration: true }],
		errors: [namedError("b")],
	},
	{
		name: "bare function parameter reports without fix (no inference node)",
		code: "function f(a) {}",
		output: null,
		options: [{ parameter: true }],
		errors: [namedError("a")],
	},
	{
		name: "function parameter with default infers number",
		code: "function f(a = 1) {}",
		output: "function f(a: number = 1) {}",
		options: [{ parameter: true }],
		errors: [namedError("a")],
	},
	{
		name: "array destructuring of literal tuple annotates the pattern",
		code: "const [a, b] = [1, 2];",
		output: "const [a, b]: [number, number] = [1, 2];",
		options: [{ arrayDestructuring: true }],
		errors: [{ messageId: "expectedTypedef" }],
	},
	{
		name: "class property definition infers number",
		code: "class C { x = 1; }",
		output: "class C { x: number = 1; }",
		options: [{ memberVariableDeclaration: true }],
		errors: [namedError("x")],
	},
];

/**
 * `as const` literal config constants (UPPER_CASE values in `./src/config/**`).
 *
 * These surfaced during dogfooding as cases that forced
 * `// eslint-disable-next-line auto-inferred-types/typedef` comments:
 *
 * 1. A literal like `const X = "error" as const` cannot be widened to
 *    `string` without losing the literal type the consuming code relies on.
 *    The plugin must NOT report it at all (reporting-without-a-fix is a bug).
 * 2. A literal object like `const X = { k: "v" } as const` must stay an
 *    `as const` object (typed via its literal members); the plugin previously
 *    produced a bogus structural annotation
 *    `X: { readonly k: "v" } = { ... } as const` which is wrong on two counts:
 *    it duplicates the literal shape and conflicts with the `as const` assertion.
 *
 * Both are expected to be VALID (fully skipped) once the bug is fixed.
 */
const AS_CONST_VALID_CASES = [
	{
		name: "as const string literal is skipped (cannot be widened)",
		code: "export const RULE_LEVEL_ERROR = \"error\" as const;",
		options: [{ variableDeclaration: true }],
	},
	{
		name: "as const number literal is skipped (cannot be widened)",
		code: "export const HTTP_STATUS = 200 as const;",
		options: [{ variableDeclaration: true }],
	},
	{
		name: "as const boolean literal is skipped (cannot be widened)",
		code: "export const ENABLED = true as const;",
		options: [{ variableDeclaration: true }],
	},
	{
		name: "as const object literal is skipped without a structural annotation",
		code: [
			"export const OPTION_KEYS = {",
			"\tArrayDestructuring: \"arrayDestructuring\",",
			"} as const;",
		].join("\n"),
		options: [{ variableDeclaration: true }],
	},
	{
		name: "as const object with multiple literal members is skipped",
		code: [
			"export const META_KEYS = {",
			"\tArrayDestructuring: \"arrayDestructuring\",",
			"\tArrowParameter: \"arrowParameter\",",
			"\tDebug: \"debug\",",
			"} as const;",
		].join("\n"),
		options: [{ variableDeclaration: true }],
	},
	{
		name: "as const class field value is skipped",
		code: [
			"class C {",
			"\treadonly mode = \"suggestion\" as const;",
			"}",
		].join("\n"),
		options: [{ memberVariableDeclaration: true }],
	},
	{
		name: "as const array destructuring initializer is skipped",
		code: "const [a, b] = [1, 2] as const;",
		options: [{ arrayDestructuring: true, variableDeclaration: true }],
	},
	{
		name: "as const object destructuring initializer is skipped",
		code: [
			"const { a } = { a: 1 } as const;",
		].join("\n"),
		options: [{ objectDestructuring: true, variableDeclaration: true }],
	},
];

/**
 * Documented safety-guard skip cases (README "Safety guards"): initialized
 * bindings whose inferred type is `any`, `never`, `void`, an error type, or
 * `null` in a `let` binding. The compiler cannot emit a safe annotation for
 * these, so the rule must leave them UNREPORTED (else the user is forced to
 * disable the rule). All are expected to be VALID.
 */
const SKIP_GUARD_VALID_CASES = [
	{
		name: "function returning void is not reported",
		code: [
			"function foo(): void {}",
			"const x = foo();",
		].join("\n"),
		options: [{ variableDeclaration: true }],
	},
	{
		name: "function returning never is not reported",
		code: [
			"function foo(): never { throw new Error(\"boom\"); }",
			"const x = foo();",
		].join("\n"),
		options: [{ variableDeclaration: true }],
	},
	{
		name: "let x = null is not reported (null annotation only for const)",
		code: "let x = null;",
		options: [{ variableDeclaration: true }],
	},
	{
		name: "error type symbol is not reported",
		code: [
			"import { missingType } from \"./does-not-exist\";",
			"const x = missingType;",
		].join("\n"),
		options: [{ variableDeclaration: true }],
	},
	{
		name: "for-of declarator is not reported",
		code: [
			"const items: string[] = [];",
			"for (const item of items) { console.log(item); }",
		].join("\n"),
		options: [{ variableDeclaration: true, arrayDestructuring: true }],
	},
];

ruleTester.run("typedef", typedefRule, {
	valid: [
		...VALID_CASES.map((c) => ({
			name: c.name,
			code: c.code,
			options: c.options,
			filename: c.filename ?? FIXTURE_PATH,
		})),
		...AS_CONST_VALID_CASES.map((c) => ({
			name: c.name,
			code: c.code,
			options: c.options,
			filename: c.filename ?? FIXTURE_PATH,
		})),
		...SKIP_GUARD_VALID_CASES.map((c) => ({
			name: c.name,
			code: c.code,
			options: c.options,
			filename: c.filename ?? FIXTURE_PATH,
		})),
	],
	invalid: INVALID_CASES.map((c) => ({
		name: c.name,
		code: c.code,
		output: c.output,
		options: c.options,
		filename: FIXTURE_PATH,
		errors: c.errors,
	})),
});

/**
 * Auto-import test cases that exercise the full import-resolution pipeline.
 * These use fixture files (under tests/fixtures/) as their `filename` and
 * `code` so the TypeScript parser can resolve cross-file type symbols and
 * path aliases via the fixture tsconfig.
 */
const AUTO_IMPORT_INVALID_CASES = [
	{
		name: "auto-import: infers PaginatedDocs<Article> and inserts import type for both aliases",
		code: readFileSync("tests/fixtures/test-autoimport-untyped.ts", "utf8"),
		output: [
			"import { getArticles } from \"./services/the-lab-fetch\";",
			"import type { PaginatedDocs } from \"@test-types/payload\";",
			"import type { Article } from \"@/payload-types\";",
			"",
			"export function processArticles() {",
			"\tconst result: PaginatedDocs<Article> = getArticles();",
			"\treturn result;",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true }],
		filename: "tests/fixtures/test-autoimport-untyped.ts",
		errors: [namedError("result")],
	},
	{
		name: "import coalescing: existing import type for PaginatedDocs stays, only Article is added",
		code: readFileSync("tests/fixtures/test-coalesce-untyped.ts", "utf8"),
		output: [
			"import type { PaginatedDocs } from \"@test-types/payload\";",
			"",
			"import { getArticles } from \"./services/the-lab-fetch\";",
			"import type { Article } from \"@/payload-types\";",
			"",
			"export function processArticlesCoalesce() {",
			"\tconst result: PaginatedDocs<Article> = getArticles();",
			"\treturn result;",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true }],
		filename: "tests/fixtures/test-coalesce-untyped.ts",
		errors: [namedError("result")],
	},
	{
		name: "import dedup: both types already imported, only annotations are added",
		code: readFileSync("tests/fixtures/test-dedup-untyped.ts", "utf8"),
		output: [
			"import type { PaginatedDocs } from \"@test-types/payload\";",
			"import type { Article } from \"@/payload-types\";",
			"",
			"import { getArticles, getFirstArticle } from \"./services/the-lab-fetch\";",
			"",
			"export function processArticlesDedup() {",
			"\tconst result: PaginatedDocs<Article> = getArticles();",
			"\tconst first: Article | undefined = getFirstArticle(result);",
			"\treturn { result, first };",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true }],
		filename: "tests/fixtures/test-dedup-untyped.ts",
		errors: [namedError("result"), namedError("first")],
	},
	{
		name: "self-import skip: type declared in same file is not imported",
		code: readFileSync("tests/fixtures/test-self-import.ts", "utf8"),
		output: [
			"export interface LocalType {",
			"\tid: number;",
			"\tvalue: string;",
			"}",
			"",
			"export function makeLocal() {",
			"\tconst item: LocalType = {",
			"\t\tid: 1,",
			"\t\tvalue: \"hello\",",
			"\t};",
			"\treturn item;",
			"}",
			"",
			"export function processLocal() {",
			"\tconst item: LocalType = makeLocal();",
			"\treturn item;",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true }],
		filename: "tests/fixtures/test-self-import.ts",
		errors: [namedError("item")],
	},
	{
		name: "express node_modules import: infers Express type and inserts import type from @types/express-serve-static-core",
		code: readFileSync("tests/fixtures/test-express.ts", "utf8"),
		output: [
			"import express from \"express\";",
			"import type { Express } from \"@types/express-serve-static-core\";",
			"",
			"export function makeApp() {",
			"\tconst app: Express = express();",
			"\treturn app;",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true }],
		filename: "tests/fixtures/test-express.ts",
		errors: [namedError("app")],
	},
	{
		name: "react global type qualification: useState infers React.Dispatch<React.SetStateAction<number>> without importing @types/react",
		code: readFileSync("tests/fixtures/test-react.tsx", "utf8"),
		output: [
			"import { useState } from \"react\";",
			"",
			"export function useCounter() {",
			"\tconst [count, setCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(0);",
			"\treturn { count, setCount };",
			"}",
			"",
		].join("\n"),
		options: [{ variableDeclaration: true, arrayDestructuring: true }],
		filename: "tests/fixtures/test-react.tsx",
		errors: [
			{ messageId: "expectedTypedef" },
			{ messageId: "expectedTypedef" },
		],
	},
];

const autoImportRuleTester = new RuleTester({
	languageOptions: {
		parser,
		parserOptions: {
			project: FIXTURE_TSCONFIG,
		},
	},
});

autoImportRuleTester.run("typedef-auto-import", typedefRule, {
	valid: [],
	invalid: AUTO_IMPORT_INVALID_CASES.map((c) => ({
		name: c.name,
		code: c.code,
		output: c.output,
		options: c.options,
		filename: c.filename,
		errors: c.errors,
	})),
});

/**
 * Debug-option behavior: the `debug` flag emits `[auto-inferred-types]` lines
 * to `process.stderr` and must not alter the autofix output. Stderr capture
 * uses a per-file `sinon.spy` (restored in `after`), mirroring the per-file
 * sinon pattern in `_source-eslint/tests/lib/rule-tester/rule-tester.js`.
 *
 * `RuleTester.run` registers Mocha test cases dynamically, so the spy is
 * installed in `before` and asserted in `after` to span every case it emits.
 */
describe("debug option", () => {
	let stderrSpy;

	before(() => {
		stderrSpy = sinon.spy(process.stderr, "write");
	});

	after(() => {
		const debugLines = stderrSpy.getCalls()
			.map((call) => call.args[0])
			.filter((arg) => typeof arg === "string" && arg.startsWith("[auto-inferred-types]"));

		stderrSpy.restore();

		if (debugLines.length === 0) {
			throw new Error("Expected at least one [auto-inferred-types] debug line on stderr.");
		}
	});

	const debugRuleTester = new RuleTester({
		languageOptions: {
			parser,
			parserOptions: {
				project: FIXTURE_TSCONFIG,
			},
		},
	});

	debugRuleTester.run("typedef", typedefRule, {
		valid: [],
		invalid: [
			{
				name: "debug does not mutate fix output",
				code: "const x = \"a\";",
				output: "const x: string = \"a\";",
				options: [{ variableDeclaration: true, debug: true }],
				filename: FIXTURE_PATH,
				errors: [namedError("x")],
			},
		],
	});
});
