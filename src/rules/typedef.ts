import {
	AST_NODE_TYPES,
	ESLintUtils,
} from "@typescript-eslint/utils";


import {
	MAX_INFERRED_TYPE_LENGTH,
} from "@config/rules/typedef-limits";
import {
	DEFAULT_OPTIONS,
	OPTION_KEYS,
} from "@config/rules/typedef-options";


import {
	buildInferredTypeAnnotationFixes,
} from "@utils/import-fix-builder";
import {
	getInferenceNodeForParameter,
	getNodeName,
	isAncestorHasTypeAnnotation,
	isForOfStatementContext,
	isVariableDeclarationIgnoreFunction,
	resolveAnnotationTarget,
} from "@utils/typedef-shared";

import type {
	CheckParametersParams,
	ReportMissingAnnotationParams,
	TypedefMessageIds,
	TypedefRuleOptions,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	ResolvedAnnotationTarget,
} from "@types-internal/utils/typedef-shared-types";
import type {
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
	(name: string): string => `https://github.com/brainy-builds/eslint-plugin-auto-inferred-types/blob/main/docs/${name}.md`,
);

const TYPE_DEFINITION_SUGGESTION = "suggestion" as const;

const FIXABLE_CODE = "code" as const;

const ANNOTATION_SEPARATOR = ": ";

// Module-scope state set by `create` before visitors run. ESLint instantiates
// the rule per source file and calls `create` once before any visitor fires,
// so this single-slot state is safe within a single file traversal.
let activeContext: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> | undefined;
let activeOptions: TypedefRuleOptions | undefined;

/**
 * Returns the currently active rule context, set by `create` before visitors
 * run. Throws when the context has not been initialized.
 *
 * @returns {Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>} The active context.
 */
function getActiveContext(): Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> {
	if (
		activeContext === undefined
	) {
		const uninitializedError: Error = new Error(
			"typedef rule context accessed before create initialized it.",
		);
		throw uninitializedError;
	}

	return activeContext;
}

/**
 * Returns the currently active resolved options, set by `create` before
 * visitors run. Throws when the options have not been initialized.
 *
 * @returns {TypedefRuleOptions} The active options.
 */
function getActiveOptions(): TypedefRuleOptions {
	if (
		activeOptions === undefined
	) {
		const uninitializedError: Error = new Error(
			"typedef rule options accessed before create initialized them.",
		);
		throw uninitializedError;
	}

	return activeOptions;
}

/**
 * Reports a missing type annotation on the given location node and registers
 * an autofix that inserts the TypeScript-inferred type text plus any required
 * `import type` declarations.
 *
 * The fix is skipped when no inference node resolves, when the inferred type
 * text exceeds `MAX_INFERRED_TYPE_LENGTH`, or when the annotation target is
 * not a supported node type.
 *
 * @param {ReportMissingAnnotationParams} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>} params.context - The ESLint rule context.
 * @param {TSESTree.Node} params.location - The node reported as the error location.
 * @param {TSESTree.Node} params.annotationTarget - The node that should receive the annotation.
 * @param {TSESTree.Node | undefined} params.inferenceNode - The node whose inferred type drives the annotation, or `undefined`.
 * @param {string | undefined} params.name - The identifier name for the named message variant, or `undefined`.
 * @returns {void}
 */
