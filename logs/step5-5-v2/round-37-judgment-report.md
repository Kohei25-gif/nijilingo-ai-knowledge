# Round 37 判定結果レポート

- **判定者**: クロちゃん（Claude Opus）
- **日時**: 2026-02-07
- **対象**: 文151〜155（round-37-outputs.json）
- **モデル**: Scout (Llama 4)

## 総合結果

| | PASS | WARN | FAIL | 計 |
|--|------|------|------|----|
| 文151 | 8 | 4 | 0 | 12 |
| 文152 | 10 | 2 | 0 | 12 |
| 文153 | 8 | 3 | 1 | 12 |
| 文154 | 4 | 3 | 5 | 12 |
| 文155 | 12 | 0 | 0 | 12 |
| **合計** | **42** | **12** | **6** | **60** |

**PASS率（WARN含む）: 90% (54/60)**

### 推移
R34: 63% → R35: 73% → R36: 82% → **R37: 90%** (+8pt)

---

## 解消されたパターン（R36→R37）

| パターン | R36 | R37 |
|----------|-----|-----|
| certainty_flip | 4 | **0** ✅ |
| gratitude_to_request_flip | 3 | **0** ✅ |
| pleasure_polarity_flip | 0 | **0** ✅ 維持 |
| report_to_request_flip | 0 | **0** ✅ 維持 |
| casual_lol_injection | 0 | **0** ✅ 維持 |

## 残存FAILパターン

### stance_strength_amplification（5件）

「ちょっと」（a bit）がトーンレベルに比例して増幅される。モデルが「トーンを上げる」＝「感情の強度も上げる」と混同。

| 文 | tone | % | 出力 | 問題 |
|----|------|---|------|------|
| 154 | casual | 50 | "Honestly, I'm super anxious." | "super" ≠ "ちょっと" |
| 154 | casual | 75 | "I'm totally freaking out." | 「正直」消失、パニック表現 |
| 154 | casual | 100 | "I'm completely losing it." | 逆翻訳「完全に頭がおかしくなってる」＝別の意味 |
| 154 | polite | 100 | "considerably apprehensive" | "considerably" ≠ "ちょっと" |
| 154 | business | 100 | "considerable degree of unease" | "considerable" ≠ "ちょっと" |

### apology_drop（1件）

| 文 | tone | % | 出力 | 問題 |
|----|------|---|------|------|
| 153 | business | 100 | "It is imperative that this task be completed with the utmost urgency." | 「悪いけど」（謝罪）が完全消失、依頼→命令に変質 |

---

## 文別詳細

### 文151:「その話、後回しでもいい？」
意図=確認 / 感情極性=neutral / モダリティ=質問 / 確信度=推測

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | |
| casual 75 | ✅ PASS | |
| casual 100 | ✅ PASS | |
| polite 25 | ✅ PASS | |
| polite 50 | ⚠️ WARN | "at a later juncture" 50%にしては硬すぎ |
| polite 75 | ✅ PASS | |
| polite 100 | ⚠️ WARN | "Might it be feasible" 冗長すぎ。質問形は維持 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ⚠️ WARN | "at a later date" は「後回し」より「別日」のニュアンス |
| business 100 | ⚠️ WARN | "potentially consider bringing up" 冗長。意味は維持 |

### 文152:「今日、電車めっちゃ混んでた。」
意図=報告 / 感情極性=negative / モダリティ=報告 / 確信度=確定

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | "totally packed" 良いカジュアル表現 |
| casual 75 | ✅ PASS | "ridiculously packed" 良い |
| casual 100 | ✅ PASS | "hella packed" スラング適切 |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | |
| polite 75 | ⚠️ WARN | 25%と同一。差分なし |
| polite 100 | ✅ PASS | "exceedingly" 語彙格上げ、報告形維持 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ⚠️ WARN | 25%と同一。差分なし |
| business 100 | ✅ PASS | 報告形維持 |

### 文153:「悪いけど、これ急ぎでお願い。」
意図=依頼 / 感情極性=negative / モダリティ=依頼 / 確信度=確定

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | |
| casual 75 | ✅ PASS | |
| casual 100 | ✅ PASS | |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | |
| polite 75 | ✅ PASS | |
| polite 100 | ⚠️ WARN | "eternally grateful" + "gravity" は過剰。意図=依頼は維持 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ⚠️ WARN | "I must stress" 依頼→指示寄り。「悪いけど」が薄い |
| business 100 | ❌ FAIL | apology_drop + modality_shift: 謝罪消失、依頼→命令 |

### 文154:「正直、ちょっと不安。」
意図=報告 / 感情極性=negative / モダリティ=報告 / 確信度=確定

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "pretty" > "ちょっと" |
| casual 50 | ❌ FAIL | stance_strength_amplification: "super anxious" |
| casual 75 | ❌ FAIL | stance_strength_amplification + meaning_loss: "totally freaking out" |
| casual 100 | ❌ FAIL | meaning_change: "completely losing it" = 別の意味 |
| polite 25 | ✅ PASS | fallback |
| polite 50 | ✅ PASS | "somewhat apprehensive" ≈ 「ちょっと不安」 |
| polite 75 | ⚠️ WARN | "rather uneasy" やや強いが許容範囲 |
| polite 100 | ❌ FAIL | stance_strength_amplification: "considerably apprehensive" |
| business 25 | ✅ PASS | "a bit apprehensive" |
| business 50 | ✅ PASS | "somewhat uneasy" |
| business 75 | ⚠️ WARN | "discomfort" は「不安」より「不快感」 |
| business 100 | ❌ FAIL | stance_strength_amplification: "considerable degree of unease" |

### 文155:「もし間違ってたら教えてほしい。」
意図=質問 / 感情極性=neutral / モダリティ=質問 / 確信度=推測

全12件 ✅ PASS（完全PASS）

---

## R37で適用した主要修正

1. **PARTIAL_SYSTEM_PROMPT**: パッチの山→クリーンな統合版に全文差し替え
2. **toneStyle**: 矛盾する英語フレーズ例を全削除（"I would be grateful if...", "It is with great pleasure..."等）
3. **userPrompt**: 重複排除・スリム化
4. **getToneInstruction**: FULL用の英語例文も全削除
5. **全体**: プロンプト大幅短縮

## 次のアクション

Round 38でstance_strength_amplification（5件）とapology_drop（1件）に対応。
MEANING LOCKに「程度修飾語は意味の一部」「複合発話は全要素保持」を追加。
