import ts from "typescript";

import {
	resolveModuleSpecifier,
} from "@utils/module-specifier-resolution";

import type {
	FindExportByNameParams,
	FindSymbolInAllFilesParams,
	ModuleNamesMap,
	ResolveAliasedSymbolParams,
	ResolveIdentifierSymbolParams,
	ResolveIdentifiersToModulesParams,
	SymbolHasDeclarationParams,
	EnsureNamesSetParams,
} from "@types-internal/utils/type-imports-types";

/**
 * Resolve a set of type-identifier names to their source module specifiers
 * using the TypeScript program's type checker. Returns a map from module
 * specifier to the set of names that need importing from it.
 *
 * Skips names that are already imported in the file (via any import kind)
 * and names whose only declaration is in the current file (self-imports).
 *
 * @param {ResolveIdentifiersToModulesParams} params - The parameters object.
 * @param {ts.TypeChecker} params.checker - The TypeScript type checker.
 * @param {ts.Program} params.program - The TypeScript program for compiler options and source files.
 * @param {ts.SourceFile} params.currentSourceFile - The source file being fixed.
 * @param {string[]} params.identifiers - The candidate type-identifier names to resolve.
 * @param {Set<string>} params.alreadyImportedNames - All binding names already imported in the file.
 * @param {ModuleNamesMap} params.existingTypeImports - Existing type-import names keyed by module specifier.
 * @returns {ModuleNamesMap} A map from module specifier to the set of names that need importing.
 */
function resolveIdentifiersToModules(
	params: ResolveIdentifiersToModulesParams,
): ModuleNamesMap {
	const {
		checker,
		program,
		currentSourceFile,
		identifiers,
		alreadyImportedNames,
		existingTypeImports,
	}: ResolveIdentifiersToModulesParams = params;

	const result: ModuleNamesMap = new Map<string, Set<string>>();
	const compilerOptions: ts.CompilerOptions = program.getCompilerOptions();
	const allSourceFiles: readonly ts.SourceFile[] = program.getSourceFiles();
	const currentFilePath: string = currentSourceFile.fileName.replace(/\\/g, "/");

	for (
		let nameIndex = 0;
		nameIndex < identifiers.length;
		nameIndex++
	) {
		const name: string = identifiers[nameIndex];

		if (
			alreadyImportedNames.has(name)
		) {
			continue;
		}

		const resolvedSym: ts.Symbol | undefined = resolveIdentifierSymbol({
			checker,
			currentSourceFile,
			allSourceFiles,
			name,
		});

		const hasDeclaration: boolean = symbolHasDeclaration({
			symbol: resolvedSym,
		});
		if (
			hasDeclaration === false
		) {
			continue;
		}

		const declFile: string = resolvedSym!.declarations![0]
			.getSourceFile()
			.fileName.replace(/\\/g, "/");

		if (
			declFile === currentFilePath
		) {
			continue;
		}

		const moduleSpecifier: string | undefined = resolveModuleSpecifier({
			declFilePath: declFile,
			compilerOptions,
		});

		if (
			moduleSpecifier === undefined
		) {
			continue;
		}

		const existing: Set<string> | undefined = existingTypeImports.get(moduleSpecifier);
		if (
			existing?.has(name) === true
		) {
			continue;
		}

		const names: Set<string> = ensureNamesSet({
			map: result,
			key: moduleSpecifier,
		});
		names.add(name);
	}

	return result;
}

/**
 * Search all source files (including declaration files) for an exported
 * type symbol matching the given name. This is the fallback when
 * `checker.resolveName` fails (the identifier is not yet in the file's
 * scope because the import hasn't been added).
 *
 * @param {FindSymbolInAllFilesParams} params - The parameters object.
 * @param {ts.TypeChecker} params.checker - The TypeScript type checker.
 * @param {readonly ts.SourceFile[]} params.allSourceFiles - All source files in the program.
 * @param {string} params.name - The symbol name to find.
 * @returns {ts.Symbol | undefined} The resolved symbol, or `undefined` when not found.
 */
function findSymbolInAllFiles(
	params: FindSymbolInAllFilesParams,
): ts.Symbol | undefined {
	const {
		checker,
		allSourceFiles,
		name,
	}: FindSymbolInAllFilesParams = params;

	let resolved: ts.Symbol | undefined;

	for (
		let fileIndex = 0;
		fileIndex < allSourceFiles.length;
		fileIndex++
	) {
		const sourceFile: ts.SourceFile = allSourceFiles[fileIndex];
		const moduleSym: ts.Symbol | undefined = checker.getSymbolAtLocation(sourceFile);

		if (
			moduleSym === undefined
		) {
			continue;
		}

		const exportSymbols: ts.Symbol[] = checker.getExportsOfModule(moduleSym);
		resolved = findExportByName({
			exportSymbols,
			name,
			checker,
		});

		if (
			resolved !== undefined
		) {
			break;
		}
	}

	return resolved;
}

