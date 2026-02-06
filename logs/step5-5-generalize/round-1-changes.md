# Round 1 Changes

## Scope
- Updated files (max 2):
  - src/__tests__/generalize-qa-cases.json
  - src/__tests__/generalize-qa-runner.test.ts

## Applied Rule-Level Changes
1. Auto-check generation refinement
- Negation detection changed from broad pattern to explicit negation markers.
- Certainty check expanded to accept `可能性` alongside `推測/伝聞`.
- Question intent accepted `提案` as an allowed intent class for negative-interrogative suggestions.

2. Conditional interpretation fallback
- Conditional check passes when either:
  - structure payload includes conditional markers, or
  - English translation contains conditional construct (`if/when/in case`).

3. Reverse-translation tolerance
- Meaning retention threshold changed to minimum 1 keyword hit to reduce false negatives from paraphrase.
