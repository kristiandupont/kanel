# Data Types

Mapping data types in Postgres to Typescript is not always trivial and unambiguous. You will probably want a `text` column to be represented by a `string` in Typescript. But what about numbers? Typescript, like Javascript, doesn't differentiate between integer types and floating point types. Per default, both kinds will map to `number`, but you should consider if that is what you want and need.

Note that the default Postgres adapter for Node ([node-postgres](https://github.com/brianc/node-postgres)) will return strings per default for many types. This means that you will need to parse them at some point. Depending on what your setup, that can happen in various places. You can look into the way it handles [data types](https://node-postgres.com/features/types).

## Ranges

Kanel will, with the default configuration, turn Postgres ranges info Typescript tuples with the `min` and `max` values as the two entries. There are a few things to note about this.

Firstly, that doesn't actually fully describe a range as you lose information about whether the boundaries are considered inclusive or exclusive. If you want more comprehensive support, you might want to use the [stRange](https://github.com/moll/js-strange) package or some alternative.

Secondly, node-postgres will return strings for ranges like many other things. If you are using, say, the built-in `tsrange` type for timestamp ranges, you can configure the library to parse them to the default Kanel format with the following piece of code:

```typescript
import { types } from 'pg';

// This is the OID for tsrange.
const TSRANGE_OID = 3908;

types.setTypeParser(TSRANGE_OID, (v) =>
  JSON.parse(v).map((d: string) => new Date(d))
);
```

Look at the [node-pg-types](https://github.com/brianc/node-pg-types) docs for more information about type OID's.