function reportMissingAnnotation(
	params: ReportMissingAnnotationParams,
): void {
	const {
		context,
		location,
		annotationTarget,
		inferenceNode,
		name,
	}: ReportMissingAnnotationParams = params;

	const messageId: TypedefMessageIds = (
		name !== undefined
			? "expectedTypedefNamed"
			: "expectedTypedef"
	);

	const reportDescriptor: TSESLint.ReportDescriptor<TypedefMessageIds> = {
		node: location,
		messageId,
		data: {
			name,
		},
		fix(
			fixer: TSESLint.RuleFixer,
		): TSESLint.RuleFix[] | null {
			const resolved: ResolvedAnnotationTarget | undefined = resolveAnnotationTarget({
				annotationTarget,
				inferenceNode,
			});

			if (
				resolved === undefined
			) {
				const noFix = null;
				return noFix;
			}

			const inferredFix = buildInferredTypeAnnotationFixes({
				context,
				fixer,
				inferenceNode: resolved.inferenceNode,
			});

			if (
				inferredFix === undefined
				|| inferredFix.typeText.length > MAX_INFERRED_TYPE_LENGTH
			) {
				const noFix = null;
				return noFix;
			}

			const annotationText = `${ANNOTATION_SEPARATOR}${inferredFix.typeText}`;
			const annotationFix: TSESLint.RuleFix = fixer.insertTextAfter(
				resolved.annotationTarget,
				annotationText,
			);

			const fixes: TSESLint.RuleFix[] = [
				...inferredFix.importFixes,
				annotationFix,
			];

			return fixes;
		},
	};

	context.report(reportDescriptor);
}

/**
 * Checks an array of function parameters for missing type annotations and
 * reports each one. For `AssignmentPattern` parameters the annotation target
 * is the left binding; for `TSParameterProperty` parameters the nested
 * parameter is unwrapped first.
 *
 * @param {CheckParametersParams} params - The parameters object.
 * @param {Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>} params.context - The ESLint rule context.
 * @param {TSESTree.Parameter[]} params.params - The parameter nodes to check.
 * @returns {void}
 */
function checkParameters(
	params: CheckParametersParams,
): void {
	const {
		context,
		params: parameterList,
	}: CheckParametersParams = params;

	for (
		let paramIndex = 0;
		paramIndex < parameterList.length;
		paramIndex++
	) {
		const param: TSESTree.Parameter = parameterList[paramIndex];

		const annotationTarget: TSESTree.Node = resolveParameterAnnotationTarget(
			param,
		);

		const hasTypeAnnotation: boolean = parameterHasTypeAnnotation(
			annotationTarget,
		);

		if (
			hasTypeAnnotation === true
		) {
			continue;
		}

		const inferenceNode: TSESTree.Node | undefined = getInferenceNodeForParameter(
			param,
		);

		const name: string | undefined = getNodeName(
			annotationTarget,
		);

		reportMissingAnnotation({
			context,
			location: param,
			annotationTarget,
			inferenceNode,
			name,
		});
	}
}

/**
 * Resolves the annotation target node for a single parameter. For an
 * `AssignmentPattern` the left binding is the target. For a
 * `TSParameterProperty` the nested parameter is unwrapped, and if that nested
 * parameter is itself an `AssignmentPattern`, its left binding is the target.
 * For any other parameter type the parameter itself is the target.
 *
 * @param {TSESTree.Parameter} param - The parameter node to inspect.
 * @returns {TSESTree.Node} The node that should receive the type annotation.
 */
function resolveParameterAnnotationTarget(
	param: TSESTree.Parameter,
): TSESTree.Node {
	let annotationTarget: TSESTree.Node = param;

	if (
		param.type === AST_NODE_TYPES.AssignmentPattern
	) {
		const assignmentParam: TSESTree.AssignmentPattern = param;
		annotationTarget = assignmentParam.left;
		return annotationTarget;
	}

	if (
		param.type === AST_NODE_TYPES.TSParameterProperty
	) {
		const parameterProperty: TSESTree.TSParameterProperty = param;
		annotationTarget = parameterProperty.parameter;

		if (
			annotationTarget.type === AST_NODE_TYPES.AssignmentPattern
		) {
			const nestedAssignment: TSESTree.AssignmentPattern = annotationTarget;
			annotationTarget = nestedAssignment.left;
		}

		return annotationTarget;
	}

	return annotationTarget;
}

/**
 * Returns `true` when the annotation target already carries a type annotation.
 *
 * @param {TSESTree.Node} annotationTarget - The node to inspect.
 * @returns {boolean} `true` when a type annotation is present, otherwise `false`.
 */
