# Jalisco PRRSV-2 ORF5 — Draft 9 dataset

## Sources

- FASTA: `Seq_PRRS_63_align_VR-2332.fas`
- metadata: `BASE_SEQ_PRRS_ORF5.xlsx`, sheet `Analisis`

The FASTA contains 64 records:
- 63 study accessions;
- 1 existing reference, `U87392.3-VR-2332`.

The metadata workbook contains 63 sequence rows matching the 63 study accessions one-to-one.

## Existing reference handling

`U87392.3-VR-2332` has the same ORF5 SHA-256 as the existing curated `U87392` record.

It was **not duplicated**. The analysis FASTA label was retained as a non-primary alias and the existing sequence record is reused in analysis datasets.

## Study import

Batch:
- `20260918_PRRSV2_ORF5_JALISCO63_DRAFT9_V1`

Curated study dataset:
- `PRRSV2_ORF5_JALISCO_STUDY_20260918`
- 63 study records
- status: frozen

Uploaded-input snapshot:
- `PRRSV2_ORF5_JALISCO_DRAFT9_INPUT`
- 64 members = 63 study + existing U87392 reference
- status: frozen
- preserves the uploaded FASTA labels through dataset-specific export overrides

Full tree dataset:
- `PRRSV2_ORF5_JALISCO_DRAFT9_TREE_1181`
- 1,118 frozen anchors + 63 study records
- total: 1,181 documentary records
- U87392 occurs once, through the anchor collection
- status: frozen

## Validation

The 63 study records have:
- 63 unique accessions;
- 63 unique FASTA identifiers;
- 603 nt each;
- 0 invalid records;
- 47 records without warnings;
- 16 records with exact-identity warnings.

Source-to-curated comparison produced zero mismatches for:
- accession;
- internal study ID;
- nucleotide sequence;
- FASTA label;
- preserved source metadata;
- lineage;
- RFLP;
- sample type;
- production stage;
- country/state/year.

The complete available source row from the workbook is preserved in `sequence_records.source_metadata`. Molecularly useful fields are also normalized into dedicated columns/tables. Farm/risk/production variables are preserved as source provenance but are not yet modeled as molecular-domain columns.

## Lineage composition

- L1A: 30
- L1C: 4
- L1I: 6
- L2: 1
- L5A: 17
- L8C: 1
- L8D: 4

## Exact nucleotide identity

Within the 63 study accessions:
- unique ORF5 nucleotide strings: 51;
- exact-identity groups: 4;
- study records participating in those groups: 16.

Seven study accessions share one exact ORF5 sequence that is also present in the anchor collection:
- PV235490
- PZ201033
- PZ201040
- PZ201041
- PZ201046
- PZ201047
- PZ201053

That nucleotide string is also represented by six anchor accessions:
- OR293741
- OR293742
- OR293747
- OR293749
- OR293756
- OR293760

These are retained as distinct documentary/biological records. Exact molecular identity is tracked by sequence SHA-256 and validation evidence; it is not used as an automatic merge rule.

## Reproducible FASTA checks

Study dataset (63):
- characters: 38,933
- MD5: `c8d2f2e640a91f7e383f1c7aa58b06d6`
- exact canonical match to the 63 study records in the uploaded FASTA: true

Uploaded-input snapshot (64):
- characters: 39,555
- MD5: `21abd4b61d2fbd1441ed965f44d5997a`
- exact canonical match to the uploaded FASTA, including `U87392.3-VR-2332`: true

Full Draft 9 tree dataset (1,181):
- characters: 730,248
- MD5: `8500990708966420540624ee15cd990b`
- exact canonical match to frozen 1,118-anchor export + validated 63-study export: true

The permanent exporter is `molecular.export_dataset_fasta(dataset_code)`.
