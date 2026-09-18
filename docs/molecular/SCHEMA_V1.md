# Molecular schema v1

Implemented in Supabase migrations:
- `20260918190958_molecular_core_v1`
- `20260918191031_molecular_core_indexes_v1`
- `20260918191253_molecular_aliases_and_typing_v1`

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

## Initial anchor-import preparation

The source pair was audited before database promotion:

- FASTA records: 1,118
- XLSX rows: 1,118
- FASTA identifiers unique: 1,118
- GenBank accessions unique: 1,118
- FASTA without XLSX metadata: 0
- XLSX metadata without FASTA: 0
- invalid nucleotide-character records: 0
- exact nucleotide-identity groups: 51 (139 records)
- nominal 603-nt records: 1,050
- 600-nt records: 7
- 606-nt records: 16
- 609-nt records: 45

Validation outcome:
- 919 records without warnings
- 199 records with informational warnings
- 0 invalid records

Warnings are limited to non-nominal length and/or exact sequence identity shared with another accession. Neither condition causes automatic deletion.

Prepared batch:
- `20260918_PRRSV2_ORF5_ANCHORS_V1`

Prepared reproducible dataset:
- `PRRSV2_ORF5_ANCHORS_MASTER_20260918`

Imported classification vocabularies:
- `PRRSV2_ORF5_CURATED_ANCHOR_CLASSIFICATION / 2026-09-18-v1`: 31 source labels
- `PRRSV2_ORF5_LEGACY_SL / imported-v1`: 12 legacy source labels

The label text is preserved from the workbook without silently mapping it to a literature scheme. Formal provenance can be curated later.

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
- all new tables have RLS enabled and remain non-public by default.

## Current state

The schema, vocabularies, import batch, and anchor snapshot definition are persisted. The 1,118 source sequences have **not yet been promoted into curated molecular tables**; the batch remains in validation preparation so the import path can be completed through `staging` rather than bypassed.
