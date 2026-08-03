import {
	MAX_INFERRED_TYPE_LENGTH,
} from "@config/rules/typedef-limits";
import {
	ANNOTATION_SEPARATOR,
} from "@config/rules/typedef-meta";

import {
	logDebug,
} from "@utils/debug-log";
import {
	buildInferredTypeAnnotationFixes,
} from "@utils/import-fix-builder";
import {
	resolveAnnotationTarget,
} from "@utils/typedef-shared";

import type {
	ReportMissingAnnotationParams,
	TypedefMessageIds,
	TypedefRuleContext,
} from "@types-internal/rules/typedef-rule-options-types";
import type {
	ResolvedAnnotationTarget,
} from "@types-internal/utils/typedef-shared-types";
import type {
	TSESLint,
} from "@typescript-eslint/utils";

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
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
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
		ruleContext,
		location,
		annotationTarget,
		inferenceNode,
		name,
	}: ReportMissingAnnotationParams = params;

	const {
		context,
	}: TypedefRuleContext = ruleContext;

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
				logDebug({
					enabled: ruleContext.options.debug,
					label: "skip-fix",
					detail: {
						reason: "no-inference-node",
					},
				});
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
				logDebug({
					enabled: ruleContext.options.debug,
					label: "skip-fix",
					detail: {
						reason: inferredFix === undefined ? "no-type-text" : "type-too-long",
					},
				});
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

	logDebug({
		enabled: ruleContext.options.debug,
		label: "report",
		detail: {
			nodeType: location.type,
			name,
		},
	});

	context.report(reportDescriptor);
}

export {
	reportMissingAnnotation,
};
