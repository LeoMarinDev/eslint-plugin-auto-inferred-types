import {
	ESLintUtils,
} from "@typescript-eslint/utils";

import {
	collectAllImportedNames,
	collectExistingTypeImports,
	collectImportDeclarationsBySource,
	findLastImportDeclaration,
} from "@utils/import-collection";
import {
	resolveIdentifiersToModules,
} from "@utils/symbol-resolution";
import {
	extractTypeIdentifiers,
} from "@utils/type-identifier-extraction";
import {
	getInferredTypeText,
} from "@utils/type-inference";

import type {
	BuildImportTypeFixesParams,
	BuildInferredTypeAnnotationFixesParams,
	BuildSingleModuleFixParams,
	InferredTypeFixResult,
	ModuleNamesMap,
	ResolveImportsByModuleParams,
} from "@types-internal/utils/type-imports-types";
import type {
	ParserServicesWithTypeInformation,
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";
import type ts from "typescript";

/**
 * Build the type annotation text and import fixes for a node.
 *
 * Resolves identifiers in the inferred type text to their source modules
 * using the TypeScript program's type checker, and emits `import type`
 * statements for any that are not already imported in the file.
 *
 * @param {BuildInferredTypeAnnotationFixesParams} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<string, unknown[]>>} params.context - The ESLint rule context.
 * @param {TSESLint.RuleFixer} params.fixer - The ESLint fixer.
 * @param {TSESTree.Node} params.inferenceNode - The node whose inferred type will be annotated.
 * @returns {InferredTypeFixResult | undefined} The type text and import fixes, or `undefined` when no annotation applies.
 */
function buildInferredTypeAnnotationFixes(
	params: BuildInferredTypeAnnotationFixesParams,
): InferredTypeFixResult | undefined {
	const {
		context,
		fixer,
		inferenceNode,
	}: BuildInferredTypeAnnotationFixesParams = params;

	const typeText: string | undefined = getInferredTypeText({
		context,
		inferenceNode,
	});

	if (
		typeText === undefined
	) {
		const noFix = undefined;
		return noFix;
	}

	const identifiers: string[] = extractTypeIdentifiers(typeText);

	if (
		identifiers.length === 0
	) {
		const resultNoImports: InferredTypeFixResult = {
			typeText,
			importFixes: [],
		};
		return resultNoImports;
	}

	const importsByModule: ModuleNamesMap = resolveImportsByModule({
		context,
		inferenceNode,
		identifiers,
	});

	const programNode: TSESTree.Program = context.sourceCode.ast;
	const existingTypeImports: ModuleNamesMap = collectExistingTypeImports(programNode);

	const importFixes: TSESLint.RuleFix[] = buildImportTypeFixes({
		fixer,
		programNode,
		importsByModule,
		existingTypeImports,
	});

	const result: InferredTypeFixResult = {
		typeText,
		importFixes,
	};

	return result;
}

/**
 * Build import-type fixer insertions for the identifiers referenced in
 * `importsByModule` that are not already imported in the file.
 *
 * If a type import from the same module already exists, new specifiers are
 * appended to it instead of creating a separate import declaration. This
 * keeps the fix idempotent: strip removes a specifier from a shared import,
 * and restore merges it back into the same declaration.
 *
 * @param {BuildImportTypeFixesParams} params - The parameters object.
 * @param {TSESLint.RuleFixer} params.fixer - The ESLint fixer.
 * @param {TSESTree.Program} params.programNode - The program AST root.
 * @param {ModuleNamesMap} params.importsByModule - Names to import, keyed by module specifier.
 * @param {ModuleNamesMap} params.existingTypeImports - Existing type-import names, keyed by module specifier.
 * @returns {TSESLint.RuleFix[]} An array of fixer operations.
 */
function buildImportTypeFixes(
	params: BuildImportTypeFixesParams,
): TSESLint.RuleFix[] {
	const {
		fixer,
		programNode,
		importsByModule,
		existingTypeImports: _existingTypeImports,
	}: BuildImportTypeFixesParams = params;

	if (
		importsByModule.size === 0
	) {
		const noFixes: TSESLint.RuleFix[] = [];
		return noFixes;
	}

	const importDeclarations: Map<string, TSESTree.ImportDeclaration> = collectImportDeclarationsBySource(programNode);
	const lastImport: TSESTree.ImportDeclaration | undefined = findLastImportDeclaration(programNode);
	const fixes: TSESLint.RuleFix[] = [];

	const moduleSpecifiers: string[] = [...importsByModule.keys()];

	for (
		let moduleIndex = 0;
		moduleIndex < moduleSpecifiers.length;
		moduleIndex++
	) {
		const moduleSpecifier: string = moduleSpecifiers[moduleIndex];
		const names: Set<string> | undefined = importsByModule.get(moduleSpecifier);

		if (
			names === undefined
		) {
			continue;
		}

		const sortedNames: string[] = [...names].sort();
		const existingImport: TSESTree.ImportDeclaration | undefined = importDeclarations.get(moduleSpecifier);

		const fix: TSESLint.RuleFix | undefined = buildSingleModuleFix({
			fixer,
			existingImport,
			lastImport,
			moduleSpecifier,
			sortedNames,
		});

		if (
			fix !== undefined
		) {
			fixes.push(fix);
		}
	}

	return fixes;
}

/**
 * Resolve identifiers to their source modules using the TypeScript program's
 * type checker, collecting existing imports from the file first.
 *
 * @param {ResolveImportsByModuleParams} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<string, unknown[]>>} params.context - The ESLint rule context.
 * @param {TSESTree.Node} params.inferenceNode - The node being annotated.
 * @param {string[]} params.identifiers - The candidate type-identifier names.
 * @returns {ModuleNamesMap} A map from module specifier to the set of names to import.
 */
function resolveImportsByModule(
	params: ResolveImportsByModuleParams,
): ModuleNamesMap {
	const {
		context,
		inferenceNode,
		identifiers,
	}: ResolveImportsByModuleParams = params;

	const services: ParserServicesWithTypeInformation = ESLintUtils.getParserServices(context);
	const program: ts.Program = services.program;
	const checker: ts.TypeChecker = program.getTypeChecker();
	const programNode: TSESTree.Program = context.sourceCode.ast;
	const tsNode: ts.Node = services.esTreeNodeToTSNodeMap.get(inferenceNode);
	const currentSourceFile: ts.SourceFile = tsNode.getSourceFile();

	const existingTypeImports: ModuleNamesMap = collectExistingTypeImports(programNode);
	const alreadyImportedNames: Set<string> = collectAllImportedNames(programNode);

	const importsByModule: ModuleNamesMap = resolveIdentifiersToModules({
		checker,
		program,
		currentSourceFile,
		identifiers,
		alreadyImportedNames,
		existingTypeImports,
	});

	return importsByModule;
}

/**
 * Build a single fixer operation for one module's import. Appends to an
 * existing type import when possible; otherwise inserts a new declaration
 * after the last import (or at the top of the file).
 *
 * @param {BuildSingleModuleFixParams} params - The parameters object.
 * @param {TSESLint.RuleFixer} params.fixer - The ESLint fixer.
 * @param {TSESTree.ImportDeclaration | undefined} params.existingImport - An existing import from the same module.
 * @param {TSESTree.ImportDeclaration | undefined} params.lastImport - The last import declaration in the file.
 * @param {string} params.moduleSpecifier - The module specifier string.
 * @param {string[]} params.sortedNames - The sorted names to import.
 * @returns {TSESLint.RuleFix | undefined} The fixer operation, or `undefined` when no fix applies.
 */
function buildSingleModuleFix(
	params: BuildSingleModuleFixParams,
): TSESLint.RuleFix | undefined {
	const {
		fixer,
		existingImport,
		lastImport,
		moduleSpecifier,
		sortedNames,
	}: BuildSingleModuleFixParams = params;

	const canAppend: boolean = canAppendToExistingImport(
		existingImport,
	);
	if (
		canAppend
	) {
		const lastSpecifier: TSESTree.ImportClause = existingImport!.specifiers[existingImport!.specifiers.length - 1];
		const specifiersText = `, ${sortedNames.join(", ")}`;
		const appendFix: TSESLint.RuleFix = fixer.insertTextAfter(
			lastSpecifier,
			specifiersText,
		);
		return appendFix;
	}

	const importStatement = `import type { ${sortedNames.join(", ")} } from "${moduleSpecifier}";`;

	if (
		lastImport !== undefined
	) {
		const insertFix: TSESLint.RuleFix = fixer.insertTextAfter(
			lastImport,
			`\n${importStatement}`,
		);
		return insertFix;
	}

	const topFix: TSESLint.RuleFix = fixer.insertTextAfterRange(
		[0, 0],
		`${importStatement}\n\n`,
	);

	return topFix;
}

/**
 * Check whether new specifiers can be appended to an existing type import
 * declaration from the same module.
 *
 * @param {TSESTree.ImportDeclaration | undefined} existingImport - The existing import declaration.
 * @returns {boolean} `true` when the import is a type import with at least one specifier.
 */
function canAppendToExistingImport(
	existingImport: TSESTree.ImportDeclaration | undefined,
): boolean {
	let canAppend = false;

	if (
		existingImport !== undefined
	) {
		const isTypeKind: boolean = existingImport.importKind === "type";
		const hasSpecifiers: boolean = existingImport.specifiers.length > 0;
		canAppend = (
			isTypeKind
			&& hasSpecifiers
		);
	}

	return canAppend;
}

export {
	buildInferredTypeAnnotationFixes,
	buildImportTypeFixes,
};
