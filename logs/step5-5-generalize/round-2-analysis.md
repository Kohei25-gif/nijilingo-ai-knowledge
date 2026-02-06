# Round 2 Analysis

## Summary
- Pass rate: 92% (92/100)
- Fail: 8, Error: 0

## Cause Classification
- TEST_SPEC_ERROR: 8
  - Remaining failures were auto_check artifacts:
    - `かもしれない` wrongly treated as conditional (`if/when`) in some cases.
    - Reverse keyword extraction still chose unstable fragments.
    - Some negative meanings were expressed lexically (e.g., `busy`, `hard`) instead of explicit `not`.
- STRUCTURAL_RULE_MISSING: 0
- GUARD_MISSING: 0
- MODEL_LIMIT: 0

## Pattern Analysis
1. Negation lexicalization pattern
- Pattern: Japanese negation translated to lexical negatives without explicit "not".
- Example IDs: G033, G076, G090, G096.

2. Conditional false-positive pattern
- Pattern: `もしかしたら` interpreted as conditional marker.
- Example IDs: G059.

3. Keyword-fragment pattern
- Pattern: reverse keyword extraction produced unstable fragments.
- Example IDs: G052, G072, G099.
