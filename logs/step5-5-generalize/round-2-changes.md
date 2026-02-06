# Round 2 Changes

## Scope
- Updated file (max 2):
  - src/__tests__/generalize-qa-cases.json

## Applied Rule-Level Changes
1. Conditional marker rule hardening
- Added separation for `もし`-condition vs uncertainty phrases around `かもしれない/もしかしたら`.

2. Negation check generalization
- Negation translation check allows structural negatives and lexical negatives:
  - not/can't/don't/no
  - hard/difficult/unable/bad/busy/limit

3. Reverse keyword extraction generalization
- Replaced brittle phrase extraction with compact meaning-token extraction based on major Japanese characters.
