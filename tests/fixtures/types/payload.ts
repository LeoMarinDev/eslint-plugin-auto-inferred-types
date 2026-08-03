export interface PaginatedDocs<T> {
	docs: T[];
	totalDocs: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export type Where = Record<string, unknown>;
