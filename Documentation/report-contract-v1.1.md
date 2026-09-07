# LOREVI Canonical Report Contract v1.1

Status: additive, backward-compatible contract for PDF/Web/Telegram consumers.

## Principles

1. `report_json` is the canonical product payload. UI surfaces must not invent business facts.
2. Existing v1 fields remain valid. v1.1 adds semantic fields; no current field is removed.
3. Numbers remain strings because units, currencies and locale formatting are part of the source meaning.
4. `stats` are system-derived. GPT must not fabricate meeting duration, participant count, task count or decision count.
5. Missing optional semantic fields are omitted or empty; consumers fall back to current v1 rendering.
6. No consumer may silently truncate meaningful content to satisfy layout.

## Root fields

```json
{
  "schema_version": "1.1",
  "headline": "",
  "title": "",
  "subtitle": "",
  "objective": "",
  "meeting_type": "strategy",
  "meeting_type_label": "Стратегическая встреча",
  "importance": "high",
  "importance_reason": "",
  "language": "ru",
  "executive_brief": "",
  "key_metrics": [],
  "key_takeaways": [],
  "decisions": [],
  "architecture": { "sections": [] },
  "risks": [],
  "dependencies": [],
  "tasks": [],
  "owners": [],
  "participants": [],
  "stats": {}
}
```

`meeting_type` stays a stable machine enum. `meeting_type_label` is contextual, user-facing text and may be more specific without expanding the machine enum.

## Key metrics v1.1

Existing metric remains valid:

```json
{ "label": "Выручка", "value": "14 млрд ₽/год" }
```

Richer metric:

```json
{
  "label": "Выручка",
  "value": "9 → 14 млрд ₽/год",
  "context": "Рост за период",
  "relation": "previous_to_current",
  "current_value": "14 млрд ₽/год",
  "previous_value": "9 млрд ₽/год",
  "target_value": "",
  "target_period": ""
}
```

Allowed `relation` values:

- `current`
- `target`
- `current_to_target`
- `previous_to_current`
- `range`
- `change`
- `other`

Rules:

- `value` remains the backward-compatible display fallback.
- `current_value`, `previous_value`, `target_value`, `target_period` are populated only when explicitly supported by the source meeting.
- Consumers may derive a visual `A → B` representation from semantic fields, but may not infer missing targets or dates.
- Icon and accent selection is a presentation concern and must be derived from semantic meaning, not array position.

## Risks v1.1

```json
{
  "title": "Платёжный контур",
  "description": "Международные рекуррентные платежи могут потребовать посредника.",
  "business_priority": "high",
  "impact": "Рост комиссии и снижение маржи",
  "mitigation": "Проверить альтернативных провайдеров до масштабирования"
}
```

`impact` and `mitigation` are optional and must be source-supported. `description` remains the required explanatory field for any non-empty risk.

## Owners v1.1

Canonical owner shape:

```json
{ "name": "Николай", "responsibility": "Принять решение по запуску" }
```

Consumers must read `responsibility` first and keep backward fallbacks for legacy `role` / `title`.

## Architecture & Process

Architecture keeps the current section/item model. `layout` is semantic:

```json
{
  "sections": [
    {
      "title": "Research",
      "layout": "process",
      "items": []
    }
  ]
}
```

- `process`: use only when a real sequence, hand-off, pipeline or dependency is present. UI may show arrows.
- `components`: semantic grouping without an evidenced sequence. UI must not invent arrows.

## Compatibility

Consumers should apply this order:

1. semantic v1.1 field;
2. existing v1 field;
3. empty state / omit block.

A v1 payload must render without migration. A v1.1 payload must not lose its richer semantic information even when the current visual surface chooses a simpler representation.