# LOREVI Intelligence Engine v1.1 — n8n patch specification

Source baseline: production workflow `Meeting Assistant v2 (с БД) Prod (1)(1).json`, node `Message a model v.2` / Intelligence Engine v1.0 and node `Build Report Metadata`.

This is an additive patch. Do not change production n8n until PDF/Web consumers accept v1.1 payloads.

## 1. Conversation type

Keep the existing enum and add only meeting classes that materially change report interpretation:

```text
strategy
product
architecture
planning
status
incident
client
board
operations
research
partnership
sales
education
personal
interview
retrospective
workshop
one_on_one
review
other
```

Add one user-facing field:

```json
"meeting_type_label": ""
```

Rules:

- `meeting_type` is a stable machine category.
- `meeting_type_label` is a short localized label that describes the meeting in the target report language.
- Use `interview` when one side is evaluating a candidate/person for a role.
- Do not force a specialized type when evidence is weak; use the closest stable type or `other`.

## 2. Key Metrics v1.1

Replace the current metric structure `{label,value}` with the additive structure below. Existing `label` and `value` remain mandatory for backward compatibility.

```json
{
  "label": "",
  "value": "",
  "context": "",
  "relation": "current|target|current_to_target|previous_to_current|range|change|other",
  "current_value": "",
  "previous_value": "",
  "target_value": "",
  "target_period": ""
}
```

Extraction rules:

- Maximum 5 metrics.
- Preserve numeric meaning exactly.
- `value` is the compact executive display fallback.
- Use `current_to_target` only when both current and target values are explicit.
- Use `previous_to_current` only when both historical/previous and current values are explicit.
- Use `target` when only a target is stated.
- Use `current` when only a current value is stated.
- Use `range`, `change`, or `other` only when they describe the source more accurately.
- `target_period` is populated only when the transcript explicitly gives a target date/period.
- `context` is a short explanation only when the number would otherwise be ambiguous.
- Never infer a target, baseline, direction, unit, date, or period.

Example:

```json
{
  "label": "ARR",
  "value": "8.4M → 10M",
  "context": "Target by Q4",
  "relation": "current_to_target",
  "current_value": "8.4M",
  "previous_value": "",
  "target_value": "10M",
  "target_period": "Q4"
}
```

## 3. Risks v1.1

Keep `title`, `description`, `business_priority` and add optional evidence-backed fields:

```json
{
  "title": "",
  "description": "",
  "business_priority": "critical|high|medium|low",
  "impact": "",
  "mitigation": ""
}
```

Rules:

- Every non-empty risk requires a concrete `description`; a risk title alone is not sufficient.
- `impact` is included only if the likely/observed consequence was explicitly supported by the transcript.
- `mitigation` is included only if a mitigation, response, safeguard, workaround, or next action was explicitly discussed.
- Do not invent impact or mitigation to make the card look complete.

## 4. Architecture & Process v1.1

Keep the current `sections[]` contract and `layout: process|components`.

Tighten the semantic rule:

- `process` means the items in that section have a real ordered sequence, hand-off, lifecycle, pipeline, dependency, or execution flow.
- Preserve process items in execution order.
- Use `components` for systems, domains, modules, actors, products, capabilities, datasets, organizational blocks, or other semantic groupings without a proven sequence.
- Never use `process` merely because several related items were mentioned.
- UI may draw arrows only for `process` sections. `components` sections must never receive invented arrows.

Examples:

```text
Upload → Transcription → AI Analysis → Report
```

is `process`.

```text
Telegram / Web Report / Executive PDF
```

is `components` unless the transcript explicitly describes them as an ordered flow.

## 5. Owners

Canonical structure remains:

```json
{
  "name": "",
  "responsibility": ""
}
```

`responsibility` must describe explicit accountability, not attendance or a guessed role.

## 6. Output JSON schema delta

Add `meeting_type_label` and keep all current fields:

```json
{
  "headline": "",
  "meeting_type": "",
  "meeting_type_label": "",
  "meeting_title": "",
  "meeting_subtitle": "",
  "meeting_objective": "",
  "meeting_importance": "",
  "importance_reason": "",
  "series_title": "",
  "executive_brief": "",
  "key_metrics": [],
  "key_takeaways": [],
  "decisions": [],
  "architecture": { "sections": [] },
  "risks": [],
  "dependencies": [],
  "tasks": [],
  "owners": []
}
```

The GPT node does not generate `schema_version`, `stats`, `participants`, billing data, duration, counts or storage metadata. Those are system fields.

## 7. Build Report Metadata patch

Current production metadata builder sets `participants: {}` and `stats.duration_seconds: null`, while the downstream Insert Meeting node already reads transcription usage seconds. v1.1 must use the same system duration in the canonical report.

Target logic:

```js
const item = $input.first().json;
const now = new Date().toISOString();

const context = $('Normalize Processing Context').first().json;
const reportLanguage = context.meeting_language || context.language || 'en';

const rawDurationSeconds = Number(
  $('Transcribe a recording3').first().json.usage?.seconds || 0
);
const durationSeconds = Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
  ? Math.ceil(rawDurationSeconds)
  : null;

const reportJson = {
  schema_version: '1.1',
  headline: item.headline,
  title: item.meeting_title,
  subtitle: item.meeting_subtitle,
  objective: item.meeting_objective,
  meeting_type: item.meeting_type,
  meeting_type_label: item.meeting_type_label || '',
  importance: item.meeting_importance,
  importance_reason: item.importance_reason,
  language: reportLanguage,
  executive_brief: item.executive_brief,
  key_metrics: item.key_metrics || [],
  key_takeaways: item.key_takeaways || [],
  decisions: item.decisions || [],
  architecture: item.architecture || { sections: [] },
  risks: item.risks || [],
  dependencies: item.dependencies || [],
  tasks: item.tasks || [],
  owners: item.owners || [],
  participants: [],
  stats: {
    duration_seconds: durationSeconds
  }
};
```

The root meeting record should use the same `durationSeconds` value instead of writing a second independent representation.

## 8. Rollout order

1. PDF/Web consumers accept old v1 and new v1.1 payloads.
2. Regression fixtures cover both versions.
3. Test workflow clone receives the prompt + Build Report Metadata patch.
4. Run real meetings and synthetic transcripts across RU/EN plus one RTL language.
5. Compare report semantics, PDF geometry and Telegram output.
6. Only then apply the prompt to production n8n.

Do not migrate existing stored `report_json`; backward compatibility is the migration strategy.