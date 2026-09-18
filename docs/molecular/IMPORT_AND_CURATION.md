# Molecular import and curation workflow

## Supported source files

Initial import workflow:
- FASTA / FAS for nucleotide sequences;
- XLSX / CSV for structured metadata.

SQL is an implementation detail of the backend and is not a required user import format.

## Workflow

```
Upload
  -> staging
  -> structural validation
  -> molecular validation
  -> metadata matching
  -> curator review
  -> approve/reject/correct
  -> curated repository
  -> reproducible exports
```

## Required validation

For every import batch the system should report, at minimum:

- duplicated accession/internal identifier;
- duplicated FASTA identifier;
- sequence present without metadata;
- metadata present without sequence;
- exact nucleotide identity with existing records;
- unexpected sequence length;
- invalid/ambiguous nucleotide symbols;
- unknown organism or locus;
- missing required metadata;
- unrecognized classification label;
- conflicts between imported and current curated annotations.

Exact nucleotide identity is informational and does not imply biological-record duplication.

## Human curation

No automated rule should silently delete or merge records merely because their nucleotide sequences are identical.

The curator must be able to:
- accept a record;
- reject it;
- correct metadata;
- assign or revise classification;
- assign reference roles;
- preserve an accession as a distinct biological/documentary record;
- see missing fields and validation warnings before publication.

## Reproducible datasets

Analysis datasets should be defined from database membership and query criteria rather than manual file editing.

Each export should retain enough provenance to reproduce:
- the selected records;
- classification scheme/version;
- reference roles;
- export date/version;
- source dataset/project.

The first target dataset is the PRRSV-2 ORF5 Jalisco manuscript dataset used to reconstruct Figure 1.
