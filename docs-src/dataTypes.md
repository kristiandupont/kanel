# Data Types

Mapping data types in Postgres to Typescript is not always trivial and unambiguous. You will probably want a `text` column to be represented by a `string` in Typescript. But what about numbers? Typescript, like Javascript, doesn't differentiate between integer types and floating point types. Per default, both kinds will map to `number`, but you should consider if that is what you want and need.

Note that the default Postgres adapter for Node ([node-postgres](https://github.com/brianc/node-postgres)) will return strings per default for many types. This means that you will need to parse them at some point. Depending on what your setup, that can happen in various places. You can look into the way it handles [data types](https://node-postgres.com/features/types).

If, for example, you want to use the [postgres-range](https://www.npmjs.com/package/postgres-range) `Range` class for handling the built-in `tsrange` (timestamp range) type, you could do the following:

Firstly, you want to configure Kanel to use the type. Since this type needs to be imported, you have to specify not only the name but a `TypeImport` as well. Add this to your configuration:

```javascript
// .kanelrc.js

/** @type {import('kanel').Config} */
module.exports = {
  // ...

  customTypeMap: {
    'pg_catalog.tsrange': {
      name: 'Range<Date>',
      typeImports: [
        {
          name: 'Range',
          path: 'postgres-range',
          isAbsolute: true,
          isDefault: false,
        },
      ],
    },
  },
};
```

Now, since `node-postgres` will simply use strings for the ranges, we need to configure it. We can define a custom parser like this:

```typescript
import { types } from 'pg';
import { parse } from 'postgres-range';

// This is the OID for tsrange.
const TSRANGE_OID = 3908;
types.setTypeParser(TSRANGE_OID, (v) => parse(v, (v) => new Date(v)));
```

Look at the [node-pg-types](https://github.com/brianc/node-pg-types) docs for more information about type OID's.

That's all good, but if we also want to be able to supply `Range` instances when writing, we need to enable serialization on them.
It just so happens that `node-postgres` has a way to do this, even if it's undocumented at the time. Any object that implements a method called `toPostgres` will be serialized using that particular function. So we can monkey-patch the `Range` class to include this method:

```typescript
import { types } from 'pg';
import { parse, Range, serialize } from 'postgres-range';

// This is the OID for tsrange.
const TSRANGE_OID = 3908;
types.setTypeParser(TSRANGE_OID, (v) => parse(v, (v) => new Date(v)));

(Range.prototype as any).toPostgres = function (
  prepareValue: (v: Date) => string
): string {
  return serialize(this as Range<Date>, prepareValue);
};
```

Now, we can use the `Range` class in our queries, inserts and updates.
