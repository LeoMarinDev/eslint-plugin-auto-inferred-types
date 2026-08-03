import {
	AST_NODE_TYPES,
	ESLintUtils,
} from "@typescript-eslint/utils";
import ts from "typescript";


import {
	resolveAliasedSymbol,
} from "@utils/symbol-resolution";

import type {
	GetInferredTypeTextParams,
	QualifyKnownGlobalTypeParams,
	TypeContainsErrorParams,
	WidenLiteralTypeAnnotationParams,
} from "@types-internal/utils/type-imports-types";
import type {
	ParserServicesWithTypeInformation,
	TSESTree,
} from "@typescript-eslint/utils";



/**
 * Get the TypeScript-inferred type text for a node. This is the annotation
 * string that will be inserted (e.g. `Article[]`, `PaginatedDocs<Article>`,
 * `string`).
 *
 * Skips `any`, `never`, error types, `void`, and empty text. Gates `null`
 * to `const`-only bindings via `isConstVariableDeclarationInitializer` so
 * that `let x = null` is not unsoundly narrowed. Widens literal types to
 * their primitive counterparts (`42` -> `number`).
 *
 * @param {GetInferredTypeTextParams} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<string, unknown[]>>} params.context - The ESLint rule context.
 * @param {TSESTree.Node} params.inferenceNode - The node whose inferred type will be extracted.
 * @returns {string | undefined} The annotation string, or `undefined` when inference is not applicable.
 */
function getInferredTypeText(
	params: GetInferredTypeTextParams,
): string | undefined {
	const {
		context,
		inferenceNode,
	}: GetInferredTypeTextParams = params;

	const services: ParserServicesWithTypeInformation = ESLintUtils.getParserServices(context);
	const checker: ts.TypeChecker = services.program.getTypeChecker();
	const type: ts.Type = services.getTypeAtLocation(inferenceNode);

	const isAnyType: boolean = (type.flags & ts.TypeFlags.Any) !== 0;
	if (
		isAnyType
	) {
		const skippedAny = undefined;
		return skippedAny;
	}

	const isNeverType: boolean = (type.flags & ts.TypeFlags.Never) !== 0;
	if (
		isNeverType
	) {
		const skippedNever = undefined;
		return skippedNever;
	}

	const hasError: boolean = typeContainsError({
		type,
		checker,
	});
	if (
		hasError
	) {
		const skippedError = undefined;
		return skippedError;
	}

	const tsNode: ts.Node = services.esTreeNodeToTSNodeMap.get(inferenceNode);
	const formatFlags: ts.TypeFormatFlags = (
		ts.TypeFormatFlags.NoTruncation
		| ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
	);
	const rawTypeText: string = checker.typeToString(
		type,
		tsNode,
		formatFlags,
	);
	const typeText: string = rawTypeText.trim();

	const isEmptyOrVoid: boolean = (
		typeText.length === 0
		|| typeText === "void"
	);
	if (
		isEmptyOrVoid
	) {
		const skippedVoid = undefined;
		return skippedVoid;
	}

	const isErrorLike: boolean = (
		typeText.includes("error")
		|| typeText === "never[]"
		|| typeText === "never"
	);
	if (
		isErrorLike
	) {
		const skippedErrorLike = undefined;
		return skippedErrorLike;
	}

	if (
		typeText === "null"
	) {
		const isConstInitializer: boolean = isConstVariableDeclarationInitializer(inferenceNode);
		if (
			isConstInitializer === false
		) {
			const skippedNullLet = undefined;
			return skippedNullLet;
		}
	}

	const widened: string = widenLiteralTypeAnnotation({
		type,
		checker,
		typeText,
	});

	return widened;
}

/**
 * Determine whether the given inference node is the initializer of a
 * `const` variable declaration. This gates `null`-type annotations:
 * `const x = null` is safe to annotate as `: null` (the binding can never
 * be reassigned), but `let x = null` would be unsoundly narrowed.
 *
 * @param {TSESTree.Node} inferenceNode - The node to inspect.
 * @returns {boolean} `true` when the node is a `const` variable initializer, otherwise `false`.
 */
