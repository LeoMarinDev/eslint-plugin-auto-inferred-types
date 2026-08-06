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
	getInferredTypeText,
} from "@utils/type-inference";
import {
	resolveAnnotationTarget,
} from "@utils/typedef-shared";

import type {
	ReportMissingAnnotationParams,
	ReportUninferableAsUnreportedParams,
	TypedefMessageIds,
	TypedefRuleContext,
} from "@types-internal/rules/typedef-rule-options-types";
import type { InferredTypeFixResult } from "@types-internal/utils/type-imports-types";
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
 * Grammar of the report:
 * - `inferenceNode === undefined` (e.g. a bare function parameter with no
 *   default): always reported without a fix, matching `@typescript-eslint/typedef`.
 * - `inferenceNode !== undefined` but the inferred type is unreadable (the
 *   compiler's own safety guards: `any`, `never`, error types, `void`, empty
 *   type text, `null` on a `let` binding, `as const` assertions): left
 *   UNREPORTED - no safe annotation exists, so reporting would only force the
 *   user to disable the rule.
 * - Inferred type text longer than `MAX_INFERRED_TYPE_LENGTH`: reported, but
 *   the autofix is skipped so a multi-line structural type is never inserted.
 * - Otherwise: reported with an autofix that inserts the annotation.
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

	const resolved: ResolvedAnnotationTarget | undefined = resolveAnnotationTarget({
		annotationTarget,
		inferenceNode,
	});

	const isUnreportedUninferable: boolean = reportUninferableAsUnreported({
		ruleContext,
		resolved,
	});

	if (
		isUnreportedUninferable
	) {
		return;
	}

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
				const noFix: null = null;
				return noFix;
			}

			const inferredFix: InferredTypeFixResult | undefined = buildInferredTypeAnnotationFixes({
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
				const noFix: null = null;
				return noFix;
			}

			const annotationText: string = `${ANNOTATION_SEPARATOR}${inferredFix.typeText}`;
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

/**
 * Decides whether a missing annotation should be left entirely UNREPORTED
 * because no safe annotation can be inferred.
 *
 * When an inference node exists but the compiler's safety guards reject its
 * type (`any`, `never`, error types, `void`, empty text, `null` on a `let`,
 * `as const` assertions), `buildInferredTypeAnnotationFixes` yields no type
 * text. Reporting the node anyway would only force the user to add a disable
 * comment, so it is skipped. Bare parameters with no inference node (no
 * default value) are NOT gated here - they are reported without a fix, mirroring
 * `@typescript-eslint/typedef`.
 *
 * @param {ReportUninferableAsUnreportedParams} params - The parameters object.
 * @param {TypedefRuleContext} params.ruleContext - The bundled rule context and resolved options.
 * @param {ResolvedAnnotationTarget | undefined} params.resolved - The resolved annotation pair, or `undefined` when no inference applies.
 * @returns {boolean} `true` when the node must not be reported, otherwise `false`.
 */
function reportUninferableAsUnreported(
	params: ReportUninferableAsUnreportedParams,
): boolean {
	const {
		ruleContext,
		resolved,
	}: ReportUninferableAsUnreportedParams = params;

	if (
		resolved === undefined
	) {
		const alwaysReport: boolean = false;
		return alwaysReport;
	}

	const {
		context,
	}: TypedefRuleContext = ruleContext;

	const typeText: string | undefined = getInferredTypeText({
		context,
		inferenceNode: resolved.inferenceNode,
	});

	if (
		typeText === undefined
	) {
		logDebug({
			enabled: ruleContext.options.debug,
			label: "skip",
			detail: {
				nodeType: resolved.annotationTarget.type,
				reason: "uninferable-type-unreported",
			},
		});
		const unreported: boolean = true;
		return unreported;
	}

	const stillReported: boolean = false;
	return stillReported;
}

export {
	reportMissingAnnotation,
	reportUninferableAsUnreported,
};
