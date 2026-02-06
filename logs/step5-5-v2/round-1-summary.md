# Step 5.5 v2 Round 1 Summary

- 判定方式: C（manual）
- Total: 20
- PASS: 3
- WARN: 15
- FAIL: 2
- PASS率（WARN含む）: 90.00%
- 生成内訳: partial=239, fallback_full=1

## FAIL主要パターン
- discomfort_semantic_drift: 曖昧な違和感が身体症状へ変質
- certainty_flip / accusation_shift: 推測が断定非難へ反転

## WARN主要パターン（頻度順）
- over_formal_overreach: 8
- stable_question_modality: 2
- detail_loss: 2
- tone_gradient_flatten: 2
- apology_drop: 1
- over_intensification: 1
- conditional_action_drift: 1
- inability_to_request_shift: 1
- tone_jump_excess: 1
- emotional_polarity_softened: 1
- hearsay_marker_drop: 1
- modality_soft_shift: 1
- tense_aspect_drift: 1
- register_mismatch: 1
- politeness_overshoot: 1
- temporal_detail_drop: 1
- stable_reference_question: 1
- grammar_degradation: 1

## 次段の設計インプット（プロンプト再設計用）
- 高トーンでの過剰儀礼化を抑制する制約が必要（over_formal_overreach）。
- 推測/伝聞の確信度を断定へ上げない明示的ルールが必要（certainty preservation）。
- 原文の補助情報（謝罪、気づき、今日など）の脱落防止ルールが必要。
- 25→100のトーン勾配は差分最小/最大を定義して安定化が必要。