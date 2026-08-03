import type { PaginatedDocs } from "../types/payload";
import type { Article } from "../payload-types";

export interface FetchResult {
	data: unknown;
	ok: boolean;
}

export function getArticles(): PaginatedDocs<Article> {
	return {
		docs: [],
		totalDocs: 0,
		totalPages: 0,
		hasNextPage: false,
		hasPrevPage: false,
	};
}

export function getFirstArticle(articles: PaginatedDocs<Article>): Article | undefined {
	return articles.docs[0];
}
