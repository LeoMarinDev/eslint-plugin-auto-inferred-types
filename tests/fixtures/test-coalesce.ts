import type { Article } from "@/payload-types";
import { getArticles, getFirstArticle } from "./services/the-lab-fetch";
import type { PaginatedDocs } from "@app-types/payload";

export function processArticles(): void {
	const result: PaginatedDocs<Article> = getArticles();
	const first: Article | undefined = getFirstArticle(result);

	console.log(result, first);
}
