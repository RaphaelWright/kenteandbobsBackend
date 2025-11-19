# Database Migrations Guide

## Overview

This guide explains how database migrations work for custom modules (Review, Wishlist) in your Medusa v2 backend.

## How Migrations Work

When you define custom modules using `model.define()`, Medusa v2 automatically:
1. Detects the schema changes
2. Generates migration files
3. Creates/updates database tables when migrations run

## Automatic Migration Process

### During Build
The build process (`pnpm run build`) automatically:
1. Compiles the TypeScript code
2. Copies necessary files to `.medusa/server`
3. Installs production dependencies
4. **Runs `ensure-migrations.js` to set up the database**

### During Start
The start process (`pnpm run start`) automatically:
1. **Runs `ensure-migrations.js` to ensure schema is up to date**
2. Runs `init-backend` for any additional setup
3. Starts the Medusa server

## Manual Migration Commands

If you need to run migrations manually:

```bash
# Generate migrations for schema changes
pnpm run migrations:generate

# Run pending migrations
pnpm run migrations:run

# Sync database links (for module relationships)
pnpm run db:sync
```

## Custom Modules

### Review Module
- **Table**: `review`
- **Fields**: product_id, customer_id, rating, comment, status, etc.
- **Auto-created**: Yes

### Wishlist Module
- **Table**: `wishlist`
- **Fields**: customer_id, product_id, variant_id, added_at
- **Auto-created**: Yes

## Troubleshooting

### Error: "relation does not exist"

This means the table hasn't been created. Solutions:

1. **Re-deploy**: The build process will run migrations automatically
2. **Manual migration**: Run `pnpm run migrations:run` 
3. **Generate migrations**: Run `pnpm run migrations:generate` then `pnpm run migrations:run`

### Migration Script Fails

The `ensure-migrations.js` script is designed to be fault-tolerant:
- It won't fail the build if migrations are already up to date
- It logs warnings but continues execution
- Safe to run multiple times

## Railway Deployment

When deploying to Railway:
1. Build process runs automatically
2. Migrations run during build via `postBuild.js`
3. Migrations run again at startup for safety
4. If tables exist, migrations skip gracefully

## Database Schema Changes

When you modify a model (e.g., add a field to Wishlist):

1. **Local Development**:
   ```bash
   pnpm run migrations:generate
   pnpm run migrations:run
   ```

2. **Production**:
   - Commit the changes
   - Push to Railway
   - Build process handles migrations automatically

## Best Practices

1. **Always backup** your database before running migrations in production
2. **Test migrations** in development first
3. **Review generated migrations** before committing them
4. **Don't edit** migration files manually unless necessary
5. **Commit migration files** to version control

## Migration Files Location

Migration files are stored in:
```
.medusa/server/migrations/
```

These are auto-generated and managed by MikroORM (Medusa's ORM).

## Common Scenarios

### Adding a New Custom Module

1. Create module in `src/modules/your-module/`
2. Define model using `model.define()`
3. Register in `medusa-config.js`
4. Run `pnpm run migrations:generate`
5. Run `pnpm run migrations:run`
6. Deploy (migrations run automatically)

### Modifying Existing Model

1. Update model definition in `src/modules/*/models/*.ts`
2. Run `pnpm run migrations:generate`
3. Review generated migration
4. Run `pnpm run migrations:run`
5. Test thoroughly
6. Deploy

## Support

If migrations fail consistently:
1. Check database connection (DATABASE_URL)
2. Verify database user has CREATE TABLE permissions
3. Check Medusa server logs for detailed errors
4. Ensure all environment variables are set correctly

## Quick Reference

```bash
# Development workflow
pnpm run dev                    # Auto-runs migrations in dev mode

# Production workflow  
pnpm run build                  # Builds + runs migrations
pnpm run start                  # Ensures migrations + starts server

# Manual migration management
pnpm run migrations:generate    # Create new migration
pnpm run migrations:run         # Apply migrations
pnpm run db:sync               # Sync relationships
```

