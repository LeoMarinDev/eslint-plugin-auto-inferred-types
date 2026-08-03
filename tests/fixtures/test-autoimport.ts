import { getArticles, getFirstArticle } from "./services/the-lab-fetch";
import type { PaginatedDocs } from "@test-types/payload";
import type { Article } from "@/payload-types";

export function processArticles(): void {
	const result: PaginatedDocs<Article> = getArticles();
	const first: Article | undefined = getFirstArticle(result);

	console.log(result, first);
}
