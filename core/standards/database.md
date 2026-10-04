# Database

## Naming

- Tables and columns are `snake_case`. Tables are plural nouns (`orders`).
- Audit columns exist on every table and are never used by business logic or shown to users: `create_user_id`, `create_timestamp`, `update_user_id`, `update_timestamp`.
- Business dates are separate columns ending in `_at` (`placed_at`, `cancelled_at`). The suffix tells which kind a column is: `_timestamp` for audit, `_at` for business.
- Query names start with `create`, `get`, `list`, `update`, or `delete`.

## Queries

- Name every column; never `SELECT *`. Adding a column must not silently change what code receives.
- `UPDATE` and `DELETE` always have a `WHERE` clause.
- Queries over several tables alias every table and qualify every column.
- Multi-tenant tables filter on `tenant_id` explicitly, as the first condition, even when row-level security also enforces it.
- Parameters only; never concatenate values into SQL. `LIKE` patterns go through an escaping helper so `%` and `_` in user input match literally.
- Paginated reads have a stable `ORDER BY` that ends with a unique column.

## Schema changes

- Every schema change is a migration file in the repository, reviewed like code. Nobody changes a shared database by hand.
- Migrations are backward compatible with the running version: add a column, deploy code that uses it, then remove the old one in a later migration.
- New multi-tenant tables enable row-level security in the same migration.
- Destructive statements (`DROP`, `TRUNCATE`, dropping columns) need the reason and a rollback plan in the PR.
