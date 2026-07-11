import { describe, test, expect } from "vitest";
import { QueryClient } from "@tanstack/query-core";
import { ecq } from ".";

const { query, client, keyOf } = ecq;

describe("query()", () => {
	test("test", async () => {
		const addQuery = query(add);
		const q = addQuery(1, 2);
		expect(q.queryKey).toEqual([expect.anything(), [1, 2]]);
		expect(await q.queryFn()).toEqual(3);
	});

	test("should return identical queryKey for same input", () => {
		const addQuery = query(add);
		const a = addQuery(1, 2);
		const b = addQuery(1, 2);
		expect(a.queryKey).toEqual(b.queryKey);
	});

	test("should return different queryKey for different input", () => {
		const addQuery = query(add);
		const a = addQuery(1, 2);
		const b = addQuery(1, 3);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});

	test("should return different queryKey for different function", () => {
		const addQuery = query(add);
		const addQuery2 = query(add2);
		const a = addQuery(1, 2);
		const b = addQuery2(1, 2);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});
});

describe("client()", () => {
	test("wraps object functions as queries", async () => {
		const api = client({
			add,
		});
		const q = api.add(1, 2);
		expect(q.queryKey).toEqual([expect.anything(), "add", [1, 2]]);
		expect(await q.queryFn()).toEqual(3);
	});

	test("calls methods with the client object as this", async () => {
		const clientObject = {
			base: 10,
			add(this: { base: number }, value: number) {
				return this.base + value;
			},
		};
		const api = client(clientObject);

		expect(await api.add(5).queryFn()).toEqual(15);
	});

	test("should return identical queryKey for same method input", () => {
		const api = client({
			add,
		});
		const a = api.add(1, 2);
		const b = api.add(1, 2);
		expect(a.queryKey).toEqual(b.queryKey);
	});

	test("should return different queryKey for different method input", () => {
		const api = client({
			add,
		});
		const a = api.add(1, 2);
		const b = api.add(1, 3);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});

	test("should return different queryKey for different client objects", () => {
		const api = client({
			add,
		});
		const api2 = client({
			add,
		});
		const a = api.add(1, 2);
		const b = api2.add(1, 2);
		expect(a.queryKey).not.toEqual(b.queryKey);
	});

	test("should omit non-function properties", () => {
		const api = client({
			add,
			version: "1.0.0",
		});
		expect("add" in api).toBe(true);
		expect("version" in api).toBe(false);
	});

	test("wraps class instance methods as queries", async () => {
		class Calculator {
			private base: number;

			constructor(base: number) {
				this.base = base;
			}

			add(value: number) {
				return this.base + value;
			}
		}

		const api = client(new Calculator(10));

		expect(await api.add(5).queryFn()).toEqual(15);
	});

	test("wraps inherited methods and respects overrides", async () => {
		class Calculator {
			calculate(value: number) {
				return value;
			}

			double(value: number) {
				return value * 2;
			}
		}

		class OffsetCalculator extends Calculator {
			calculate(value: number) {
				return value + 1;
			}
		}

		const api = client(new OffsetCalculator());

		expect(await api.calculate(2).queryFn()).toEqual(3);
		expect(await api.double(2).queryFn()).toEqual(4);
	});
});

describe("TanStack Query Core integration", () => {
	test("fetches a query() query with QueryClient", async () => {
		const queryClient = new QueryClient();
		const addQuery = query(add);

		const result = await queryClient.fetchQuery(addQuery(1, 2));

		expect(result).toEqual(3);
		expect(queryClient.getQueryData(addQuery(1, 2).queryKey)).toEqual(3);
	});

	test("fetches a client() method query with QueryClient", async () => {
		const queryClient = new QueryClient();
		const api = client({
			add,
		});

		const result = await queryClient.fetchQuery(api.add(1, 2));

		expect(result).toEqual(3);
		expect(queryClient.getQueryData(api.add(1, 2).queryKey)).toEqual(3);
	});
});

describe("keyOf()", () => {
	test("returns the key prefix of a function query", () => {
		const addQuery = query(add);

		expect(addQuery(1, 2).queryKey).toEqual([...keyOf(addQuery), [1, 2]]);
	});

	test("returns the key prefix of all methods in a query client", () => {
		const api = client({ add, add2 });

		expect(api.add(1, 2).queryKey).toEqual([...keyOf(api), "add", [1, 2]]);
		expect(api.add2(1, 2).queryKey).toEqual([...keyOf(api), "add2", [1, 2]]);
	});

	test("returns the key prefix of a specific query client method", () => {
		const api = client({ add });

		expect(api.add(1, 2).queryKey).toEqual([...keyOf(api.add), [1, 2]]);
	});

	test("rejects values not created by ecq", () => {
		expect(() => keyOf({})).toThrow(TypeError);
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
