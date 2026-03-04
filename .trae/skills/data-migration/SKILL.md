# data-migration

## Description

Provides a comprehensive data migration system with versioned migrations, transaction support, rollback capabilities, and data consistency checking. Enables safe and reliable management of database schema changes and data transformations.

## Triggers

- **Use when:** You need to manage database schema changes, data transformations, or configuration updates in a controlled and reversible manner.
- **Do NOT use when:** You're working with simple data structures that don't require versioning or when you can afford to lose data during updates.

## Input

- `migration_directory`: string (Path to migration files)
- `metadata_path`: string (Path to store migration metadata)
- `target_version`: string (Optional target version to migrate to)
- `options`: object (Migration options like transaction mode, timeout, etc.)

## Output

- `status`: boolean (Success status)
- `current_version`: string (Current schema version after migration)
- `executed_migrations`: number (Number of migrations executed)
- `errors`: array (Migration errors, if any)
- `metrics`: object (Migration performance metrics)

## Steps

1. **Load Migrations**: Discover and load all migration files from the specified directory.
2. **Build Migration Plan**: Determine the order of migrations based on dependencies and current version.
3. **Execute Migrations**: Run migrations in sequence, with optional transaction support.
4. **Update Metadata**: Record executed migrations and current version in metadata.
5. **Check Consistency**: Verify data consistency after migration execution.
6. **Generate Report**: Provide migration status and performance metrics.
7. **Handle Rollback**: If any migration fails, rollback to previous stable state.

## Failure Strategy

- If a migration fails, automatically rollback to the last stable version.
- If rollback fails, provide detailed error information and recovery suggestions.
- If metadata is corrupted, attempt to reconstruct from migration history.
- If migration dependencies are missing, abort and provide dependency resolution guidance.

## Key Features

- **Versioned Migrations**: Use timestamp-based versioning for migration files
- **Dependency Management**: Support for migration dependencies and topological sorting
- **Transaction Support**: Ensure atomicity for critical migrations
- **Rollback Capability**: Revert to previous versions if migrations fail
- **Data Consistency Checking**: Verify data integrity after migrations
- **Performance Monitoring**: Track migration execution times and resource usage
- **Backup Integration**: Optional data backup before migration execution

## Implementation References

- **Migration Structure**: See references/data-migration/migration-structure.md
- **Runner Implementation**: See references/data-migration/runner-implementation.md
- **Consistency Checker**: See references/data-migration/consistency-checker.md
- **Monitoring System**: See references/data-migration/monitoring.md
