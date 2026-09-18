# Molecular backend architecture

## Decision

DiseasesMapMx uses a single Supabase project, `DiseasesMapMx Production`, with strong internal separation by PostgreSQL schema.

```
DiseasesMapMx Production
|
+-- molecular   -> curated scientific source of truth
+-- staging     -> temporary import/validation workspace
+-- public      -> DiseasesMapMx operational/published layer
+-- private     -> existing non-public operational payloads
```

The `molecular` repository is broader than the public platform. It may contain international references, unpublished project sequences, complete genomes, multiple loci, historical classifications, manuscript datasets, and material that will never be displayed by DiseasesMapMx.

DiseasesMapMx consumes only explicitly approved/versioned products generated from `molecular`.

## Data flow

```
FASTA/FAS + XLSX/CSV
        |
        v
     staging
        |
        | validation + curator decision
        v
    molecular
        |
        +--> FASTA/FAS exports
        +--> XLSX/CSV metadata
        +--> iTOL datasets
        +--> R / Python / QGIS
        +--> manuscript datasets
        |
        '--> approved/versioned publication
                    |
                    v
              public/private
              DiseasesMapMx
```

There is no automatic live synchronization from every curated molecular record into the public application. Publication to DiseasesMapMx must be an explicit operation so scientific work-in-progress cannot silently change the operational platform.

## Core design principles

1. Sequence identity and classification are separate.
2. Accessions/internal IDs are stable identifiers; lineage/sublineage are versioned annotations.
3. Identical nucleotide sequences may represent distinct biological/documentary records and are not automatically deduplicated.
4. Classification schemes are versioned so historical and current assignments can coexist.
5. Vaccine references, alternate vaccine references, parental/prototype strains, lineage anchors, and field references are explicit roles.
6. Datasets are reproducible memberships/queries, not copied FASTA files.
7. Imports enter `staging` and require validation plus curator approval before becoming authoritative.
8. DiseasesMapMx receives approved/versioned subsets, not the complete molecular repository by default.
9. PostgreSQL remains the portable core.

## Initial production use case

PRRSV-2 ORF5 is the first collection:
- import the curated anchor collection;
- retain nucleotide sequence plus metadata;
- version molecular classifications;
- define reference roles;
- create the Jalisco manuscript dataset;
- export a reproducible FASTA and annotations for phylogenetic reconstruction.

The same structure is intended to expand to complete genomes, other PRRSV loci, additional PRRSV collections, and other viruses.