function parameterHasTypeAnnotation(
	annotationTarget: TSESTree.Node,
): boolean {
	let hasAnnotation = false;

	if (
		annotationTarget.type === AST_NODE_TYPES.Identifier
	) {
		const identifier: TSESTree.Identifier = annotationTarget;
		hasAnnotation = identifier.typeAnnotation !== undefined;
	}

	return hasAnnotation;
}

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
 * @param {object} params - The parameters object.
 * @param {TSESTree.VariableDeclarator} params.node - The variable declarator to inspect.
 * @param {boolean} params.variableDeclaration - Whether the variableDeclaration option is enabled.
 * @param {boolean} params.arrayDestructuring - Whether the arrayDestructuring option is enabled.
 * @param {boolean} params.objectDestructuring - Whether the objectDestructuring option is enabled.
 * @param {boolean} params.variableDeclarationIgnoreFunction - Whether function initializers are ignored.
 * @returns {boolean} `true` when the declarator should be skipped, otherwise `false`.
 */
function shouldSkipVariableDeclarator(params: {
	node: TSESTree.VariableDeclarator;
	variableDeclaration: boolean;
	arrayDestructuring: boolean;
	objectDestructuring: boolean;
	variableDeclarationIgnoreFunction: boolean;
}): boolean {
	const {
		node,
		variableDeclaration,
		arrayDestructuring,
		objectDestructuring,
		variableDeclarationIgnoreFunction,
	} = params;

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
 * @param {object} params - The parameters object.
 * @param {TSESTree.PropertyDefinition} params.node - The property definition to inspect.
 * @param {boolean} params.variableDeclarationIgnoreFunction - Whether function initializers are ignored.
 * @returns {boolean} `true` when the property definition should be skipped, otherwise `false`.
 */
function shouldSkipPropertyDefinition(params: {
	node: TSESTree.PropertyDefinition;
	variableDeclarationIgnoreFunction: boolean;
}): boolean {
	const {
		node,
		variableDeclarationIgnoreFunction,
	} = params;

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

/**
 * `VariableDeclarator` visitor. Reads the active context and options from
 * module-scope state set by `create`.
 *
 * @param {TSESTree.VariableDeclarator} node - The variable declarator node.
 * @returns {void}
 */
function visitVariableDeclarator(
	node: TSESTree.VariableDeclarator,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();
	const options: TypedefRuleOptions = getActiveOptions();

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
		context,
		location: node,
		annotationTarget: node.id,
		inferenceNode,
		name: getNodeName(node.id),
	});
}

/**
 * `ArrayPattern` visitor. Reads the active context from module-scope state.
 *
 * @param {TSESTree.ArrayPattern} node - The array pattern node.
 * @returns {void}
 */
function visitArrayPattern(
	node: TSESTree.ArrayPattern,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();

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
		context,
		location: node,
		annotationTarget: node,
		inferenceNode,
		name: undefined,
	});
}

/**
 * `ArrowFunctionExpression` visitor. Reads the active context from
 * module-scope state and checks all arrow-function parameters.
 *
 * @param {TSESTree.ArrowFunctionExpression} node - The arrow function node.
 * @returns {void}
 */
function visitArrowFunctionExpression(
	node: TSESTree.ArrowFunctionExpression,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();

	checkParameters({
		context,
		params: node.params,
	});
}

/**
 * `PropertyDefinition` visitor. Reads the active context and options from
 * module-scope state.
 *
 * @param {TSESTree.PropertyDefinition} node - The property definition node.
 * @returns {void}
 */
function visitPropertyDefinition(
	node: TSESTree.PropertyDefinition,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();
	const options: TypedefRuleOptions = getActiveOptions();

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
		context,
		location: node,
		annotationTarget,
		inferenceNode,
		name,
	});
}

/**
 * Shared visitor for `FunctionDeclaration` and `FunctionExpression` nodes.
 * Reads the active context from module-scope state and checks all parameters.
 *
 * @param {TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} node - The function node.
 * @returns {void}
 */
function visitFunction(
	node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();

	checkParameters({
		context,
		params: node.params,
	});
}

