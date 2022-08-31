# How to work with Kanel

Kanel is well suited for a workflow where you let the database schema drive the architecture of your application.
It is easier if you have a mono-repo setup or at least have the code that relies on these types version controlled together with your migrations.

The recommended process making an architectural change is:

1. Create a database migration using Knex or regular SQL.
2. Run the migration on your local development database.
3. Run Kanel on your dev database. It will create/update your type definitions.
4. Review the new defintions and update your code to support the new architecture.
5. When everything works, push and deploy the migration together with the updated type definitions and other changes.

Introduction to the idea is outlined [here](https://medium.com/@kristiandupont/generating-typescript-types-from-postgres-48661868ef84).

## Linting

When using the database as the source of truth, you want to perform your linter checks on the structure of the database, i.e. the schema. For that, you can use [schemalint](https://github.com/kristiandupont/schemalint) which is a linter for Postgres schemas.

As for the generated code, it will contain a `@generated` tag which is a semi-standard that a number of tools respect. You can use [eslint-plugin-ignore-generated](https://github.com/zertosh/eslint-plugin-ignore-generated) to ignore these files.
