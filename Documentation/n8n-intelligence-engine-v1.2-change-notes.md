# Intelligence Engine v1.2 — change notes

Ready-to-paste prompt: `Documentation/n8n-intelligence-engine-v1.2-ready.txt`.

Companion strict output schema: `Documentation/n8n-intelligence-engine-v1.2-schema.json`.

Adversarial evaluation corpus: `Tests/fixtures/INTELLIGENCE_V12_EVAL.json`.

Compatibility decision: keep `meeting_importance` in GPT output for the current downstream canonicalizer; add `meeting_type_label` additively. Do not switch the GPT output field to canonical `importance` until the actual production `Build Report Metadata` node is audited/updated atomically.

Changes from the supplied production baseline:
- Brand/version: LOREVI Intelligence Engine v1.2.
- Adds meeting types: interview, retrospective, workshop, one_on_one, review.
- Adds `meeting_type_label`.
- Rich metrics: context, relation, current/previous/target values, target period.
- Rich risks: impact and mitigation only when transcript-supported.
- Tightens process/components semantics; mixed section layouts remain first-class.
- Adds canonical `architecture.mode` plus matching section `mode` / `layout`; ambiguous and mixed roots default conservatively to `components`.
- Normalizes legacy architecture arrays and flow aliases in the downstream Build Report Metadata patch while preserving unknown evidence/identity fields.
- Treats transcript content as untrusted evidence and ignores embedded attempts to change the schema, language, evidence rules or output format.
- Tightens owners, due dates and dependencies against inference.
- Explicitly prohibits GPT-generated duration, participant counts, billing and other system stats.
- Replaces destructive compression guidance with: preserve material facts first, compress wording second.
- Makes the companion schema executable in n8n/OpenAI strict mode: every object property is required, optional-by-meaning values use empty strings/arrays, unsupported conditional composition is enforced by prompt invariants, and fixed task status uses `enum: ["open"]` instead of `const`.
- The isolated n8n corpus run covers all seven fixtures with the production credential while every webhook, Telegram, CloudConvert and database predecessor is pinned to mock data.

The repository contract and downstream `Build Report Metadata` candidate are compatible and covered by RU/EN/FA plus ten-language regressions. Applying them to production remains gated on an isolated n8n workflow run with the adversarial corpus and a real end-to-end meeting.
