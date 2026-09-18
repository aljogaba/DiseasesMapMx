# Access and security

## Current environment

Supabase:
- Organization: DiseasesMapMx
- Project: DiseasesMapMx Production
- PostgreSQL schemas used by this module: `molecular`, `staging`

GitHub documentation:
- `aljogaba/DiseasesMapMx`

No passwords, database credentials, service-role keys, JWT secrets, private tokens, or connection strings are stored in this repository.

## Access boundary

`molecular` and `staging` are internal schemas and are not intended for direct anonymous/authenticated Data API access.

Current foundation:
- RLS is enabled on all new molecular/staging tables.
- No permissive RLS policies are defined.
- privileges for `anon` and `authenticated` are revoked on both schemas.
- `service_role` has backend access for controlled server-side workflows.
- trigger functions are not executable by `PUBLIC`.

The future administration UI should reach curation operations through controlled backend/RPC/Edge Function endpoints rather than by exposing the complete molecular schema directly.

## Secrets

Never commit:
- database passwords;
- Supabase service-role/secret keys;
- JWT secrets;
- GitHub tokens;
- private connection strings;
- user credentials.

Only variable names and configuration requirements may be documented.

## Operational separation

The existing `public` / `private` DiseasesMapMx structures remain operationally independent from `molecular`.

No current production table is repurposed as the molecular source of truth.

A future publication/synchronization operation will copy or transform only approved/versioned fields required by DiseasesMapMx.

## Portability

The scientific model is PostgreSQL-based. Provider-specific application layers should remain thin enough that the curated repository can be exported or migrated without changing stable scientific identifiers, classifications, provenance, or dataset membership.
