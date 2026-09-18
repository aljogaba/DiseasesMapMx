# Access and security

## Current environment

Academic Supabase environment:
- Organization: DiseasesMapMx
- Project: DiseasesMapMx Production

GitHub documentation repository:
- aljogaba/DiseasesMapMx

No passwords, database credentials, service-role keys, JWT secrets, private tokens, or other secrets are stored in this repository.

## Access model

The molecular backend will use the existing academic Supabase project while remaining logically separated from the operational DiseasesMapMx data through a dedicated PostgreSQL schema.

Administrative access to curation will be exposed only through authenticated administration workflows. Public DiseasesMapMx consumers should receive only explicitly published/approved data.

## Secrets

Secrets belong only in secure runtime configuration or provider-managed environment variables.

Never commit:
- database passwords;
- Supabase service-role/secret keys;
- JWT secrets;
- GitHub tokens;
- private connection strings;
- user credentials.

Documentation may name required environment variables, but must never contain their values.

## Database security

- Keep Row Level Security enabled for tables exposed through the Supabase Data API.
- Prefer private/non-exposed schemas for internal curation tables when direct client access is not needed.
- Do not grant broad authenticated access without row- or role-level authorization rules.
- Use migrations for durable schema changes and keep them under version control.
- Record data-changing curation actions in an audit trail.

## Portability

The scientific model should remain PostgreSQL-compatible and avoid unnecessary provider lock-in. If DiseasesMapMx is later institutionalized, the curated database should be transferable to an institutional PostgreSQL server while preserving stable identifiers, classifications, and provenance.
