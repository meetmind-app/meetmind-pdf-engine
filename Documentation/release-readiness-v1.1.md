# LOREVI v1.1 Release Readiness

Status: implementation checkpoint before isolated n8n / Telegram live E2E.

Production `main` branches and the active production n8n workflow remain unchanged.

## Candidate branches

- PDF Engine: `pdf-layout-hardening-v1`
- Web Report: `report-v1.1-consumers`

## Automated gates completed

PDF / shared contract regression covers:

- no silent Summary truncation;
- full Task due dates;
- Statistics fallback integrity;
- rich Metrics v1.1;
- Risks description / impact / mitigation;
- intelligent one-page / two-page composition;
- sparse-page packing and asymmetric whitespace;
- meeting type presentation;
- Architecture `process` versus `components` semantics;
- semantic icons v2;
- Telegram v1.1;
- Build Report Metadata v1.1;
- ten-language locale alias matrix;
- shared v1.1 + legacy v1 E2E corpus.

Web automated gates cover:

- v1.1 static consumer compatibility;
- browser visual regression;
- shared v1.1 + legacy v1 browser corpus;
- ten-language browser matrix including RTL process direction;
- prepared report Edge Function response compatibility.

## Language compatibility

Stable persisted/runtime language keys remain:

`en`, `ru`, `es`, `pt`, `tr`, `id`, `hi`, `ar`, `uz`, `fa`.

The product locale for Portuguese is Portuguese (Brazil), but existing storage key `pt` is preserved for backward compatibility. Locale aliases such as `pt-BR`, `ru-RU`, `ar-SA`, `fa-IR` and legacy `in-ID` are normalized at boundaries.

## Read-only production Supabase audit

The production database was inspected without modifying rows.

Observed compatibility facts:

- all currently stored reports with `report_json` are legacy / pre-v1.1;
- production currently stores Portuguese as `pt`;
- root `duration_seconds` exists on many legacy rows while legacy `report_json.stats.duration_seconds` is absent;
- no observed row had conflicting non-null root and JSON duration values;
- legacy Architecture exists in both object and array forms;
- observed owner items are objects with `name`, and many already use `responsibility`;
- some legacy root `participants` values are non-array objects, so v1.1 consumers must not blindly expose them;
- production has rows with `branding_visible=false`.

## Prepared Supabase report API patch

The Web Report branch contains an undeployed candidate Edge Function:

`Supabase/edge-functions/report-v1.1/index.ts`

It enriches the response at read time without migrating stored reports:

- falls back from missing `report_json.stats.duration_seconds` to root `duration_seconds`;
- preserves canonical report participants when present;
- uses legacy root participants only when they are array-shaped;
- exposes `branding_visible`;
- normalizes report language aliases;
- preserves the existing report body and legacy fields.

This function is not deployed to production yet.

## Remaining release gates

1. Rebuild the isolated TEST n8n workflow from the final v1.1 contract.
2. Route a separate test Telegram bot to the TEST workflow.
3. Run at least one real meeting through transcription → GPT → DB → Telegram → Web → PDF.
4. Compare semantic parity across all three report surfaces and inspect the generated PDF visually.
5. Correct any live-only defects.
6. Perform one coordinated production release after final approval.

No production activation should occur before the isolated live E2E checkpoint.
