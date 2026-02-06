# Round 1 Analysis

## Summary
- Pass rate: 63% (63/100)
- Fail: 37, Error: 0
- Main issue: auto_checks specification was too strict and produced false negatives.

## Cause Classification
- TEST_SPEC_ERROR: 34
  - Negation auto-check over-detected negatives.
  - Reverse-translation meaning check used brittle exact tokens.
  - Conditional detection required structure labels that extractor does not always emit.
- STRUCTURAL_RULE_MISSING: 3
  - Certainty label mismatch around possibility vs inference labels.
- GUARD_MISSING: 0
- MODEL_LIMIT: 0

## Pattern Analysis
1. Negation over-detection pattern
- Pattern: broad negation capture caused non-negative or paraphrased negatives to fail.
- Example IDs: G002, G004, G010, G017, G033, G058, G080.

2. Conditional detection mismatch pattern
- Pattern: sentence is conditional in Japanese/English output but structure payload lacked explicit conditional marker.
- Example IDs: G005, G019, G028, G045, G066, G095.

3. Reverse paraphrase mismatch pattern
- Pattern: reverse translation preserved meaning but not exact lexical tokens.
- Example IDs: G001, G006, G014, G021, G031, G035.
