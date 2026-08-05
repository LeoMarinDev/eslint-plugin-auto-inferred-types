# eslint-plugin-auto-inferred-types

An ESLint plugin for TypeScript that detects missing type annotations and autofixes them from the compiler's own type inference, including auto-importing every referenced type via `import type`.

## Overview

`eslint-plugin-auto-inferred-types` is a flat-config ESLint plugin for TypeScript. It finds declarations that lack an explicit type annotation and replaces them with the type the TypeScript compiler infers, so you get explicit annotations without hand-writing them. Unlike `@typescript-eslint/typedef`, which inserts a blind placeholder or requires you to fill in the type, this plugin derives the annotation from the compiler itself: AST visitors (`VariableDeclarator`, `PropertyDefinition`, function parameters, destructuring patterns, property signatures) detect unannotated nodes, the TypeScript compiler API (`getTypeAtLocation` / `typeToString` via the `@typescript-eslint/utils` parser services) produces the type text, and module resolution against `tsconfig.json` `paths` aliases emits the `import type` fixes for every referenced type. It also surfaces inference gaps - places where the compiler cannot produce a safe annotation (for example `any` or error types) - by leaving them unreported until you resolve the underlying issue.

## Sponsor

[![BrainyBuilds](https://brainybuilds.com/favicon.svg)](https://brainybuilds.com/)

eslint-plugin-auto-inferred-types is sponsored by BrainyBuilds - https://brainybuilds.com/ - thank you for supporting the project.

## Prerequisites

- ESLint `>= 10.0.0`
- TypeScript `^6.0.0`
- `@typescript-eslint/utils ^8.65.0`

These three are peer dependencies; install them in your project alongside the plugin. Your project also needs `@typescript-eslint/parser` installed as a dev dependency - the rule is type-aware and requires `parserOptions.project` to access the TypeScript type checker (see [Type-aware project setup](#type-aware-project-setup)).

## Installation

```bash
npm install --save-dev eslint-plugin-auto-inferred-types
```

```bash
pnpm add --save-dev eslint-plugin-auto-inferred-types
```

```bash
yarn add --dev eslint-plugin-auto-inferred-types
```

Also install the peer dependencies (`eslint`, `typescript`, `@typescript-eslint/parser`) if they are not already present in your project.

## Quick start

The plugin ships a `recommended` flat config that registers the plugin under the `auto-inferred-types` namespace and enables the `typedef` rule at error level with the recommended options.

```js
import plugin from "eslint-plugin-auto-inferred-types";

export default [
    plugin.configs.recommended,
];
```

Note: `plugin.configs["flat/recommended"]` is an alias of the same config object.

## Full configuration

The `typedef` rule is opt-in per syntactic position. All options default to `false`; enable only the positions you want checked.

```js
import plugin from "eslint-plugin-auto-inferred-types";

export default [
    {
        plugins: {
            "auto-inferred-types": plugin,
        },
        rules: {
            "auto-inferred-types/typedef": ["error", {
                arrayDestructuring: true,
                arrowParameter: true,
                memberVariableDeclaration: true,
                objectDestructuring: true,
                parameter: true,
                propertyDeclaration: true,
                variableDeclaration: true,
                variableDeclarationIgnoreFunction: true,
                debug: false,
            }],
        },
    },
];
```

| Option | Default | What it controls |
|---|---|---|
| `variableDeclaration` | `false` | Reports `const` and `let` variable declarations without a type annotation. |
| `variableDeclarationIgnoreFunction` | `false` | When combined with `variableDeclaration` (or `memberVariableDeclaration`), additionally ignores declarations whose initializer is a function (arrow function or function expression). |
| `parameter` | `false` | Reports unannotated parameters of function declarations and function expressions. |
| `arrowParameter` | `false` | Reports unannotated arrow function parameters. |
| `memberVariableDeclaration` | `false` | Reports unannotated class field declarations (`PropertyDefinition`). |
| `propertyDeclaration` | `false` | Reports unannotated property signatures and index signatures in type positions (`TSPropertySignature`, `TSIndexSignature`). |
| `arrayDestructuring` | `false` | Reports unannotated array destructuring patterns. |
| `objectDestructuring` | `false` | Reports unannotated object destructuring patterns. |
| `debug` | `false` | Emits structured `[auto-inferred-types]` diagnostics to stderr. Does not alter any fixes. |

The `recommended` config enables `variableDeclaration`, `parameter`, `memberVariableDeclaration`, `propertyDeclaration`, `arrayDestructuring`, and `objectDestructuring`; `arrowParameter`, `variableDeclarationIgnoreFunction`, and `debug` stay `false`.

## Type-aware project setup

The rule needs TypeScript's type checker, so the parser must provide type information via `parserOptions.project` pointing at a valid `tsconfig.json`.

```js
import plugin from "eslint-plugin-auto-inferred-types";
import parser from "@typescript-eslint/parser";

export default [
    {
        plugins: {
            "auto-inferred-types": plugin,
        },
        languageOptions: {
            parser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            "auto-inferred-types/typedef": "error",
        },
    },
];
```

The `tsconfig.json` referenced by `project` must enable `strict: true` (the plugin relies on strict mode semantics for sound inference, for example gating `null` annotations) and must include the files you lint - if a file is outside the project, the parser cannot provide type information for it. A minimal example:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "strict": true,
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx",
        "lib": ["ES2022", "DOM"],
        "paths": {
            "@/*": ["./*"],
            "@test-types/*": ["./types/*"],
            "@app-services/*": ["./services/*"]
        }
    },
    "include": ["**/*.ts", "**/*.tsx"]
}
```

Path aliases declared under `compilerOptions.paths` drive the module specifiers used in emitted `import type` fixes.

## Debug mode

Set `debug: true` to emit structured diagnostics to `process.stderr`. Each line is prefixed with `[auto-inferred-types]` and a label marking the key point: `visit` (a node was visited), `report` (a problem was reported), `skip` / `skip-fix` (a node or fix was skipped and why), and `param-check` (function parameter inspection). Debug output is observation-only: it never throws and never changes the emitted fixes.

```js
"auto-inferred-types/typedef": ["error", { variableDeclaration: true, debug: true }],
```

## How it works

- Detection: AST visitors registered per enabled option run on variable declarators, class property definitions, function and arrow function parameters, array and object destructuring patterns, and property/index signatures in type positions.
- Inference: for each unannotated node, the rule asks the TypeScript program for the node's type via `getTypeAtLocation()`, then serializes it with `typeToString()` (using the `NoTruncation` and `UseAliasDefinedOutsideCurrentScope` format flags) into the annotation string.
- Auto-import: identifiers parsed from the type text are resolved to their declaring source files through the TypeScript symbol checker (with a search across all program files as a fallback), mapped to module specifiers via `tsconfig.json` `paths` aliases (node_modules paths resolve to their package names), and emitted as `import type { ... }` fixer operations that merge into any existing type import from the same module.
- Safety guards: `any`, `never`, error types, `void`, and empty type text are skipped; `null` annotations are emitted only for `const` bindings (never `let`); literal types are widened to their primitives; self-imports, names already imported in the file, and TypeScript built-in types are not re-imported; React types from `@types/react` are qualified as `React.*` instead of imported; declarators inside `for...of` / `for...in` loops are left alone.

## Limitations

- Type-aware only: the rule requires `parserOptions.project` pointing at a valid `tsconfig.json`. Without type information there is nothing to infer from and no fix is produced.
- `tsc --noEmit` should pass on the project before running the rule - broken imports surface as error types, which the rule skips silently instead of reporting.
- Literal widening: `42` becomes `number`, `"hello"` becomes `string`, `true` becomes `boolean` (no literal types are emitted).
- `null` annotation only for `const` declarations, never `let`.

## Development / contributing

Contributions are welcome. Please open an issue first to discuss changes: https://github.com/LeoMarinDev/eslint-plugin-auto-inferred-types/issues

```bash
git clone https://github.com/LeoMarinDev/eslint-plugin-auto-inferred-types.git
cd eslint-plugin-auto-inferred-types
npm install
npm test
npm run build
```

## License

MIT License - https://github.com/LeoMarinDev/eslint-plugin-auto-inferred-types
