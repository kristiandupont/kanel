<div>
  <h1 class="logo">kanel</h1>
  <h2 class="payoff">Source of truth: PostgreSQL</h2>
</div>

Turn your Postgres schema into Typescript types that look like this:

<<< @/../example/models/City.ts

It does this by inspecting a live PostgreSQL database,
sort of like a reverse object/relations mapper.

You check the generated code into your repository and work with it using [Knex.js](https://knexjs.org/) or similar.

The idea is introduced in [this blog post](https://medium.com/@kristiandupont/generating-typescript-types-from-postgres-48661868ef84).

---

If you want to learn about how I use this together with [tRPC](https://trpc.io/) to create end-to-end type safety with PostgreSQL as the source of truth, check out my course on Newline:

<a href="https://www.newline.co/courses/fullstack-typescript-with-tailwindcss-and-trpc-using-modern-features-of-postgresql" title="Fullstack Typescript with TailwindCSS and tRPC Using Modern Features of PostgreSQL">
   <img src="https://miro.medium.com/v2/resize:fit:1400/format:webp/0*BczW_oS58IoZ2ejf" />
</a>

---

Copyright &copy; 2018 [Kristian Dupont](https://www.kristiandupont.com), licensed under the [MIT License](https://opensource.org/licenses/MIT)

![Cinnamon](https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzB8fGNpbm5hbW9ufGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=900&q=60)
