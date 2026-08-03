import {
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";

import {
	ensureNamesSet,
} from "@utils/symbol-resolution";

import type {
	CollectSpecifierNamesParams,
	ModuleNamesMap,
} from "@types-internal/utils/type-imports-types";
import type {
	TSESTree,
} from "@typescript-eslint/utils";



/**
 * Collect existing type-import binding names already present in the file,
 * keyed by module specifier. This prevents the rule from emitting duplicate
 * imports for names that are already imported.
 *
 * @param {TSESTree.Program} programNode - The program AST root.
 * @returns {ModuleNamesMap} A map from module specifier to the set of type-import binding names.
 */
function collectExistingTypeImports(
	programNode: TSESTree.Program,
): ModuleNamesMap {
	const existing: ModuleNamesMap = new Map<string, Set<string>>();

	for (
		let statementIndex = 0;
		statementIndex < programNode.body.length;
		statementIndex++
	) {
		const statement: TSESTree.ProgramStatement = programNode.body[statementIndex];

		const isTypeImport: boolean = (
			statement.type === AST_NODE_TYPES.ImportDeclaration
			&& statement.importKind === "type"
		);
		if (
			isTypeImport === false
		) {
			continue;
		}

		const importDeclaration: TSESTree.ImportDeclaration = statement as TSESTree.ImportDeclaration;
		const source: string = importDeclaration.source.value;

		const names: Set<string> = ensureNamesSet({
			map: existing,
			key: source,
		});
		collectSpecifierNames({
			specifiers: importDeclaration.specifiers,
			names,
		});
	}

	return existing;
}

/**
 * Collect ALL imported binding names (both type and value imports) present
 * in the file. Used to skip emitting an import for a name that is already
 * bound in the file's scope via any kind of import.
 *
 * @param {TSESTree.Program} programNode - The program AST root.
 * @returns {Set<string>} A set of all imported binding names.
 */
function collectAllImportedNames(
	programNode: TSESTree.Program,
): Set<string> {
	const names: Set<string> = new Set<string>();

	for (
		let statementIndex = 0;
		statementIndex < programNode.body.length;
		statementIndex++
	) {
		const statement: TSESTree.ProgramStatement = programNode.body[statementIndex];

		if (
			statement.type !== AST_NODE_TYPES.ImportDeclaration
		) {
			continue;
		}

		const importDeclaration: TSESTree.ImportDeclaration = statement;
		collectSpecifierNames({
			specifiers: importDeclaration.specifiers,
			names,
		});
	}

	return names;
}

/**
 * Collect all import declarations keyed by their module source value.
 * When multiple imports from the same source exist, the last one wins
 * (matching ESLint's fix behavior). Stops at the first non-import
 * statement, since imports must appear before other statements.
 *
 * @param {TSESTree.Program} programNode - The program AST root.
 * @returns {Map<string, TSESTree.ImportDeclaration>} A map from source value to the last import declaration.
 */
function collectImportDeclarationsBySource(
	programNode: TSESTree.Program,
): Map<string, TSESTree.ImportDeclaration> {
	const result = new Map<string, TSESTree.ImportDeclaration>();

	for (
		let statementIndex = 0;
		statementIndex < programNode.body.length;
		statementIndex++
	) {
		const statement: TSESTree.ProgramStatement = programNode.body[statementIndex];

		if (
			statement.type !== AST_NODE_TYPES.ImportDeclaration
		) {
			break;
		}

		const importDeclaration: TSESTree.ImportDeclaration = statement;
		result.set(
			importDeclaration.source.value,
			importDeclaration,
		);
	}

	return result;
}

/**
 * Find the last import declaration in the program body. Returns
 * `undefined` when no import declarations exist.
 *
 * @param {TSESTree.Program} programNode - The program AST root.
 * @returns {TSESTree.ImportDeclaration | undefined} The last import declaration, or `undefined`.
 */
function findLastImportDeclaration(
	programNode: TSESTree.Program,
): TSESTree.ImportDeclaration | undefined {
	let lastImport: TSESTree.ImportDeclaration | undefined;

	for (
		let statementIndex = 0;
		statementIndex < programNode.body.length;
		statementIndex++
	) {
		const statement: TSESTree.ProgramStatement = programNode.body[statementIndex];

		if (
			statement.type !== AST_NODE_TYPES.ImportDeclaration
		) {
			break;
		}

		lastImport = statement;
	}

	return lastImport;
}

/**
 * Add each specifier's local binding name to the target set.
 *
 * @param {CollectSpecifierNamesParams} params - The parameters object.
 * @param {TSESTree.ImportClause[]} params.specifiers - The import specifiers to scan.
 * @param {Set<string>} params.names - The set to mutate.
 */
function collectSpecifierNames(
	params: CollectSpecifierNamesParams,
): void {
	const {
		specifiers,
		names,
	}: CollectSpecifierNamesParams = params;

	for (
		let specifierIndex = 0;
		specifierIndex < specifiers.length;
		specifierIndex++
	) {
		const specifier: TSESTree.ImportClause = specifiers[specifierIndex];
		names.add(specifier.local.name);
	}
}

export {
	collectExistingTypeImports,
	collectAllImportedNames,
	collectImportDeclarationsBySource,
	findLastImportDeclaration,
};
