# ecquery

**Easy, Consistent Queries** for [TanStack Query](https://tanstack.com/query).

ecquery turns functions and client objects into type-safe TanStack Query option factories. It generates consistent query keys from the source, method, and arguments, so you can define a query once and use it throughout your application.

## Installation

```sh
npm install ecquery @tanstack/react-query
```

ecquery produces standard TanStack Query options and works with every TanStack Query adapter. This guide uses React.

## Create a query from a function

```tsx
import { useQuery } from "@tanstack/react-query";
import { ecq } from "ecquery";

async function getUser(id: string) {
	const response = await fetch(`/api/users/${id}`);

	if (!response.ok) throw new Error("Failed to fetch user");

	return response.json() as Promise<{ id: string; name: string }>;
}

const userQuery = ecq.query(getUser);

export function User({ id }: { id: string }) {
	const { data: user } = useQuery(userQuery(id));

	return <p>{user?.name}</p>;
}
```

Arguments become part of the query key. The same function and arguments produce the same key; different functions or arguments produce different keys.

The result works anywhere TanStack Query accepts query options:

```ts
queryClient.fetchQuery(userQuery("42"));
queryClient.prefetchQuery(userQuery("42"));
queryClient.getQueryData(userQuery("42").queryKey);
```

## Create queries from a client

Use `ecq.client` to turn the methods of an existing client into query factories.

### Axios

```tsx
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ecq } from "ecquery";

type User = { id: string; name: string };

const client = axios.create({ baseURL: "/api" });
const query = ecq.client(client);

export function User({ id }: { id: string }) {
	const { data: response } = useQuery(query.get<User>(`/users/${id}`));

	return <p>{response?.data.name}</p>;
}
```

### Elasticsearch

```ts
import { Client } from "@elastic/elasticsearch";
import { QueryClient } from "@tanstack/query-core";
import { ecq } from "ecquery";

const client = new Client({ node: "http://localhost:9200" });
const query = ecq.client(client);
const queryClient = new QueryClient();

const results = await queryClient.fetchQuery(
	query.search({
		index: "products",
		query: { match: { name: "coffee" } },
	}),
);
```

### Node.js filesystem

```ts
import { promises as fs } from "node:fs";
import { QueryClient } from "@tanstack/query-core";
import { ecq } from "ecquery";

const files = ecq.client(fs);
const queryClient = new QueryClient();

const packageJson = await queryClient.fetchQuery(files.readFile("package.json", "utf8"));
```

Axios and Elasticsearch are optional examples; ecquery does not depend on them. Function properties become query factories, while non-function properties are omitted.

Only use read methods as queries. Send writes and other side effects through TanStack Query mutations instead.

## Invalidate queries

Use `ecq.keyOf` to invalidate every query created by a query factory, regardless of
its arguments:

```ts
const userQuery = ecq.query(getUser);

await queryClient.invalidateQueries({ queryKey: ecq.keyOf(userQuery) });
```

For an `ecq.client` result, pass the whole query client object to invalidate every
method, or pass one method to invalidate only that method:

```ts
const users = ecq.client({ getUser, listUsers });

// Invalidate all getUser and listUsers queries.
await queryClient.invalidateQueries({ queryKey: ecq.keyOf(users) });

// Invalidate every getUser query, regardless of its arguments.
await queryClient.invalidateQueries({ queryKey: ecq.keyOf(users.getUser) });
```

## API

### `ecq.query(fn)`

Creates a query factory with the same parameters as `fn`. Calling it returns a `queryKey` and an async `queryFn`. Both synchronous and asynchronous functions are supported.

### `ecq.client(object)`

Creates an object containing a query factory for each function property or method in `object`. Each factory preserves the source method's parameter and return types and calls the method with its original client as `this`.

### `ecq.keyOf(queryFactoryOrClient)`

Returns the query-key prefix for a factory created by `ecq.query`, an object created
by `ecq.client`, or one of that object's query methods. Pass the result as the
`queryKey` filter to operations such as `queryClient.invalidateQueries` to match
queries with any arguments.

## License

[MIT](./LICENSE)
