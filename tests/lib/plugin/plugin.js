/**
 * @fileoverview Integration tests for the `eslint-plugin-auto-inferred-types`
 * plugin object.
 *
 * Mirrors ESLint's own lower-level `Linter` integration patterns (see
 * `./_source-eslint/tests/lib/linter/linter.js`): the plugin is loaded from
 * the built distributable, wired inline into a flat config, and exercised via
 * `Linter#verifyAndFix` so the full plugin shape - `meta`, `configs`,
 * `rules`, and the `typedef` rule's autofix - is validated end to end.
 */

import assert from "node:assert/strict";

import * as parser from "@typescript-eslint/parser";
import {
	Linter,
} from "eslint";

import plugin, {
	configs,
	rules,
} from "../../../dist/index.js";

const FIXTURE_FILENAME = "tests/fixtures/inline.ts";
const FIXTURE_TSCONFIG = "./tests/fixtures/tsconfig.json";
const PLUGIN_NAMESPACE = "auto-inferred-types";
const RULE_CONFIG_KEY = "auto-inferred-types/typedef";

describe("plugin integration", () => {
	it("exposes meta, configs, and rules", () => {
		assert.ok(plugin.meta);
		assert.ok(plugin.configs);
		assert.ok(plugin.rules);
		assert.ok(plugin.rules.typedef);
		assert.ok(plugin.configs.recommended);
		assert.ok(plugin.configs["flat/recommended"]);
	});

	it("configs.recommended is a flat config object with plugins and rules", () => {
		assert.ok(configs.recommended.plugins);
		assert.ok(configs.recommended.rules);
		assert.ok(configs.recommended.rules[RULE_CONFIG_KEY]);
		assert.strictEqual(
			configs["flat/recommended"],
			configs.recommended,
		);
	});

	it("rules.typedef is a rule module with create and meta", () => {
		assert.strictEqual(typeof rules.typedef, "object");
		assert.strictEqual(typeof rules.typedef.create, "function");
		assert.ok(rules.typedef.meta);
	});

	it("reports and fixes missing type annotations via Linter", () => {
		const linter = new Linter({ configType: "flat" });
		const code = "const x = \"a\";";
		const config = {
			files: [
				"**/*.ts",
			],
			plugins: {
				[PLUGIN_NAMESPACE]: plugin,
			},
			rules: {
				[RULE_CONFIG_KEY]: [
					"error",
					{
						variableDeclaration: true,
					},
				],
			},
			languageOptions: {
				parser,
				parserOptions: {
					project: FIXTURE_TSCONFIG,
				},
			},
		};

		const result = linter.verifyAndFix(
			code,
			config,
			FIXTURE_FILENAME,
		);

		assert.strictEqual(
			result.output,
			"const x: string = \"a\";",
		);
		assert.strictEqual(
			result.messages.length,
			0,
			`expected no remaining messages, got ${JSON.stringify(result.messages)}`,
		);
	});
});
