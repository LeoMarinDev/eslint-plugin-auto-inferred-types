import type {
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";
import type ts from "typescript";

/**
 * Result of building an inferred type annotation plus its accompanying
 * import fixes for a single node.
 */
export interface InferredTypeFixResult {
	typeText: string;
	importFixes: TSESLint.RuleFix[];
}

/**
 * Map from module specifier to the set of type-identifier names that need
 * importing from that module.
 */
export type ModuleNamesMap = Map<string, Set<string>>;

/**
 * Parameter object for `resolveIdentifiersToModules`.
 */
export interface ResolveIdentifiersToModulesParams {
	checker: ts.TypeChecker;
	program: ts.Program;
	currentSourceFile: ts.SourceFile;
	identifiers: string[];
	alreadyImportedNames: Set<string>;
	existingTypeImports: ModuleNamesMap;
}

/**
 * Parameter object for `findSymbolInAllFiles`.
 */
export interface FindSymbolInAllFilesParams {
	checker: ts.TypeChecker;
	allSourceFiles: readonly ts.SourceFile[];
	name: string;
}

/**
 * Parameter object for `buildImportTypeFixes`.
 */
export interface BuildImportTypeFixesParams {
	fixer: TSESLint.RuleFixer;
	programNode: TSESTree.Program;
	importsByModule: ModuleNamesMap;
	existingTypeImports: ModuleNamesMap;
}

/**
 * Parameter object for `buildInferredTypeAnnotationFixes`.
 */
export interface BuildInferredTypeAnnotationFixesParams {
	context: Readonly<TSESLint.RuleContext<string, unknown[]>>;
	fixer: TSESLint.RuleFixer;
	inferenceNode: TSESTree.Node;
}

/**
 * Parameter object for `getInferredTypeText`.
 */
export interface GetInferredTypeTextParams {
	context: Readonly<TSESLint.RuleContext<string, unknown[]>>;
	inferenceNode: TSESTree.Node;
}

/**
 * Parameter object for `widenLiteralTypeAnnotation`.
 */
export interface WidenLiteralTypeAnnotationParams {
	type: ts.Type;
	checker: ts.TypeChecker;
	typeText: string;
}

/**
 * Parameter object for `qualifyKnownGlobalType`.
 */
export interface QualifyKnownGlobalTypeParams {
	type: ts.Type;
	typeText: string;
	checker: ts.TypeChecker;
}

/**
 * Parameter object for `typeContainsError`.
 */
export interface TypeContainsErrorParams {
	type: ts.Type;
	checker: ts.TypeChecker;
}

/**
 * Parameter object for `resolveModuleSpecifier`.
 */
export interface ResolveModuleSpecifierParams {
	declFilePath: string;
	compilerOptions: ts.CompilerOptions;
}

/**
 * Parameter object for `resolveAliasedSymbol`.
 */
export interface ResolveAliasedSymbolParams {
	symbol: ts.Symbol;
	checker: ts.TypeChecker;
}

/**
 * Parameter object for `findExportByName`.
 */
export interface FindExportByNameParams {
	exportSymbols: ts.Symbol[];
	name: string;
	checker: ts.TypeChecker;
}

/**
 * Parameter object for `symbolHasDeclaration`.
 */
export interface SymbolHasDeclarationParams {
	symbol: ts.Symbol | undefined;
}

/**
 * Parameter object for `ensureNamesSet`.
 */
export interface EnsureNamesSetParams {
	map: ModuleNamesMap;
	key: string;
}

/**
 * Parameter object for `resolveIdentifierSymbol`.
 */
export interface ResolveIdentifierSymbolParams {
	checker: ts.TypeChecker;
	currentSourceFile: ts.SourceFile;
	allSourceFiles: readonly ts.SourceFile[];
	name: string;
}

/**
 * Parameter object for `resolveLocalAliasSpecifier`.
 */
export interface ResolveLocalAliasSpecifierParams {
	normalized: string;
	compilerOptions: ts.CompilerOptions;
}

/**
 * Parameter object for `stripPrefix`.
 */
export interface StripPrefixParams {
	path: string;
	prefix: string;
}

/**
 * Parameter object for `collectSpecifierNames`.
 */
export interface CollectSpecifierNamesParams {
	specifiers: TSESTree.ImportClause[];
	names: Set<string>;
}

/**
 * Parameter object for `buildSingleModuleFix`.
 */
export interface BuildSingleModuleFixParams {
	fixer: TSESLint.RuleFixer;
	existingImport: TSESTree.ImportDeclaration | undefined;
	lastImport: TSESTree.ImportDeclaration | undefined;
	moduleSpecifier: string;
	sortedNames: string[];
}

/**
 * Parameter object for `resolveImportsByModule`.
 */
export interface ResolveImportsByModuleParams {
	context: Readonly<TSESLint.RuleContext<string, unknown[]>>;
	inferenceNode: TSESTree.Node;
	identifiers: string[];
}
