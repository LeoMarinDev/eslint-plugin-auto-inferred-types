import {
	defineConfig,
} from "tsup";

export default defineConfig({
	entry: [
		"src/index.ts",
	],
	format: [
		"esm",
	],
	dts: true,
	clean: true,
	tsconfig: "./tsconfig.build.json",
	external: [
		"eslint",
		"typescript",
		"@typescript-eslint/utils",
	],
});
