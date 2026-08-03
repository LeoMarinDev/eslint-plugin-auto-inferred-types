import type {
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * The resolved pair returned by `resolveAnnotationTarget`.
 *
 * `annotationTarget` is the node that should receive the type annotation
 * (an `Identifier`, `ArrayPattern`, `ObjectPattern`, or `PropertyDefinition`),
 * and `inferenceNode` is the node whose TypeScript-inferred type will be
 * inserted as the annotation text.
 */
export interface ResolvedAnnotationTarget {
	annotationTarget: TSESTree.Node;
	inferenceNode: TSESTree.Node;
}

/**
 * Parameter object for `isVariableDeclarationIgnoreFunction`.
 */
export interface IsVariableDeclarationIgnoreFunctionParams {
	node: TSESTree.Node | undefined;
	variableDeclarationIgnoreFunction: boolean;
}

/**
 * Parameter object for `resolveAnnotationTarget`.
 */
export interface ResolveAnnotationTargetParams {
	annotationTarget: TSESTree.Node;
	inferenceNode: TSESTree.Node | undefined;
}
