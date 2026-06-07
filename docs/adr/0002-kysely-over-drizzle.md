# Kysely over Drizzle ORM

We chose Kysely as the database query builder. It's a thin, predictable, type-safe SQL builder with no magic — you write SQL-shaped method chains and get TypeScript autocompletion. Drizzle was considered for its auto-generated migrations, but Kysely's manual migrations and boring predictability won out. Using `kysely-ctl` for migrations and `kysely-codegen` for type generation from the live schema.

**Considered:** Drizzle ORM (schema-as-code with auto-generated migrations, but more opinionated and less predictable).
