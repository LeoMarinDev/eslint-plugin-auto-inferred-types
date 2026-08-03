import type {
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * Options accepted by the `typedef` rule.
 *
 * Each flag toggles typedef enforcement for a specific syntactic position.
 * All flags default to `false`; the `recommended` config enables the ones
 * that match the plugin's intended behavior.
 */
export interface TypedefRuleOptions {
	arrayDestructuring: boolean;
	arrowParameter: boolean;
	memberVariableDeclaration: boolean;
	objectDestructuring: boolean;
	parameter: boolean;
	propertyDeclaration: boolean;
	variableDeclaration: boolean;
	variableDeclarationIgnoreFunction: boolean;
}

/**
 * Message IDs emitted by the `typedef` rule.
 */
export type TypedefMessageIds =
	| "expectedTypedef"
	| "expectedTypedefNamed";

/**
 * Parameter object for the module-scope `reportMissingAnnotation` helper.
 *
 * Carries everything the helper needs from the `create` closure so it can
 * live at module scope rather than nested inside `create`.
 */
export interface ReportMissingAnnotationParams {
	context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>;
	location: TSESTree.Node;
	annotationTarget: TSESTree.Node;
	inferenceNode: TSESTree.Node | undefined;
	name: string | undefined;
}

/**
 * Parameter object for the module-scope `checkParameters` helper.
 */
export interface CheckParametersParams {
	context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>;
	params: TSESTree.Parameter[];
}
