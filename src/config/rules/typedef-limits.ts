/**
 * Skip autofix when inference expands to an unreadable structural type.
 *
 * Types longer than this threshold are left unannotated rather than
 * inserting a multi-line structural type that hurts readability.
 */
export const MAX_INFERRED_TYPE_LENGTH: number = 120;
