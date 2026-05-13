# Prisma Migrations

This folder is managed by Prisma. Do not edit migration files manually.

## Create migrations (development)

```bash
npx prisma migrate dev --name <migration_name>
```

## Apply migrations (production)

```bash
npx prisma migrate deploy
```

## Reset database (development only — destroys all data)

```bash
npx prisma migrate reset
```

## View current migration status

```bash
npx prisma migrate status
```
