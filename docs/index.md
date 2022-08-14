<div>
  <h1 class="logo">kanel</h1>
  <h2 class="payoff">Source of truth: PostgreSQL</h2>
</div>

Turn your Postgres schema into Typescript types that look like this:

```typescript
// @generated
// Automatically generated. Don't change this file manually.

import { AddressId } from './Address';

export type CustomerId = number & { ' __flavor'?: 'customer' };

export default interface Customer {
  /** Primary key. Index: customer_pkey */
  customer_id: CustomerId;

  active: boolean;

  create_date: Date;

  /** Index: idx_fk_address_id */
  address_id: AddressId;
}
```

..or [Zod](https://zod.dev/) schemas like this:

```typescript
// ...
```

It does this by inspecting a live PostgreSQL database,
sort of like a reverse object/relations mapper.

You check the generated code into your repository and work with it using [Knex.js](https://knexjs.org/) or similar.

The idea is introduced in [this blog post](https://medium.com/@kristiandupont/generating-typescript-types-from-postgres-48661868ef84).

---

Copyright &copy; 2018 [Kristian Dupont](https://www.kristiandupont.com), licensed under the [MIT License](https://opensource.org/licenses/MIT)

![Cinnamon](https://images.unsplash.com/photo-1530991472021-ce0e43475f6e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzB8fGNpbm5hbW9ufGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=900&q=60)
