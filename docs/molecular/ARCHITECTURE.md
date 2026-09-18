# Molecular backend architecture

## Purpose

The molecular backend is the curated scientific source of truth for sequence records, molecular classifications, reference roles, and analysis datasets used by DiseasesMapMx and other academic workflows.

DiseasesMapMx is a consumer of curated molecular data. The public/operational application is not the master repository for scientific curation.

## Boundary with the current DiseasesMapMx database

The existing `public` tables in the Supabase project support the operational DiseasesMapMx workflow, including sequence submissions, reference versions, analyses, reports, imports, and audit events.

The curated molecular repository will be implemented separately, under a dedicated PostgreSQL schema (planned name: `molecular`). Existing production tables must not be repurposed or altered as the molecular source of truth without an explicit migration plan.

Conceptual flow:

```
molecular (curated source of truth)
        |
        +--> DiseasesMapMx operational/public data
        +--> FASTA/FAS exports
        +--> XLSX/CSV metadata exports
        +--> iTOL annotation datasets
        +--> R / Python / QGIS analyses
        +--> manuscript-specific datasets
```

## Core design principles

1. Sequence identity and classification are separate.
2. Accessions/internal IDs are stable identifiers; lineage/sublineage are versioned annotations.
3. Identical nucleotide sequences may belong to different biological/documentary records and are not automatically deduplicated.
4. Classification schemes must be versioned so historical and current assignments can coexist.
5. Vaccine references, parental/prototype strains, lineage anchors, and field references are explicit roles rather than free-text labels.
6. Manuscript or project datasets are reproducible subsets generated from the curated repository.
7. Imports pass through validation and human curation before becoming authoritative.
8. PostgreSQL remains the portable core so the system can later migrate from Supabase to an institutional PostgreSQL server.

## Initial scope

The first production use case is PRRSV-2 ORF5:
- import the curated anchor collection;
- retain nucleotide sequence plus metadata;
- create versioned molecular classifications;
- define reference roles;
- create the Jalisco manuscript dataset;
- export a reproducible FASTA and annotations for phylogenetic reconstruction.

The schema is intentionally designed to expand later to complete genomes, additional PRRSV loci, and other viruses.
