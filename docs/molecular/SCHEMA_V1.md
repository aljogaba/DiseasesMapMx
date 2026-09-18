# Molecular schema v1

Implemented in Supabase migration:
- `20260918190958_molecular_core_v1`
- `molecular_core_indexes_v1` (foreign-key covering indexes)

## molecular

| Table | Purpose |
|---|---|
| `organisms` | Organism/virus registry independent of any one project. |
| `loci` | Gene, genome, segment or other molecular region definitions. |
| `import_batches` | Provenance and status for curator imports. |
| `sequence_records` | Stable biological/documentary record (accession or internal ID plus metadata). |
| `sequences` | Nucleotide sequence by record and locus, with normalized sequence, length and SHA-256. |
| `classification_schemes` | Versioned classification systems. |
| `classification_labels` | Hierarchical labels such as lineage/sublineage within a scheme. |
| `sequence_classifications` | Current, historical or provisional assignments. |
| `reference_roles` | Controlled reference-role vocabulary. |
| `sequence_reference_roles` | Role assignment to a particular molecular sequence. |
| `datasets` | Reproducible master, analysis, manuscript or publication datasets. |
| `dataset_members` | Sequence membership and role inside a dataset. |
| `audit_events` | Molecular curation audit trail. |

## staging

| Table | Purpose |
|---|---|
| `import_records` | Raw/parsed import rows plus validation findings and matches before approval. |

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

## Integrity rules

- accession uniqueness is case-insensitive when accession is present;
- internal-code uniqueness is case-insensitive when internal code is present;
- every sequence belongs to one sequence record and one locus;
- one canonical sequence is stored per record/locus pair;
- SHA-256 supports exact nucleotide-identity detection without forcing record deduplication;
- only one `current` classification per sequence/classification scheme;
- datasets reference existing sequences instead of copying them;
- all new tables have RLS enabled and remain non-public by default.

## Current state

No anchor or study sequence has been imported yet. The only persisted records are the initial PRRSV-2 organism, ORF5 locus, and controlled reference-role vocabulary.
