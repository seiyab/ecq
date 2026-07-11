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

type ClientQueryFactories<ClientObject extends object> = {
	[K in keyof ClientObject as ClientObject[K] extends (...args: never[]) => unknown
		? K
		: never]: ClientObject[K] extends (...args: infer P) => infer O
		? (...args: P) => Query<Awaited<O>>
		: never;
};
function client<ClientObject extends object>(
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
		getProperties(clientObject).flatMap(([methodName, value]) => {
			if (typeof value !== "function") return [];
			const createQuery = (...args: unknown[]): Query<unknown> => ({
				queryKey: [queryKeyPrefix, methodName, args],
				queryFn: async () => value.apply(clientObject, args),
			});
			return [[methodName, createQuery]];
		}),
	) as ClientQueryFactories<ClientObject>;

	return queryFactories;
}

function getProperties(object: object): [string, unknown][] {
	const properties: [string, unknown][] = [];
	const visited = new Set<string>();
	let current: object | null = object;

	while (current !== null && current !== Object.prototype) {
		for (const propertyName of Object.getOwnPropertyNames(current)) {
			if (visited.has(propertyName)) continue;
			visited.add(propertyName);

			const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);
			if (descriptor !== undefined && "value" in descriptor) {
				properties.push([propertyName, descriptor.value]);
			}
		}
		current = Object.getPrototypeOf(current);
	}

	return properties;
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
