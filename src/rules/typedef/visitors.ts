import {
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";

import {
	checkParameters,
} from "@rules/typedef/parameter-logic";
import {
	reportMissingAnnotation,
} from "@rules/typedef/report";
import {
	isVariableDeclaratorInLoop,
	shouldSkipArrayPattern,
	shouldSkipObjectPattern,
	shouldSkipPropertyDefinition,
	shouldSkipVariableDeclarator,
} from "@rules/typedef/skip-predicates";
import {
	getNodeName,
} from "@utils/typedef-shared";

import type {
	VisitParams,
	TypedefRuleContext,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * `VariableDeclarator` visitor. Reports a missing type annotation on the
 * declarator id unless a skip predicate or a loop context excludes it.
 *
 * @param {VisitParams<TSESTree.VariableDeclarator>} params - The parameters object.
 * @param {TSESTree.VariableDeclarator} params.node - The variable declarator to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitVariableDeclarator(
	params: VisitParams<TSESTree.VariableDeclarator>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.VariableDeclarator> = params;
	const {
		options,
	}: TypedefRuleContext = ruleContext;

	const shouldSkip: boolean = shouldSkipVariableDeclarator({
		node,
		variableDeclaration: options.variableDeclaration,
		arrayDestructuring: options.arrayDestructuring,
		objectDestructuring: options.objectDestructuring,
		variableDeclarationIgnoreFunction: options.variableDeclarationIgnoreFunction,
	});

	if (
		shouldSkip === true
	) {
		return;
	}

	const inLoop: boolean = isVariableDeclaratorInLoop(
		node,
	);

	if (
		inLoop === true
	) {
		return;
	}

	const inferenceNode: TSESTree.Node | undefined = (
		node.init ?? undefined
	);

	reportMissingAnnotation({
		ruleContext,
		location: node,
		annotationTarget: node.id,
		inferenceNode,
		name: getNodeName(node.id),
	});
}

/**
 * `ArrayPattern` visitor. Reports a missing type annotation on the pattern
 * unless a skip predicate excludes it. Resolves the inference node from the
 * enclosing `VariableDeclarator` when present.
 *
 * @param {VisitParams<TSESTree.ArrayPattern>} params - The parameters object.
 * @param {TSESTree.ArrayPattern} params.node - The array pattern to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitArrayPattern(
	params: VisitParams<TSESTree.ArrayPattern>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.ArrayPattern> = params;

	const shouldSkip: boolean = shouldSkipArrayPattern(
		node,
	);

	if (
		shouldSkip === true
	) {
		return;
	}

	const declarator: TSESTree.VariableDeclarator | undefined = (
		node.parent.type === AST_NODE_TYPES.VariableDeclarator
			? node.parent
			: undefined
	);

	const inferenceNode: TSESTree.Node | undefined = (
		declarator !== undefined
			? declarator.init ?? undefined
			: undefined
	);

	reportMissingAnnotation({
		ruleContext,
		location: node,
		annotationTarget: node,
		inferenceNode,
		name: undefined,
	});
}

/**
 * `ArrowFunctionExpression` visitor. Delegates to `checkParameters` to
 * report missing annotations on every arrow-function parameter.
 *
 * @param {VisitParams<TSESTree.ArrowFunctionExpression>} params - The parameters object.
 * @param {TSESTree.ArrowFunctionExpression} params.node - The arrow function to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitArrowFunctionExpression(
	params: VisitParams<TSESTree.ArrowFunctionExpression>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.ArrowFunctionExpression> = params;

	checkParameters({
		ruleContext,
		params: node.params,
	});
}

/**
 * `PropertyDefinition` visitor. Reports a missing type annotation on the
 * class property unless a skip predicate excludes it.
 *
 * @param {VisitParams<TSESTree.PropertyDefinition>} params - The parameters object.
 * @param {TSESTree.PropertyDefinition} params.node - The property definition to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitPropertyDefinition(
	params: VisitParams<TSESTree.PropertyDefinition>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.PropertyDefinition> = params;
	const {
		options,
	}: TypedefRuleContext = ruleContext;

	const shouldSkip: boolean = shouldSkipPropertyDefinition({
		node,
		variableDeclarationIgnoreFunction: options.variableDeclarationIgnoreFunction,
	});

	if (
		shouldSkip === true
	) {
		return;
	}

	const annotationTarget: TSESTree.Node = (
		node.key.type === AST_NODE_TYPES.Identifier
			? node.key
			: node
	);

	const name: string | undefined = (
		node.key.type === AST_NODE_TYPES.Identifier
			? node.key.name
			: undefined
	);

	const inferenceNode: TSESTree.Node | undefined = (
		node.value ?? undefined
	);

	reportMissingAnnotation({
		ruleContext,
		location: node,
		annotationTarget,
		inferenceNode,
		name,
	});
}

/**
 * Shared visitor for `FunctionDeclaration` and `FunctionExpression` nodes.
 * Delegates to `checkParameters` to report missing annotations on every
 * function parameter.
 *
 * @param {VisitParams<TSESTree.FunctionDeclaration | TSESTree.FunctionExpression>} params - The parameters object.
 * @param {TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} params.node - The function node to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitFunction(
	params: VisitParams<TSESTree.FunctionDeclaration | TSESTree.FunctionExpression>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.FunctionDeclaration | TSESTree.FunctionExpression> = params;

	checkParameters({
		ruleContext,
		params: node.params,
	});
}

/**
 * `ObjectPattern` visitor. Reports a missing type annotation on the pattern
 * unless a skip predicate excludes it. Resolves the inference node from the
 * enclosing `VariableDeclarator` when present.
 *
 * @param {VisitParams<TSESTree.ObjectPattern>} params - The parameters object.
 * @param {TSESTree.ObjectPattern} params.node - The object pattern to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitObjectPattern(
	params: VisitParams<TSESTree.ObjectPattern>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.ObjectPattern> = params;

	const shouldSkip: boolean = shouldSkipObjectPattern(
		node,
	);

	if (
		shouldSkip === true
	) {
		return;
	}

	const declarator: TSESTree.VariableDeclarator | undefined = (
		node.parent.type === AST_NODE_TYPES.VariableDeclarator
			? node.parent
			: undefined
	);

	const inferenceNode: TSESTree.Node | undefined = (
		declarator !== undefined
			? declarator.init ?? undefined
			: undefined
	);

	reportMissingAnnotation({
		ruleContext,
		location: node,
		annotationTarget: node,
		inferenceNode,
		name: undefined,
	});
}

/**
 * Shared visitor for `TSIndexSignature` and `TSPropertySignature` nodes.
 * Reports missing annotations on untyped property signatures.
 *
 * @param {VisitParams<TSESTree.TSIndexSignature | TSESTree.TSPropertySignature>} params - The parameters object.
 * @param {TSESTree.TSIndexSignature | TSESTree.TSPropertySignature} params.node - The signature node to inspect.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @returns {void}
 */
function visitPropertySignature(
	params: VisitParams<TSESTree.TSIndexSignature | TSESTree.TSPropertySignature>,
): void {
	const {
		node,
		ruleContext,
	}: VisitParams<TSESTree.TSIndexSignature | TSESTree.TSPropertySignature> = params;

	if (
		node.typeAnnotation !== undefined
	) {
		return;
	}

	const name: string | undefined = (
		node.type === AST_NODE_TYPES.TSPropertySignature
			? getNodeName(node.key)
			: undefined
	);

	reportMissingAnnotation({
		ruleContext,
		location: node,
		annotationTarget: node,
		inferenceNode: undefined,
		name,
	});
}

/**
 * Assembles the full `RuleListener` visitor map from the resolved rule
 * context. The `VariableDeclarator` visitor is always present; every other
 * visitor is registered only when its corresponding option is enabled.
 *
 * Visitor handlers are assigned to the `visitors` object via property
 * assignment (rather than inline object-literal methods) so the rule
 * context closure is captured without triggering the `naming-convention`
 * rule on the PascalCase ESLint node-type keys.
 *
 * @param {TypedefRuleContext} ruleContext - The bundled rule context and resolved options.
 * @returns {TSESLint.RuleListener} The assembled visitor map.
 */
function buildVisitors(
	ruleContext: TypedefRuleContext,
): TSESLint.RuleListener {
	const {
		options,
	}: TypedefRuleContext = ruleContext;

	const visitors: TSESLint.RuleListener = {};

	visitors.VariableDeclarator = (node: TSESTree.VariableDeclarator): void => {
		visitVariableDeclarator({
			node,
			ruleContext,
		});
	};

	if (
		options.arrayDestructuring === true
	) {
		visitors.ArrayPattern = (node: TSESTree.ArrayPattern): void => {
			visitArrayPattern({
				node,
				ruleContext,
			});
		};
	}

	if (
		options.arrowParameter === true
	) {
		visitors.ArrowFunctionExpression = (node: TSESTree.ArrowFunctionExpression): void => {
			visitArrowFunctionExpression({
				node,
				ruleContext,
			});
		};
	}

	if (
		options.memberVariableDeclaration === true
	) {
		visitors.PropertyDefinition = (node: TSESTree.PropertyDefinition): void => {
			visitPropertyDefinition({
				node,
				ruleContext,
			});
		};
	}

	if (
		options.parameter === true
	) {
		visitors.FunctionDeclaration = (node: TSESTree.FunctionDeclaration): void => {
			visitFunction({
				node,
				ruleContext,
			});
		};
		visitors.FunctionExpression = (node: TSESTree.FunctionExpression): void => {
			visitFunction({
				node,
				ruleContext,
			});
		};
	}

	if (
		options.objectDestructuring === true
	) {
		visitors.ObjectPattern = (node: TSESTree.ObjectPattern): void => {
			visitObjectPattern({
				node,
				ruleContext,
			});
		};
	}

	if (
		options.propertyDeclaration === true
	) {
		visitors.TSIndexSignature = (node: TSESTree.TSIndexSignature): void => {
			visitPropertySignature({
				node,
				ruleContext,
			});
		};
		visitors.TSPropertySignature = (node: TSESTree.TSPropertySignature): void => {
			visitPropertySignature({
				node,
				ruleContext,
			});
		};
	}

	return visitors;
}

export {
	buildVisitors,
	visitArrayPattern,
	visitArrowFunctionExpression,
	visitFunction,
	visitObjectPattern,
	visitPropertyDefinition,
	visitPropertySignature,
	visitVariableDeclarator,
};
