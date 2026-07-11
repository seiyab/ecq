type Query<out T> = {
	queryKey: unknown[];
	queryFn: () => Promise<T>;
};

const idRegistry = newIDRegistry();

type FunctionQuery<Func extends (...args: never[]) => unknown> = (
	...args: Parameters<Func>
) => Query<Awaited<ReturnType<Func>>>;
export function func<Func extends (...args: never[]) => unknown>(f: Func): FunctionQuery<Func> {
	const name = f.name || "anonymous";
	const id = idRegistry.issue(f);
	const key = `ecq.func.${name}.${id}`;
	const query: FunctionQuery<Func> = (...args) => ({
		queryKey: [key, args],
		queryFn: async () => f(...args) as any,
	});
	return query;
}

type ClientObjectQuery<ClientObject extends Record<string, unknown>> = {
	[K in keyof ClientObject]: ClientObject[K] extends (...args: infer P) => infer O
		? (...args: P) => Query<Awaited<O>>
		: unknown;
};
export function client<ClientObject extends Record<string, unknown>>(
	o: ClientObject,
): ClientObjectQuery<ClientObject> {
	let name = "object";
	const p = o.__prototype__;
	if (typeof p == "object" && p != null) {
		if ("name" in p && typeof p.name === "string") {
			name = p.name;
		}
	}
	const id = idRegistry.issue(o);
	const keyPrefix = `ecq.obj.${name}.${id}`;

	const queries = Object.fromEntries(
		Object.entries(o).flatMap(([key, value]) => {
			if (typeof value !== "function") return [];
			const query = (...args: unknown[]): Query<unknown> => ({
				queryKey: [keyPrefix, key, args],
				queryFn: async () => value(...args),
			});
			return [[key, query]];
		}),
	) as ClientObjectQuery<ClientObject>;

	return queries;
}

function newIDRegistry() {
	const registry = new WeakMap<object, number>();
	const next = newCounter();

	return { issue: id };

	function id(x: object) {
		if (registry.has(x)) return registry.get(x);
		const v = next();
		registry.set(x, v);
		return v;
	}
}

function newCounter() {
	let current = 0;
	return counter;

	function counter() {
		return current++;
	}
}
