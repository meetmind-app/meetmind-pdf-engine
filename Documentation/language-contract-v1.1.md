# LOREVI Language Contract v1.1

Status: release contract for GPT output metadata, Telegram, Web Report and Executive PDF.

## Product languages

LOREVI supports ten report languages:

- English
- Russian
- Spanish
- Portuguese (Brazil)
- Turkish
- Indonesian
- Hindi
- Arabic
- Uzbek
- Persian

## Stable persisted/runtime keys

For backward compatibility with existing meetings and consumer code, stored report-language keys are:

```text
en
ru
es
pt
tr
id
hi
ar
uz
fa
```

`pt` means the product locale Portuguese (Brazil). User-facing locale metadata may use `pt-BR`, but `report_language` and `report_json.language` remain `pt` until a separately versioned migration changes that storage contract.

## Accepted aliases

Boundary normalizers must accept locale variants and reduce them to the stable runtime key:

```text
en-US -> en
ru-RU -> ru
es-ES -> es
pt-BR / pt_BR / pt -> pt
tr-TR -> tr
id-ID -> id
in-ID -> id
hi-IN -> hi
ar-SA -> ar
uz-UZ -> uz
fa-IR -> fa
```

Unsupported language identifiers fall back to `en`.

## RTL

Only `ar` and `fa` are RTL report languages in v1.1.

Directional process connectors must follow reading direction:

- LTR process: `A → B`
- RTL process: `A ← B`

A `components` architecture section never receives directional connectors in any language.

## Consumer rule

Every boundary may accept aliases, but after normalization the same stable language key must be used consistently by:

- root `report_language`;
- `report_json.language`;
- Telegram localization;
- Web Report localization;
- PDF localization.

Consumers must continue rendering legacy stored reports without migration.
