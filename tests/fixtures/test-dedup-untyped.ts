import type { PaginatedDocs } from "@test-types/payload";
import type { Article } from "@/payload-types";

import { getArticles, getFirstArticle } from "./services/the-lab-fetch";

export function processArticlesDedup() {
	const result = getArticles();
	const first = getFirstArticle(result);
	return { result, first };
}
