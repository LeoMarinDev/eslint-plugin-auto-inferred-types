import type {
	TSESLint,
	TSESTree,
} from "@typescript-eslint/utils";

/**
 * Options accepted by the `typedef` rule.
 *
 * Each flag toggles typedef enforcement for a specific syntactic position.
 * All flags default to `false`; the `recommended` config enables the ones
 * that match the plugin's intended behavior. The `debug` flag is the only
 * non-enforcement option: when `true` it emits structured diagnostics to
 * `process.stderr` without altering any fixes.
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
	debug: boolean;
}

/**
 * Message IDs emitted by the `typedef` rule.
 */
export type TypedefMessageIds =
	| "expectedTypedef"
	| "expectedTypedefNamed";

/**
 * Bundles the ESLint rule context together with the resolved rule options
 * so visitors and helpers can receive a single typed object instead of
 * reaching into module-scope mutable state.
 */
export interface TypedefRuleContext {
	context: Readonly<TSESLint.RuleContext<TypedefMessageIds, [TypedefRuleOptions]>>;
	options: TypedefRuleOptions;
}

/**
 * Parameter object for the `reportMissingAnnotation` helper.
 *
 * Carries the `TypedefRuleContext` plus the location and inference nodes
 * the helper needs to report and autofix a missing type annotation.
 */
export interface ReportMissingAnnotationParams {
	ruleContext: TypedefRuleContext;
	location: TSESTree.Node;
	annotationTarget: TSESTree.Node;
	inferenceNode: TSESTree.Node | undefined;
	name: string | undefined;
}

/**
 * Parameter object for the `checkParameters` helper.
 */
export interface CheckParametersParams {
	ruleContext: TypedefRuleContext;
	params: TSESTree.Parameter[];
}

/**
 * Parameter object for the `shouldSkipVariableDeclarator` predicate.
 */
export interface ShouldSkipVariableDeclaratorParams {
	node: TSESTree.VariableDeclarator;
	variableDeclaration: boolean;
	arrayDestructuring: boolean;
	objectDestructuring: boolean;
	variableDeclarationIgnoreFunction: boolean;
}

/**
 * Parameter object for the `shouldSkipPropertyDefinition` predicate.
 */
export interface ShouldSkipPropertyDefinitionParams {
	node: TSESTree.PropertyDefinition;
	variableDeclarationIgnoreFunction: boolean;
}

/**
 * Generic parameter object shared by every `visit*` function in
 * `./src/rules/typedef/visitors.ts`. Bundles the AST node to inspect with
 * the `TypedefRuleContext` so visitors can close over the rule context
 * without reaching into module-scope mutable state.
 *
 * @typeParam T - The concrete `TSESTree` node type the visitor handles.
 */
export interface VisitParams<T extends TSESTree.Node> {
	node: T;
	ruleContext: TypedefRuleContext;
}