function isConstVariableDeclarationInitializer(
	inferenceNode: TSESTree.Node,
): boolean {
	const declarator: TSESTree.Node | undefined = inferenceNode.parent;

	if (
		declarator?.type !== AST_NODE_TYPES.VariableDeclarator
	) {
		const notDeclarator = false;
		return notDeclarator;
	}

	const variableDeclarator: TSESTree.VariableDeclarator = declarator;
	const declaration: TSESTree.VariableDeclaration = variableDeclarator.parent;
	const isConst: boolean = declaration.kind === "const";

	return isConst;
}

/**
 * Widen literal types to their primitive counterparts so the annotation
 * reads `: string` instead of `: "hello"`. Handles unions of all-string,
 * all-number, and all-boolean literals. Falls through to
 * `qualifyKnownGlobalType` for non-literal types.
 *
 * @param {WidenLiteralTypeAnnotationParams} params - The parameters object.
 * @param {ts.Type} params.type - The TypeScript type to widen.
 * @param {ts.TypeChecker} params.checker - The type checker for symbol resolution.
 * @param {string} params.typeText - The current type text.
 * @returns {string} The widened type text, or the qualified global type text.
 */
function widenLiteralTypeAnnotation(
	params: WidenLiteralTypeAnnotationParams,
): string {
	const {
		type,
		checker,
		typeText,
	}: WidenLiteralTypeAnnotationParams = params;

	const isStringLiteral: boolean = (type.flags & ts.TypeFlags.StringLiteral) !== 0;
	if (
		isStringLiteral
	) {
		const widenedString = "string";
		return widenedString;
	}

	const isNumberLiteral: boolean = (type.flags & ts.TypeFlags.NumberLiteral) !== 0;
	if (
		isNumberLiteral
	) {
		const widenedNumber = "number";
		return widenedNumber;
	}

	const isBooleanLiteral: boolean = (type.flags & ts.TypeFlags.BooleanLiteral) !== 0;
	if (
		isBooleanLiteral
	) {
		const widenedBoolean = "boolean";
		return widenedBoolean;
	}

	const isUnion: boolean = (type.flags & ts.TypeFlags.Union) !== 0;
	if (
		isUnion
	) {
		const unionType: ts.UnionType = type as ts.UnionType;
		const widened: string | undefined = widenUnionLiteralType(
			unionType,
		);
		if (
			widened !== undefined
		) {
			return widened;
		}
	}

	const qualified: string = qualifyKnownGlobalType({
		type,
		typeText,
		checker,
	});

	return qualified;
}

/**
 * Check whether all constituent types of a union are the same literal kind
 * and return the widened primitive name if so.
 *
 * @param {ts.UnionType} unionType - The union type to inspect.
 * @returns {string | undefined} The widened primitive name, or `undefined` when the union is mixed.
 */
function widenUnionLiteralType(
	unionType: ts.UnionType,
): string | undefined {
	const constituentTypes: readonly ts.Type[] = unionType.types;

	const allStringLiterals: boolean = constituentTypes.every(
		(constituent: ts.Type): boolean => {
			const isStringLiteral: boolean = (
				(constituent.flags & ts.TypeFlags.StringLiteral) !== 0
			);
			return isStringLiteral;
		},
	);
	if (
		allStringLiterals
	) {
		const widened = "string";
		return widened;
	}

	const allNumberLiterals: boolean = constituentTypes.every(
		(constituent: ts.Type): boolean => {
			const isNumberLiteral: boolean = (
				(constituent.flags & ts.TypeFlags.NumberLiteral) !== 0
			);
			return isNumberLiteral;
		},
	);
	if (
		allNumberLiterals
	) {
		const widened = "number";
		return widened;
	}

	const allBooleanLiterals: boolean = constituentTypes.every(
		(constituent: ts.Type): boolean => {
			const isBooleanLiteral: boolean = (
				(constituent.flags & ts.TypeFlags.BooleanLiteral) !== 0
			);
			return isBooleanLiteral;
		},
	);
	if (
		allBooleanLiterals
	) {
		const widened = "boolean";
		return widened;
	}

	const notUniform = undefined;
	return notUniform;
}

