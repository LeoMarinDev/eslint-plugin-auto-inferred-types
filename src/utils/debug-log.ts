/**
 * Emits a structured diagnostic line to `process.stderr` when enabled.
 *
 * The logger is side-effect-gated: when `enabled === false` it returns
 * immediately without allocating or writing. When `enabled === true` it
 * serializes `detail` (string passthrough or safe JSON) and writes a single
 * `[auto-inferred-types] <label> <detail>\n` line to stderr. It never throws
 * and never alters rule fixes; it is observation-only.
 *
 * @param {object} params - The parameters object.
 * @param {boolean} params.enabled - When `false`, no work is performed.
 * @param {string} params.label - Short diagnostic category (e.g. `"report"`, `"visit"`).
 * @param {unknown} params.detail - JSON-serializable payload, or a plain string.
 * @returns {void}
 */
function logDebug(
	params: {
		enabled: boolean;
		label: string;
		detail: unknown;
	},
): void {
	const {
		enabled,
		label,
		detail,
	}: {
		enabled: boolean;
		label: string;
		detail: unknown;
	} = params;

	if (
		enabled === false
	) {
		return;
	}

	const safeDetail: string = (
		typeof detail === "string"
			? detail
			: safeStringify(detail)
	);

	const line: string = `[auto-inferred-types] ${label} ${safeDetail}\n`;

	process.stderr.write(line);
}

/**
 * Best-effort `JSON.stringify` wrapper. Returns the JSON string on success and
 * falls back to `String(value)` when serialization throws (for example on
 * circular references). Never throws.
 *
 * @param {unknown} value - The value to serialize.
 * @returns {string} A string representation of `value`.
 */
function safeStringify(
	value: unknown,
): string {
	let serialized: string;

	try {
		serialized = JSON.stringify(value);
	} catch {
		serialized = String(value);
	}

	return serialized;
}

export {
	logDebug,
};
