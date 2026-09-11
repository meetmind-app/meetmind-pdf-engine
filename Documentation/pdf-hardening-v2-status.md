# PDF Hardening v2 status

Branch: `fix/pdf-hardening-v2`

## Completed
- Root cause isolated: fatal Architecture v2 undersized throw.
- Measurement mismatch between Layout Engine and Architecture v2 documented.
- Repeated immutable font/header asset downloads isolated as a latency source.
- Hardening acceptance contract committed.
- Static P0 regression guard added.
- Intelligence Engine v1.2 ready-to-paste prompt committed with a contract regression test.

## Implementation gate
Core renderer/layout/asset-cache code must be changed and tests must pass before this branch can be proposed for production. Do not merge a docs/tests-only branch.