/**
 * Prefer `React.*` qualified names for DefinitelyTyped React exports.
 * Also qualifies the `JSX` namespace as `React.JSX` since `@types/react`
 * defines it inside the React namespace.
 *
 * @param {QualifyKnownGlobalTypeParams} params - The parameters object.
 * @param {ts.Type} params.type - The TypeScript type to qualify.
 * @param {string} params.typeText - The current type text.
 * @param {ts.TypeChecker} params.checker - The type checker for resolving aliased symbols.
 * @returns {string} The qualified type text, or the original if no qualification applies.
 */
function qualifyKnownGlobalType(
	params: QualifyKnownGlobalTypeParams,
): string {
	const {
		type,
		typeText,
		checker,
	}: QualifyKnownGlobalTypeParams = params;

	const symbol: ts.Symbol | undefined = type.aliasSymbol ?? type.getSymbol();

	if (
		symbol === undefined
	) {
		return typeText;
	}

	const resolvedSymbol: ts.Symbol = resolveAliasedSymbol({
		symbol,
		checker,
	});
	const declarations: readonly ts.Declaration[] | undefined = resolvedSymbol.declarations;

	if (
		declarations === undefined
		|| declarations.length === 0
	) {
		return typeText;
	}

	const declaration: ts.Declaration = declarations[0];
	const declarationFile: string = declaration.getSourceFile().fileName.replace(/\\/g, "/");

	const isReactTypes: boolean = declarationFile.includes("node_modules/@types/react/");
	const isUnqualified: boolean = (
		!typeText.includes(".")
		&& typeText !== "React"
	);

	if (
		isReactTypes
		&& isUnqualified
	) {
		const qualified = `React.${typeText}`;
		return qualified;
	}

	const isJsxPrefixed: boolean = typeText.startsWith("JSX.");
	if (
		isJsxPrefixed
		&& isReactTypes
	) {
		const qualified = `React.${typeText}`;
		return qualified;
	}

	return typeText;
}

/**
 * Check if a type has error flags: the `Any` flag, or a resolved symbol
 * with no declarations.
 *
 * @param {TypeContainsErrorParams} params - The parameters object.
 * @param {ts.Type} params.type - The TypeScript type to check.
 * @param {ts.TypeChecker} params.checker - The type checker for resolving aliased symbols.
 * @returns {boolean} `true` when the type contains an error, otherwise `false`.
 */
function typeContainsError(
	params: TypeContainsErrorParams,
): boolean {
	const {
		type,
		checker,
	}: TypeContainsErrorParams = params;

	const isAnyType: boolean = (type.flags & ts.TypeFlags.Any) !== 0;
	if (
		isAnyType
	) {
		const hasError = true;
		return hasError;
	}

	const symbol: ts.Symbol | undefined = type.aliasSymbol ?? type.getSymbol();

	if (
		symbol === undefined
	) {
		const noError = false;
		return noError;
	}

	const resolvedSymbol: ts.Symbol = resolveAliasedSymbol({
		symbol,
		checker,
	});
	const declarations: readonly ts.Declaration[] | undefined = resolvedSymbol.declarations;

	if (
		declarations === undefined
		|| declarations.length === 0
	) {
		const hasError = true;
		return hasError;
	}

	const noError = false;
	return noError;
}

export {
	getInferredTypeText,
	isConstVariableDeclarationInitializer,
	widenLiteralTypeAnnotation,
	qualifyKnownGlobalType,
	typeContainsError,
};
