import { describe, test, expect } from "vitest";
import { func } from ".";

describe("func()", () => {
	test("test", async () => {
		const addQuery = func(add);
		const q = addQuery(1, 2);
		expect(q.queryKey).toEqual([expect.anything(), [1, 2]]);
		expect(await q.queryFn()).toEqual(3);
	});

	test("should return identical queryKey for same input", () => {
		const addQuery = func(add);
		const a = addQuery(1, 2);
		const b = addQuery(1, 2);
		expect(a.queryKey).toEqual(b.queryKey);
	});

	test("should return different queryKey for different input", () => {
		const addQuery = func(add);
		const a = addQuery(1, 2);
		const b = addQuery(1, 3);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});

	test("should return different queryKey for different function", () => {
		const addQuery = func(add);
		const addQuery2 = func(add2);
		const a = addQuery(1, 2);
		const b = addQuery2(1, 2);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});
});

function newAdd() {
	return add;
	function add(a: number, b: number): Promise<number> {
		return new Promise((resolve) => resolve(a + b));
	}
}

const add = newAdd();
const add2 = newAdd();
