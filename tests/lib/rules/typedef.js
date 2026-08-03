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

ruleTester.run("typedef", typedefRule, {
	valid: VALID_CASES.map((c) => ({
		name: c.name,
		code: c.code,
		options: c.options,
		filename: c.filename ?? FIXTURE_PATH,
	})),
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