/**
 * Resolve a single identifier name to a TypeScript symbol, first via
 * `checker.resolveName` (scope-local lookup), then via
 * `findSymbolInAllFiles` (global export fallback).
 *
 * @param {ResolveIdentifierSymbolParams} params - The parameters object.
 * @param {ts.TypeChecker} params.checker - The TypeScript type checker.
 * @param {ts.SourceFile} params.currentSourceFile - The source file being fixed.
 * @param {readonly ts.SourceFile[]} params.allSourceFiles - All source files in the program.
 * @param {string} params.name - The identifier name to resolve.
 * @returns {ts.Symbol | undefined} The resolved symbol, or `undefined`.
 */
function resolveIdentifierSymbol(
	params: ResolveIdentifierSymbolParams,
): ts.Symbol | undefined {
	const {
		checker,
		currentSourceFile,
		allSourceFiles,
		name,
	}: ResolveIdentifierSymbolParams = params;

	const scopeSym: ts.Symbol | undefined = checker.resolveName(
		name,
		currentSourceFile,
		ts.SymbolFlags.Type,
		false,
	);

	if (
		scopeSym !== undefined
	) {
		const resolved: ts.Symbol = resolveAliasedSymbol({
			symbol: scopeSym,
			checker,
		});
		return resolved;
	}

	const fallback: ts.Symbol | undefined = findSymbolInAllFiles({
		checker,
		allSourceFiles,
		name,
	});

	return fallback;
}

/**
 * Find an exported symbol matching a name in a list of exports, resolving
 * aliases to their underlying target.
 *
 * @param {FindExportByNameParams} params - The parameters object.
 * @param {ts.Symbol[]} params.exportSymbols - The exported symbols to scan.
 * @param {string} params.name - The name to match.
 * @param {ts.TypeChecker} params.checker - The type checker for alias resolution.
 * @returns {ts.Symbol | undefined} The resolved symbol, or `undefined` when not found.
 */
function findExportByName(
	params: FindExportByNameParams,
): ts.Symbol | undefined {
	const {
		exportSymbols,
		name,
		checker,
	}: FindExportByNameParams = params;

	let matched: ts.Symbol | undefined;

	for (
		let exportIndex = 0;
		exportIndex < exportSymbols.length;
		exportIndex++
	) {
		const exp: ts.Symbol = exportSymbols[exportIndex];
		if (
			exp.name !== name
		) {
			continue;
		}

		matched = resolveAliasedSymbol({
			symbol: exp,
			checker,
		});
		break;
	}

	return matched;
}

/**
 * Resolve a symbol that may be an alias to its underlying target.
 *
 * @param {ResolveAliasedSymbolParams} params - The parameters object.
 * @param {ts.Symbol} params.symbol - The symbol to resolve.
 * @param {ts.TypeChecker} params.checker - The type checker for `getAliasedSymbol`.
 * @returns {ts.Symbol} The resolved symbol, or the original when not an alias.
 */
function resolveAliasedSymbol(
	params: ResolveAliasedSymbolParams,
): ts.Symbol {
	const {
		symbol,
		checker,
	}: ResolveAliasedSymbolParams = params;

	const isAlias: boolean = (symbol.flags & ts.SymbolFlags.Alias) !== 0;
	if (
		isAlias
	) {
		const resolved: ts.Symbol = checker.getAliasedSymbol(symbol);
		return resolved;
	}

	return symbol;
}

/**
 * Check whether a symbol has at least one declaration.
 *
 * @param {SymbolHasDeclarationParams} params - The parameters object.
 * @param {ts.Symbol | undefined} params.symbol - The symbol to check.
 * @returns {boolean} `true` when the symbol exists and has declarations, otherwise `false`.
 */
function symbolHasDeclaration(
	params: SymbolHasDeclarationParams,
): boolean {
	const {
		symbol,
	}: SymbolHasDeclarationParams = params;

	if (
		symbol === undefined
	) {
		const noSymbol = false;
		return noSymbol;
	}

	const declarations: readonly ts.Declaration[] | undefined = symbol.declarations;
	if (
		declarations === undefined
		|| declarations.length === 0
	) {
		const noDeclarations = false;
		return noDeclarations;
	}

	const hasDeclarations = true;
	return hasDeclarations;
}

/**
 * Ensure a `Set<string>` entry exists in the map for the given key,
 * creating it if absent.
 *
 * @param {EnsureNamesSetParams} params - The parameters object.
 * @param {ModuleNamesMap} params.map - The map to mutate.
 * @param {string} params.key - The key to look up or create.
 * @returns {Set<string>} The existing or newly created set.
 */
function ensureNamesSet(
	params: EnsureNamesSetParams,
): Set<string> {
	const {
		map,
		key,
	}: EnsureNamesSetParams = params;

	let names: Set<string> | undefined = map.get(key);
	if (
		names === undefined
	) {
		names = new Set<string>();
		map.set(
			key,
			names,
		);
	}

	return names;
}

export {
	resolveIdentifiersToModules,
	findSymbolInAllFiles,
	resolveAliasedSymbol,
	ensureNamesSet,
};
