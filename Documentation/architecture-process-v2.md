# Architecture & Process v2

Planned after P0 content integrity and intelligent 1/2-page composition hardening.

## Product rule

The report must distinguish between a true sequence/process and a non-sequential semantic structure.

### Process / flow mode
Use arrows only when the meeting evidence supports an actual sequence, dependency, hand-off, pipeline or ordered process.

Expected canonical shape:
- `mode: "process"`
- ordered steps/sections
- optional explicit connections when supported by the transcript
- renderer shows directional flow/arrows

### Structure / components mode
When no real sequence is supported, do not invent arrows.

Expected canonical shape:
- `mode: "components"`
- semantic sections/cards
- no implied directionality

## Implementation scope

1. GPT extraction contract: explicitly classify `architecture.mode` as `process | components` from transcript evidence.
2. Canonical report normalizer: preserve the mode and backward-compatible old architecture payloads.
3. PDF renderer: process mode gets clear connectors/arrows; components mode gets balanced semantic cards without connectors.
4. Web Report: same semantic distinction and consistent ordering.
5. Regression cases: true process, mixed system architecture, no-sequence discussion, empty architecture, long multilingual content and RTL.

Hard rule: never infer a process arrow solely to make the layout look better.