# Step 5.5 v2 Round 2 Summary

- 判定方式: C（manual）
- Total: 20
- PASS: 1
- WARN: 15
- FAIL: 4
- PASS率（WARN含む）: 80.00%
- 生成内訳: partial=239, fallback_full=1

## FAIL主要パターン
- conditional_modality_shift + certainty_upshift（ID 125）
- subject_action_flip / gratitude_to_request_shift（ID 128）
- action_domain_shift + grammar_degradation（ID 130）
- gratitude_to_request_shift / modality_flip（ID 138）

## WARN主要パターン（頻度順）
- over_formal_overreach: 12
- apology_drop: 2
- modality_soft_shift: 2
- register_mismatch: 2
- certainty_upshift: 2
- gratitude_to_request_shift: 2
- detail_loss: 1
- hearsay_marker_drop: 1
- question_modality_soft_shift: 1
- request_strength_shift: 1
- nuance_hardening: 1

## Round 1比較（重点: over_formal_overreach）
- Round 1: PASS 3 / WARN 15 / FAIL 2 / PASS率（WARN含む）90.00%
- Round 2: PASS 1 / WARN 15 / FAIL 4 / PASS率（WARN含む）80.00%
- over_formal_overreach:
  - Round 1: 8
  - Round 2: 12
  - 差分: +4（減少せず増加）

## 判定
- 再設計後のRound 2では、`over_formal_overreach` は改善せず悪化。
- 特に「感謝文の依頼化」「自己行為の他者依頼化」「控えめ推量の断定化」がFAIL原因として顕在化。
