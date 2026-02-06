# Step 5.5 Test Spec Notes

## Principle
- Avoid sentence memorization checks.
- Validate structure-level behavior:
  - negation pattern
  - question intent class
  - conditional construction
  - certainty class
  - reverse-language integrity

## Implemented Spec Choices
- Conditional accepted via structure marker or translation marker.
- Certainty accepts `推測/伝聞/可能性` as low-certainty band.
- Reverse meaning check uses compact major-token retention to allow paraphrase.
