export interface LocalType {
	id: number;
	value: string;
}

export function makeLocal() {
	const item: LocalType = {
		id: 1,
		value: "hello",
	};
	return item;
}

export function processLocal() {
	const item = makeLocal();
	return item;
}
