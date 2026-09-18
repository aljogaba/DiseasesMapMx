# Molecular import and curation workflow

## Supported source files

Initial curator inputs:
- FASTA / FAS for nucleotide sequences;
- XLSX / CSV for structured metadata.

SQL is a backend implementation detail, not a user import format.

## Storage ingress

A private Supabase Storage bucket named `molecular-imports` is reserved for future curator uploads from the administration interface.

Current bucket properties:
- private;
- empty;
- 50 MB per-file limit;
- accepts text/plain, CSV, JSON, XLS/XLSX and generic binary uploads;
- no anonymous or authenticated client-upload policy is currently enabled.

This means the bucket exists as infrastructure, but it is not yet exposed to the frontend. Future upload access should be added only through authenticated administration workflows.

## Workflow

```
Upload
  -> molecular.import_batches
  -> staging.import_records
  -> structural validation
  -> molecular validation
  -> metadata matching
  -> curator review
  -> approve / reject / correct
  -> molecular curated tables
  -> reproducible dataset/export
  -> optional approved publication to DiseasesMapMx
```

## Required validation

Every import batch should report:
- duplicated accession/internal identifier;
- duplicated FASTA identifier;
- sequence without metadata;
- metadata without sequence;
- exact nucleotide identity with existing records;
- unexpected sequence length;
- invalid/ambiguous nucleotide symbols;
- unknown organism or locus;
- missing required metadata;
- unrecognized classification label;
- conflicts with current curated annotations.

Exact nucleotide identity is informational. It does not imply that two biological/documentary records must be merged.

## Current sequence normalization

On insertion into `molecular.sequences`, the database:
- removes whitespace;
- converts nucleotide strings to uppercase;
- calculates nucleotide length;
- calculates SHA-256;
- counts ambiguous IUPAC positions;
- records whether gaps are present.

This provides a stable identity check without deleting legitimate accessions that encode the same nucleotide sequence.

## Human curation

No rule may silently delete or merge records solely because sequences are identical.

The curator must be able to:
- accept/reject records;
- correct metadata;
- assign/revise classification;
- assign reference roles;
- retain separate accessions sharing the same nucleotide sequence;
- inspect validation warnings before approval.

## Reproducible datasets

Analysis datasets are database memberships/selection criteria rather than manually edited copies.

Each dataset can retain:
- selected sequence records;
- classification scheme/version;
- reference roles;
- member role;
- selection criteria;
- version/status;
- provenance.

FASTA output is generated from database membership using `molecular.export_dataset_fasta(dataset_code)`.

## First completed import

The first completed curated import is:
- batch: `20260918_PRRSV2_ORF5_ANCHORS_V1`;
- frozen dataset: `PRRSV2_ORF5_ANCHORS_MASTER_20260918`;
- records: 1,118;
- invalid records: 0;
- source-to-curated mismatches: 0;
- canonical FASTA MD5: `13d38cbfd3d38628d2c457e749e14df4`.

The next intended batch is the 63 Jalisco PRRSV-2 ORF5 study sequences used for the manuscript Figure 1 workflow.
