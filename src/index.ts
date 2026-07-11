type Query<out T> = {
	queryKey: unknown[];
	queryFn: () => Promise<T>;
};

const registry = newRegistry();

type FunctionQuery<Func extends (...args: never[]) => unknown> = (
	...args: Parameters<Func>
) => Query<EnsurePromise<ReturnType<Func>>>;
export function func<Func extends (...args: never[]) => unknown>(
	f: Func,
): FunctionQuery<Func> {
	const name = f.name || "anonymous";
	const id = registry.id(f);
	const key = `ecq.func.${name}.${id}`;
	const query: FunctionQuery<Func> = (...args) => ({
		queryKey: [key, args],
		queryFn: async () => f(...args) as any,
	});
	return query;
}

function newRegistry() {
	const registry = new WeakMap<object, number>();
	const next = newCounter();

	return { id };

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

type EnsurePromise<T> = T extends Promise<unknown> ? T : Promise<T>;
