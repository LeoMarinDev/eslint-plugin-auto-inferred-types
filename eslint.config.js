/**
 * eslint.config.js - Smart Entry Point
 *
 * Automatically selects the correct config based on what files are present:
 *
 *   eslint.config.react.js EXISTS  ->  React 19 + Tailwind v4 + full TS rules
 *   eslint.config.react.js ABSENT  ->  Base TS rules only (Node.js / Bun backend)
 *
 * This is the only file ESLint reads. Both project types run the same command:
 *
 *   eslint .
 *
 * To set up a project:
 *
 *   Backend only  ->  copy eslint.config.js + eslint.config.base.js
 *   React project ->  copy all three: eslint.config.js, eslint.config.base.js,
 *                     eslint.config.react.js
 *
 * Top-level await is valid in ESM. ESLint v10 supports ESM config files.
 * Requires "type": "module" in package.json (or .mjs extension).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REACT_CONFIG_PATH = resolve(__dirname, "eslint.config.react.js");

const { default: config } = existsSync(REACT_CONFIG_PATH)
	? await import("./eslint.config.react.js")
	: await import("./eslint.config.base.js");

export default config;
