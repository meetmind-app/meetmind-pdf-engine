# PDF Design Polish v2

Status: implementation complete; release gated by visual regression.

## Product behavior

- Five metrics use a full-width `3 + 2` grid. The final two cards divide the same usable width as the first three.
- Metric cards use natural row height derived from label, value and context wrapping. Unused page space is not converted into empty card interiors.
- Numeric fragments in metric values use bold typography. Units, arrows and explanatory words remain regular. Detection is Unicode numeric, not language- or phrase-specific.
- Risk `impact` and `mitigation` are rendered from their structured fields with localized bold labels and regular values.
- Risk description, impact and mitigation share one wrapping flow. There is no mandatory line break before the supplemental fields.

## Compatibility

- Existing semantic icons remain unchanged.
- Legacy `{ label, value }` metrics remain supported.
- Structured v1.1 metric and risk fields remain canonical.
- RU, EN, FA and AR are mandatory visual release gates.

## Automated evidence

- `Tests/pdf-design-polish-v2.test.js`
- Full Content Integrity suite
- `Tests/visual-regression-runner.mjs`
