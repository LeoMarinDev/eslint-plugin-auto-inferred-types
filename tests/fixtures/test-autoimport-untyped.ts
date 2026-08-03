import { getArticles } from "./services/the-lab-fetch";

export function processArticles() {
	const result = getArticles();
	return result;
}
