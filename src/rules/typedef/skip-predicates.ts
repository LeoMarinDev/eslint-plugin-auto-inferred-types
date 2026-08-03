import {
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";

import {
	isAncestorHasTypeAnnotation,
	isForOfStatementContext,
	isVariableDeclarationIgnoreFunction,
} from "@utils/typedef-shared";

import type {
	ShouldSkipPropertyDefinitionParams,
	ShouldSkipVariableDeclaratorParams,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * Determines whether the `VariableDeclarator` node is inside a `for...of` or
 * `for...in` statement by walking the parent chain. Returns `true` as soon as
 * either statement type is encountered, otherwise `false` when the chain
 * exits the variable declaration scope.
 *
 * @param {TSESTree.VariableDeclarator} node - The variable declarator to inspect.
 * @returns {boolean} `true` when the declarator is in a `for...of` or `for...in` context.
 */
function isVariableDeclaratorInLoop(
	node: TSESTree.VariableDeclarator,
): boolean {
	let current: TSESTree.Node = node.parent;

	while (
		current.type !== AST_NODE_TYPES.Program
	) {
		if (
			current.type === AST_NODE_TYPES.VariableDeclaration
		) {
			current = current.parent;
			continue;
		}

		if (
			current.type === AST_NODE_TYPES.ForOfStatement
			|| current.type === AST_NODE_TYPES.ForInStatement
		) {
			const inLoop = true;
			return inLoop;
		}

		const notInLoop = false;
		return notInLoop;
	}

	const notInLoop = false;
	return notInLoop;
}

/**
 * Evaluates whether a `VariableDeclarator` should be skipped by the rule.
 *
 * @param {ShouldSkipVariableDeclaratorParams} params - The parameters object.
 * @param {TSESTree.VariableDeclarator} params.node - The variable declarator to inspect.
 * @param {boolean} params.variableDeclaration - Whether the variableDeclaration option is enabled.
 * @param {boolean} params.arrayDestructuring - Whether the arrayDestructuring option is enabled.
 * @param {boolean} params.objectDestructuring - Whether the objectDestructuring option is enabled.
 * @param {boolean} params.variableDeclarationIgnoreFunction - Whether function initializers are ignored.
 * @returns {boolean} `true` when the declarator should be skipped, otherwise `false`.
 */
function shouldSkipVariableDeclarator(
	params: ShouldSkipVariableDeclaratorParams,
): boolean {
	const {
		node,
		variableDeclaration,
		arrayDestructuring,
		objectDestructuring,
		variableDeclarationIgnoreFunction,
	}: ShouldSkipVariableDeclaratorParams = params;

	if (
		variableDeclaration === false
	) {
		const skip = true;
		return skip;
	}

	const hasTypeAnnotation: boolean = node.id.typeAnnotation !== undefined;

	if (
		hasTypeAnnotation === true
	) {
		const skip = true;
		return skip;
	}

	const isArrayPattern: boolean = (
		node.id.type === AST_NODE_TYPES.ArrayPattern
		&& arrayDestructuring === false
	);

	if (
		isArrayPattern === true
	) {
		const skip = true;
		return skip;
	}

	const isObjectPattern: boolean = (
		node.id.type === AST_NODE_TYPES.ObjectPattern
		&& objectDestructuring === false
	);

	if (
		isObjectPattern === true
	) {
		const skip = true;
		return skip;
	}

	const isFunctionInitializer: boolean = isVariableDeclarationIgnoreFunction({
		node: node.init ?? undefined,
		variableDeclarationIgnoreFunction,
	});

	if (
		isFunctionInitializer === true
	) {
		const skip = true;
		return skip;
	}

	const skip = false;
	return skip;
}

/**
 * Evaluates whether an `ArrayPattern` should be skipped by the rule.
 *
 * @param {TSESTree.ArrayPattern} node - The array pattern to inspect.
 * @returns {boolean} `true` when the pattern should be skipped, otherwise `false`.
 */
function shouldSkipArrayPattern(
	node: TSESTree.ArrayPattern,
): boolean {
	if (
		node.parent.type === AST_NODE_TYPES.RestElement
		&& node.parent.typeAnnotation !== undefined
	) {
		const skip = true;
		return skip;
	}

	if (
		node.typeAnnotation !== undefined
		|| isForOfStatementContext(node) === true
		|| isAncestorHasTypeAnnotation(node) === true
		|| node.parent.type === AST_NODE_TYPES.AssignmentExpression
	) {
		const skip = true;
		return skip;
	}

	const skip = false;
	return skip;
}

/**
 * Evaluates whether a `PropertyDefinition` should be skipped by the rule.
 *
 * @param {ShouldSkipPropertyDefinitionParams} params - The parameters object.
 * @param {TSESTree.PropertyDefinition} params.node - The property definition to inspect.
 * @param {boolean} params.variableDeclarationIgnoreFunction - Whether function initializers are ignored.
 * @returns {boolean} `true` when the property definition should be skipped, otherwise `false`.
 */
function shouldSkipPropertyDefinition(
	params: ShouldSkipPropertyDefinitionParams,
): boolean {
	const {
		node,
		variableDeclarationIgnoreFunction,
	}: ShouldSkipPropertyDefinitionParams = params;

	const isFunctionValue: boolean = isVariableDeclarationIgnoreFunction({
		node: node.value ?? undefined,
		variableDeclarationIgnoreFunction,
	});

	if (
		isFunctionValue === true
		|| node.typeAnnotation !== undefined
	) {
		const skip = true;
		return skip;
	}

	const skip = false;
	return skip;
}

/**
 * Evaluates whether an `ObjectPattern` should be skipped by the rule.
 *
 * @param {TSESTree.ObjectPattern} node - The object pattern to inspect.
 * @returns {boolean} `true` when the pattern should be skipped, otherwise `false`.
 */
function shouldSkipObjectPattern(
	node: TSESTree.ObjectPattern,
): boolean {
	if (
		node.typeAnnotation !== undefined
		|| isForOfStatementContext(node) === true
		|| isAncestorHasTypeAnnotation(node) === true
	) {
		const skip = true;
		return skip;
	}

	const skip = false;
	return skip;
}

export {
	isVariableDeclaratorInLoop,
	shouldSkipVariableDeclarator,
	shouldSkipArrayPattern,
	shouldSkipPropertyDefinition,
	shouldSkipObjectPattern,
};
