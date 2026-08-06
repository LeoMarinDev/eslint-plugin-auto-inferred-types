import {
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";

import type {
	IsVariableDeclarationIgnoreFunctionParams,
	ResolvedAnnotationTarget,
	ResolveAnnotationTargetParams,
} from "@types-internal/utils/typedef-shared-types";
import type {
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * Returns the textual name when the given node is an `Identifier`, otherwise `undefined`.
 *
 * @param {TSESTree.Node} node - The AST node to inspect. May be any `TSESTree.Node`.
 * @returns {string | undefined} The identifier name, or `undefined` when the node is not an `Identifier`.
 */
function getNodeName(
	node: TSESTree.Node,
): string | undefined {
	let name: string | undefined;

	if (
		node.type === AST_NODE_TYPES.Identifier
	) {
		const identifier: TSESTree.Identifier = node;
		name = identifier.name;
	}

	return name;
}

/**
 * Walks the parent chain to determine whether the given destructuring pattern
 * appears inside a `for...of` statement. Returns `true` as soon as a
 * `ForOfStatement` ancestor is encountered; returns `false` when an ancestor
 * type outside the destructuring chain is reached or when the walk reaches the
 * program root.
 *
 * @param {TSESTree.ArrayPattern | TSESTree.ObjectPattern} node - The destructuring pattern to inspect.
 * @returns {boolean} `true` when the pattern is in a `for...of` context, otherwise `false`.
 */
function isForOfStatementContext(
	node: TSESTree.ArrayPattern | TSESTree.ObjectPattern,
): boolean {
	let current: TSESTree.Node = node.parent;

	let inForOf: boolean = false;

	while (
		current.type !== AST_NODE_TYPES.Program
	) {
		const isChainNode: boolean = (
			current.type === AST_NODE_TYPES.VariableDeclarator
			|| current.type === AST_NODE_TYPES.VariableDeclaration
			|| current.type === AST_NODE_TYPES.ObjectPattern
			|| current.type === AST_NODE_TYPES.ArrayPattern
			|| current.type === AST_NODE_TYPES.Property
		);

		if (
			isChainNode === true
		) {
			current = current.parent;
			continue;
		}

		if (
			current.type === AST_NODE_TYPES.ForOfStatement
		) {
			inForOf = true;
		}

		break;
	}

	return inForOf;
}

/**
 * Walks the parent chain to check whether any ancestor `ObjectPattern` or
 * `ArrayPattern` already carries a `typeAnnotation`. Returns `true` as soon as
 * one is found, otherwise `false`.
 *
 * @param {TSESTree.ArrayPattern | TSESTree.ObjectPattern} node - The destructuring pattern to inspect.
 * @returns {boolean} `true` when an ancestor pattern already has a type annotation, otherwise `false`.
 */
function isAncestorHasTypeAnnotation(
	node: TSESTree.ArrayPattern | TSESTree.ObjectPattern,
): boolean {
	let ancestor: TSESTree.Node = node.parent;

	let hasAnnotation: boolean = false;

	while (
		ancestor.type !== AST_NODE_TYPES.Program
	) {
		const isPatternNode: boolean = (
			ancestor.type === AST_NODE_TYPES.ObjectPattern
			|| ancestor.type === AST_NODE_TYPES.ArrayPattern
		);

		if (
			isPatternNode === true
		) {
			const patternAncestor: TSESTree.ObjectPattern | TSESTree.ArrayPattern = (
				ancestor as TSESTree.ObjectPattern | TSESTree.ArrayPattern
			);
			if (
				patternAncestor.typeAnnotation !== undefined
			) {
				hasAnnotation = true;
				break;
			}
		}

		ancestor = ancestor.parent;
	}

	return hasAnnotation;
}

/**
 * Returns `true` when the `variableDeclarationIgnoreFunction` option is enabled
 * and the given node is an `ArrowFunctionExpression` or `FunctionExpression`.
 *
 * @param {IsVariableDeclarationIgnoreFunctionParams} params - The parameters object.
 * @param {TSESTree.Node | undefined} params.node - The initializer node to inspect, or `undefined`.
 * @param {boolean} params.variableDeclarationIgnoreFunction - Whether the matching rule option is enabled.
 * @returns {boolean} `true` when the node should be ignored as a function initializer, otherwise `false`.
 */
function isVariableDeclarationIgnoreFunction(
	params: IsVariableDeclarationIgnoreFunctionParams,
): boolean {
	const {
		node,
		variableDeclarationIgnoreFunction,
	}: IsVariableDeclarationIgnoreFunctionParams = params;

	let isIgnore: boolean = false;

	if (
		variableDeclarationIgnoreFunction === true
		&& node !== undefined
	) {
		const isFunction: boolean = (
			node.type === AST_NODE_TYPES.ArrowFunctionExpression
			|| node.type === AST_NODE_TYPES.FunctionExpression
		);
		isIgnore = isFunction;
	}

	return isIgnore;
}

/**
 * Returns `true` when the given node is a `TSAsExpression` (`as` assertion,
 * most commonly `as const`).
 *
 * An `as` assertion is an explicit type the author has already declared, so
 * the `typedef` rule must not report or annotate the binding - inferring or
 * widening would contradict the assertion.
 *
 * @param {TSESTree.Node | undefined} node - The initializer node to inspect, or `undefined`.
 * @returns {boolean} `true` when the node is a `TSAsExpression`, otherwise `false`.
 */
function isAsExpressionInitializer(
	node: TSESTree.Node | undefined,
): boolean {
	if (
		node === undefined
	) {
		const isNotExpression: boolean = false;
		return isNotExpression;
	}

	const isAsExpression: boolean = (
		node.type === AST_NODE_TYPES.TSAsExpression
	);
	return isAsExpression;
}

/**
 * Resolves the node whose TypeScript-inferred type should drive an annotation
 * for a function parameter. For an `AssignmentPattern` (default value) the
 * initializer (`right`) is the inference source. For a `TSParameterProperty`
 * whose parameter is an `AssignmentPattern`, the nested initializer is the
 * inference source. Otherwise there is no inference node and `undefined` is
 * returned.
 *
 * @param {TSESTree.Node} node - The parameter node to inspect.
 * @returns {TSESTree.Node | undefined} The inference node, or `undefined` when none applies.
 */
function getInferenceNodeForParameter(
	node: TSESTree.Node,
): TSESTree.Node | undefined {
	let inferenceNode: TSESTree.Node | undefined;

	if (
		node.type === AST_NODE_TYPES.AssignmentPattern
	) {
		const assignmentPattern: TSESTree.AssignmentPattern = node;
		inferenceNode = assignmentPattern.right;
		return inferenceNode;
	}

	if (
		node.type === AST_NODE_TYPES.TSParameterProperty
	) {
		const parameterProperty: TSESTree.TSParameterProperty = node;
		if (
			parameterProperty.parameter.type === AST_NODE_TYPES.AssignmentPattern
		) {
			const nestedAssignment: TSESTree.AssignmentPattern = parameterProperty.parameter;
			inferenceNode = nestedAssignment.right;
		}
		return inferenceNode;
	}

	return inferenceNode;
}

/**
 * Resolves the annotation target and inference node pair that the `typedef`
 * rule fixer should use. Returns `undefined` when `inferenceNode` is falsy or
 * when `annotationTarget` is not a supported node type.
 *
 * @param {ResolveAnnotationTargetParams} params - The parameters object.
 * @param {TSESTree.Node} params.annotationTarget - The candidate node to annotate.
 * @param {TSESTree.Node | undefined} params.inferenceNode - The node whose inferred type will be inserted, or `undefined`.
 * @returns {ResolvedAnnotationTarget | undefined} The resolved pair, or `undefined` when no annotation applies.
 */
function resolveAnnotationTarget(
	params: ResolveAnnotationTargetParams,
): ResolvedAnnotationTarget | undefined {
	const {
		annotationTarget,
		inferenceNode,
	}: ResolveAnnotationTargetParams = params;

	let resolved: ResolvedAnnotationTarget | undefined;

	if (
		inferenceNode === undefined
	) {
		return resolved;
	}

	if (
		annotationTarget.type === AST_NODE_TYPES.AssignmentPattern
	) {
		const assignmentTarget: TSESTree.AssignmentPattern = annotationTarget;
		if (
			assignmentTarget.left.type === AST_NODE_TYPES.Identifier
		) {
			const leftIdentifier: TSESTree.Identifier = assignmentTarget.left;
			const pair: ResolvedAnnotationTarget = {
				annotationTarget: leftIdentifier,
				inferenceNode,
			};
			resolved = pair;
			return resolved;
		}
		return resolved;
	}

	if (
		annotationTarget.type === AST_NODE_TYPES.Identifier
	) {
		const identifierTarget: TSESTree.Identifier = annotationTarget;
		const pair: ResolvedAnnotationTarget = {
			annotationTarget: identifierTarget,
			inferenceNode,
		};
		resolved = pair;
		return resolved;
	}

	if (
		annotationTarget.type === AST_NODE_TYPES.ArrayPattern
		|| annotationTarget.type === AST_NODE_TYPES.ObjectPattern
	) {
		const patternTarget: TSESTree.ArrayPattern | TSESTree.ObjectPattern = (
			annotationTarget
		);
		const pair: ResolvedAnnotationTarget = {
			annotationTarget: patternTarget,
			inferenceNode,
		};
		resolved = pair;
		return resolved;
	}

	return resolved;
}

export {
	getNodeName,
	isAncestorHasTypeAnnotation,
	isAsExpressionInitializer,
	isForOfStatementContext,
	isVariableDeclarationIgnoreFunction,
	getInferenceNodeForParameter,
	resolveAnnotationTarget,
};