/**
 * `ObjectPattern` visitor. Reads the active context from module-scope state.
 *
 * @param {TSESTree.ObjectPattern} node - The object pattern node.
 * @returns {void}
 */
function visitObjectPattern(
	node: TSESTree.ObjectPattern,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();

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
		context,
		location: node,
		annotationTarget: node,
		inferenceNode,
		name: undefined,
	});
}

/**
 * Shared visitor for `TSIndexSignature` and `TSPropertySignature` nodes.
 * Reads the active context from module-scope state and reports missing
 * annotations on untyped property signatures.
 *
 * @param {TSESTree.TSIndexSignature | TSESTree.TSPropertySignature} node - The signature node.
 * @returns {void}
 */
function visitPropertySignature(
	node: TSESTree.TSIndexSignature | TSESTree.TSPropertySignature,
): void {
	const context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>> = getActiveContext();

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
		context,
		location: node,
		annotationTarget: node,
		inferenceNode: undefined,
		name,
	});
}

/**
 * Assembles the full `RuleListener` visitor map from the resolved rule
 * options. Each enabled option contributes its visitor handler; the
 * `VariableDeclarator` visitor is always present.
 *
 * @param {TypedefRuleOptions} options - The resolved rule options.
 * @returns {TSESLint.RuleListener} The assembled visitor map.
 */
function buildVisitors(
	options: TypedefRuleOptions,
): TSESLint.RuleListener {
	const visitors: TSESLint.RuleListener = {
		VariableDeclarator: visitVariableDeclarator,
	};

	if (
		options.arrayDestructuring === true
	) {
		visitors.ArrayPattern = visitArrayPattern;
	}

	if (
		options.arrowParameter === true
	) {
		visitors.ArrowFunctionExpression = visitArrowFunctionExpression;
	}

	if (
		options.memberVariableDeclaration === true
	) {
		visitors.PropertyDefinition = visitPropertyDefinition;
	}

	if (
		options.parameter === true
	) {
		visitors.FunctionDeclaration = visitFunction;
		visitors.FunctionExpression = visitFunction;
	}

	if (
		options.objectDestructuring === true
	) {
		visitors.ObjectPattern = visitObjectPattern;
	}

	if (
		options.propertyDeclaration === true
	) {
		visitors.TSIndexSignature = visitPropertySignature;
		visitors.TSPropertySignature = visitPropertySignature;
	}

	return visitors;
}

const typedefRule = createRule({
	name: "typedef",
	meta: {
		type: TYPE_DEFINITION_SUGGESTION,
		docs: {
			description: "Require explicit type annotations and autofix them from TypeScript inference.",
		},
		fixable: FIXABLE_CODE,
		messages: {
			expectedTypedef: "Expected a type annotation.",
			expectedTypedefNamed: "Expected {{ name }} to have a type annotation.",
		},
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					[OPTION_KEYS.ArrayDestructuring]: {
						type: "boolean",
					},
					[OPTION_KEYS.ArrowParameter]: {
						type: "boolean",
					},
					[OPTION_KEYS.MemberVariableDeclaration]: {
						type: "boolean",
					},
					[OPTION_KEYS.ObjectDestructuring]: {
						type: "boolean",
					},
					[OPTION_KEYS.Parameter]: {
						type: "boolean",
					},
					[OPTION_KEYS.PropertyDeclaration]: {
						type: "boolean",
					},
					[OPTION_KEYS.VariableDeclaration]: {
						type: "boolean",
					},
					[OPTION_KEYS.VariableDeclarationIgnoreFunction]: {
						type: "boolean",
					},
				},
			},
		],
	},
	defaultOptions: [DEFAULT_OPTIONS],
	// eslint-disable-next-line max-params -- create signature is fixed by ESLintUtils.RuleCreator
	create(
		context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>,
		options: readonly [TypedefRuleOptions],
	): TSESLint.RuleListener {
		activeContext = context;
		activeOptions = options[0];

		const visitors: TSESLint.RuleListener = buildVisitors(
			options[0],
		);

		return visitors;
	},
});

export {
	typedefRule,
};
