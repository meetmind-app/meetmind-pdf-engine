# Intelligence Engine v1.2 — change notes

Ready-to-paste prompt: `Documentation/n8n-intelligence-engine-v1.2-ready.txt`.

Compatibility decision: keep `meeting_importance` in GPT output for the current downstream canonicalizer; add `meeting_type_label` additively. Do not switch the GPT output field to canonical `importance` until the actual production `Build Report Metadata` node is audited/updated atomically.

Changes from the supplied production baseline:
- Brand/version: LOREVI Intelligence Engine v1.2.
- Adds meeting types: interview, retrospective, workshop, one_on_one, review.
- Adds `meeting_type_label`.
- Rich metrics: context, relation, current/previous/target values, target period.
- Rich risks: impact and mitigation only when transcript-supported.
- Tightens process/components semantics; mixed section layouts remain first-class.
- Tightens owners, due dates and dependencies against inference.
- Explicitly prohibits GPT-generated duration, participant counts, billing and other system stats.
- Replaces destructive compression guidance with: preserve material facts first, compress wording second.

Manual production change is intentionally gated until downstream `Build Report Metadata` compatibility is confirmed.
