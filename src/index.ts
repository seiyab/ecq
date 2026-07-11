type Query<out T> = {
	queryKey: unknown[];
	queryFn: () => Promise<T>;
};

const querySourceIds = createIdRegistry();

type FunctionQueryFactory<Func extends (...args: never[]) => unknown> = (
	...args: Parameters<Func>
) => Query<Awaited<ReturnType<Func>>>;
function query<Func extends (...args: never[]) => unknown>(fn: Func): FunctionQueryFactory<Func> {
	const functionName = fn.name || "anonymous";
	const sourceId = querySourceIds.issue(fn);
	const queryKeyPrefix = `ecq.func.${functionName}.${sourceId}`;
	const createQuery: FunctionQueryFactory<Func> = (...args) => ({
		queryKey: [queryKeyPrefix, args],
		queryFn: async () => fn(...args) as any,
	});
	return createQuery;
}

type ClientQueryFactories<ClientObject extends Record<string, unknown>> = {
	[K in keyof ClientObject as ClientObject[K] extends (...args: never[]) => unknown
		? K
		: never]: ClientObject[K] extends (...args: infer P) => infer O
		? (...args: P) => Query<Awaited<O>>
		: never;
};
function client<ClientObject extends Record<string, unknown>>(
	clientObject: ClientObject,
): ClientQueryFactories<ClientObject> {
	let objectName = "object";
	if ("constructor" in clientObject && typeof clientObject.constructor === "function") {
		const ctr = clientObject.constructor;
		if (typeof ctr.name === "string") {
			objectName = ctr.name;
		}
	}
	const sourceId = querySourceIds.issue(clientObject);
	const queryKeyPrefix = `ecq.obj.${objectName}.${sourceId}`;

	const queryFactories = Object.fromEntries(
		Object.entries(clientObject).flatMap(([methodName, method]) => {
			if (typeof method !== "function") return [];
			const createQuery = (...args: unknown[]): Query<unknown> => ({
				queryKey: [queryKeyPrefix, methodName, args],
				queryFn: async () => method.apply(clientObject, args),
			});
			return [[methodName, createQuery]];
		}),
	) as ClientQueryFactories<ClientObject>;

	return queryFactories;
}

export const ecq = { query, client };

function createIdRegistry() {
	const registry = new WeakMap<object, number>();
	const nextId = createCounter();

	return { issue };

	function issue(source: object) {
		if (registry.has(source)) return registry.get(source);
		const id = nextId();
		registry.set(source, id);
		return id;
	}
}

function createCounter() {
	let current = 0;
	return counter;

	function counter() {
		return current++;
	}
}
