import {
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";

import {
	reportMissingAnnotation,
} from "@rules/typedef/report";
import {
	logDebug,
} from "@utils/debug-log";
import {
	getInferenceNodeForParameter,
	getNodeName,
} from "@utils/typedef-shared";

import type {
	CheckParametersParams,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * Checks an array of function parameters for missing type annotations and
 * reports each one. For `AssignmentPattern` parameters the annotation target
 * is the left binding; for `TSParameterProperty` parameters the nested
 * parameter is unwrapped first.
 *
 * @param {CheckParametersParams} params - The parameters object.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @param {TSESTree.Parameter[]} params.params - The parameter nodes to check.
 * @returns {void}
 */
function checkParameters(
	params: CheckParametersParams,
): void {
	const {
		ruleContext,
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

		logDebug({
			enabled: ruleContext.options.debug,
			label: "param-check",
			detail: {
				index: paramIndex,
				hasAnnotation: hasTypeAnnotation,
			},
		});

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
			ruleContext,
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

export {
	checkParameters,
	resolveParameterAnnotationTarget,
	parameterHasTypeAnnotation,
};
