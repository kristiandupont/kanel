# PostgreSQL Seed Data Generator using Kanel

Assuming you already have Kanel installed, add this with

```bash
$ npm i -D kanel-seeder
```

## Usage

Add `makeGenerateSeeds` as a generator in your V4 config:

```typescript
import { makeGenerateSeeds } from 'kanel-seeder';

export default {
  connection: { /* ... */ },
  generators: [
    makePgTsGenerator(),
    makeGenerateSeeds({
      srcPath: './seeds/mdconf',
      dstPath: './seeds/generated',
    }),
  ],
};
```

The generator reads `.mdconf` files from `srcPath` and generates Knex seed files (`.js`) in `dstPath`.
