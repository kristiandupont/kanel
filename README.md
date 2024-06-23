![Kanel Logo](./logo-bright.png#gh-light-mode-only)
![Kanel Logo](./logo-dark.png#gh-dark-mode-only)

Generate Typescript types from a live Postgres database.

This is for people who don't like ORM's but who do like intellisense and type checking for their database access code.

See the documentation [here](https://kristiandupont.github.io/kanel)

Introduction to the idea is outlined [here](https://medium.com/@kristiandupont/generating-typescript-types-from-postgres-48661868ef84).

## Usage

Install with:

```bash
$ npm i -D kanel
```

To run, make sure you are in a folder that has a `.kanelrc.js` configuration file and that your database is running, and type:

```bash
$ npx kanel
```

## Programmatical usage

Example of running generation from code:

```typescript
import { processDatabase } from "kanel";
import config from "./kanelrc";

async function run() {
  await processDatabase(config);
}

run();
```

## Example

To see an example of the result, check out the [/example](example) folder. It uses the [Sample Database](https://www.postgresqltutorial.com/postgresql-sample-database/) from www.postgresqltutorial.com.

---

If you want to learn about how I use this, check out my course on Newline:

<a href="https://www.newline.co/courses/fullstack-typescript-with-tailwindcss-and-trpc-using-modern-features-of-postgresql" title="Fullstack Typescript with TailwindCSS and tRPC Using Modern Features of PostgreSQL">
   <img src="https://miro.medium.com/v2/resize:fit:1400/format:webp/0*BczW_oS58IoZ2ejf" />
</a>

---

<img src="https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80" />

---

## Contributors

<a href="https://github.com/kristiandupont/kanel/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kristiandupont/kanel" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
