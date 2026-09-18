# Molecular schema v1

Implemented in Supabase migrations:
- `20260918190958_molecular_core_v1`
- `20260918191031_molecular_core_indexes_v1`
- `20260918191253_molecular_aliases_and_typing_v1`
- `20260918192600_molecular_promote_anchor_batch_v1`
- `20260918194218_enable_pg_net_for_internal_jobs`
- `20260918210503_molecular_dataset_export_v1`

## molecular

| Table | Purpose |
|---|---|
| `organisms` | Organism/virus registry independent of any one project. |
| `loci` | Gene, genome, segment or other molecular region definitions. |
| `import_batches` | Provenance and status for curator imports. |
| `sequence_records` | Stable biological/documentary record (accession or internal ID plus metadata and preserved source metadata). |
| `sequences` | Nucleotide sequence by record and locus, with normalization, length and SHA-256. |
| `sequence_aliases` | Historical/export identifiers such as the original FASTA name, kept separate from stable identity/classification. |
| `classification_schemes` | Versioned classification systems. |
| `classification_labels` | Labels such as lineage/sublineage within a scheme. |
| `sequence_classifications` | Current, historical or provisional assignments. |
| `typing_schemes` | Molecular typing systems independent of phylogenetic classification. |
| `sequence_typings` | Typing results such as PRRSV-2 ORF5 RFLP patterns. |
| `reference_roles` | Controlled reference-role vocabulary. |
| `sequence_reference_roles` | Role assignment to a particular molecular sequence. |
| `datasets` | Reproducible master, analysis, manuscript or publication datasets. |
| `dataset_members` | Sequence membership and role inside a dataset. |
| `audit_events` | Molecular curation audit trail. |

## staging

| Table | Purpose |
|---|---|
| `import_records` | Raw/parsed import rows plus validation findings and existing-record matches before approval. |

## Initial seed data

Organism:
- `PRRSV-2` — Porcine reproductive and respiratory syndrome virus 2

Locus:
- `ORF5` — nominal expected length 603 nt; deviations are validation warnings, not automatic rejection.

Reference roles:
- lineage_anchor
- sublineage_anchor
- vaccine_reference
- alternate_vaccine_reference
- parental_strain
- prototype_strain
- field_reference

Typing system:
- `PRRSV2_ORF5_RFLP / imported-v1`

## Initial curated anchor collection

Source pair:
- `Anclas_ORF5_PRRS_anotaciones.fas`
- `Anclas_ORF5_PRRS_anotaciones.xlsx`

Import batch:
- `20260918_PRRSV2_ORF5_ANCHORS_V1`

Frozen reproducible dataset:
- `PRRSV2_ORF5_ANCHORS_MASTER_20260918`

Classification vocabularies:
- `PRRSV2_ORF5_CURATED_ANCHOR_CLASSIFICATION / 2026-09-18-v1`: 31 source labels
- `PRRSV2_ORF5_LEGACY_SL / imported-v1`: 12 legacy source labels

The source label text is preserved without silently mapping it to a different literature classification scheme.

### Source audit

- FASTA records: 1,118
- XLSX rows: 1,118
- FASTA identifiers unique: 1,118
- GenBank accessions unique: 1,118
- FASTA without XLSX metadata: 0
- XLSX metadata without FASTA: 0
- invalid nucleotide-character records: 0
- records without validation warnings: 919
- records with informational warnings: 199
- invalid records: 0

Warnings are limited to non-nominal ORF5 length and/or exact sequence identity shared with another accession. Neither condition causes automatic deletion or merging.

### Promoted curated records

- `sequence_records`: 1,118
- `sequences`: 1,118
- primary legacy FASTA aliases: 1,118
- current lineage assignments: 1,118
- historical source sublineage assignments: 37
- RFLP typing assignments: 1,108
- frozen dataset members: 1,118

Post-promotion pairwise validation produced zero mismatches for:
- accession;
- historical FASTA alias;
- nucleotide sequence;
- preserved source metadata;
- lineage;
- source sublineage;
- normalized RFLP.

### Molecular sequence audit

- 600 nt: 7
- 603 nt: 1,050
- 606 nt: 16
- 609 nt: 45
- unique nucleotide sequences: 1,030
- exact-identity groups: 51
- records in exact-identity groups: 139

Distinct accessions remain distinct biological/documentary records even when their ORF5 nucleotide strings are identical.

## Reproducible FASTA export

The permanent function:

`molecular.export_dataset_fasta(dataset_code)`

returns a canonical single-line FASTA for a reproducible dataset, ordered by dataset display order.

For `PRRSV2_ORF5_ANCHORS_MASTER_20260918`:

- exported FASTA characters: 691,315
- source canonical FASTA MD5: `13d38cbfd3d38628d2c457e749e14df4`
- database-export FASTA MD5: `13d38cbfd3d38628d2c457e749e14df4`
- exact canonical FASTA match: **true**

This verifies that the curated database reproduces the source anchor FASTA without sequence or identifier loss.

## Integrity rules

- accession uniqueness is case-insensitive when accession is present;
- internal-code uniqueness is case-insensitive when internal code is present;
- historical FASTA names live in aliases and are not stable primary identifiers;
- every sequence belongs to one sequence record and one locus;
- one canonical sequence is stored per record/locus pair;
- SHA-256 supports exact nucleotide-identity detection without forcing biological-record deduplication;
- only one `current` classification per sequence/classification scheme;
- RFLP is stored as a typing result, not embedded in sequence identity;
- datasets reference existing sequences instead of copying them;
- all molecular/staging tables have RLS enabled and remain non-public by default.

## Current state

The initial PRRSV-2 ORF5 anchor collection is fully imported, curated, validated, and frozen as a reproducible dataset. It is ready to receive the Jalisco study sequences as a separate import batch and to generate study-specific FASTA subsets without manual FASTA/XLSX synchronization.
