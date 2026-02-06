# Step 5.5 v2 Round 3 Summary

- 判定方式: C（manual）
- 対象ID: 141-150（10件）
- Total: 10
- PASS: 0
- WARN: 6
- FAIL: 4
- PASS率（WARN含む）: 60.00%
- 生成内訳: partial=120, fallback_full=0

## FAIL主要パターン
- report_to_request_shift（ID 144）
- subject_action_flip / desire_to_request_shift（ID 145）
- gratitude_to_request_shift / modality_flip（ID 148）
- self_state_to_confirmation_request / modality_flip（ID 150）

## WARN主要パターン（頻度順）
- over_formal_overreach: 10
- report_to_request_shift: 2
- apology_drop: 1
- softening_drift: 1
- certainty_upshift: 1
- added_commitment: 1

## Round 2比較（1箇所修正後の効果）
- Round 2（20件）: PASS 1 / WARN 15 / FAIL 4、PASS率（WARN含む）80.00%
- Round 3（10件）: PASS 0 / WARN 6 / FAIL 4、PASS率（WARN含む）60.00%

### 注目指標: over_formal_overreach
- Round 2: 12/20（60%）
- Round 3: 10/10（100%）
- 比較: 割合ベースで悪化（+40pt）

## 一次結論
- `PARTIAL_SYSTEM_PROMPT` の1箇所強化だけでは、過剰儀礼化・モダリティ反転を抑えきれなかった。
- 次の最小修正候補は、`translatePartial` 側の toneStyle（business/formal 75/100）で「依頼構文テンプレート」を禁止し、報告/感謝文に依頼文を差し込めないようにすること。
