# Step 5.5 v2 Round 1 WARN内訳（15件）

- 対象WARNケース: 101, 103, 105, 106, 107, 108, 110, 111, 113, 114, 115, 116, 117, 118, 120
- WARN件数: 15
- パターンタグ総数（重複カウント）: 24

## パターン別（頻度順）

1. `over_formal_overreach` - 8件
   - 101, 107, 108, 110, 111, 113, 114, 120

2. `detail_loss` - 2件
   - 108, 118

3. `tone_gradient_flatten` - 2件
   - 115, 117

4. `apology_drop` - 1件
   - 103

5. `conditional_action_drift` - 1件
   - 105

6. `inability_to_request_shift` - 1件
   - 106

7. `tone_jump_excess` - 1件
   - 107

8. `emotional_polarity_softened` - 1件
   - 110

9. `hearsay_marker_drop` - 1件
   - 111

10. `modality_soft_shift` - 1件
    - 113

11. `tense_aspect_drift` - 1件
    - 114

12. `register_mismatch` - 1件
    - 116

13. `politeness_overshoot` - 1件
    - 116

14. `temporal_detail_drop` - 1件
    - 117

15. `grammar_degradation` - 1件
    - 120

## 補足

- `stable_question_modality` と `stable_reference_question` はPASSケース由来タグなのでWARN内訳から除外。
- WARN主要因は「高トーンでの過剰儀礼化（over_formal_overreach）」が中心。
