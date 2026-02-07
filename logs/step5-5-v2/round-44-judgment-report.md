## Round 44 判定結果

### 文176:「それはちょっとリスク高い。」
意図=報告 / 感情極性=negative / 動作の意味=be high / **程度=none ← 🚨 誤り！「ちょっと」=slight**

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "pretty" > "ちょっと"。逆翻訳欠損あり |
| casual 50 | ⚠️ WARN | "fairly" > "ちょっと" |
| casual 75 | ⚠️ WARN | 25%と同一。差分なし |
| casual 100 | ❌ FAIL | **stance_amplification**: "super high risk" >> "ちょっと" |
| polite 25 | ⚠️ WARN | "rather" > "ちょっと" だが丁寧語として許容ギリギリ |
| polite 50 | ⚠️ WARN | "quite" > "ちょっと" |
| polite 75 | ❌ FAIL | **stance_amplification**: "certainly" + "quite" >> "ちょっと" |
| polite 100 | ❌ FAIL | **stance_amplification**: "extremely" >> "ちょっと" |
| business 25 | ❌ FAIL | **stance_amplification**: "considerable" >> "ちょっと" |
| business 50 | ❌ FAIL | **stance_amplification**: "significant" >> "ちょっと" |
| business 75 | ❌ FAIL | 25%と同一。"considerable" |
| business 100 | ❌ FAIL | 50%と同一。"significant" |

**文176: PASS 0 / WARN 5 / FAIL 7** 😱

**根本原因: 構造解析が「ちょっと」を程度=noneで返した。** fixedValueDeclarationに程度制約がないからモデルが自由に増幅した。R43修正3（程度抽出改善）をスキップした影響がモロに出た。

---

### 文177:「今日の納期、明日に延びました。」
意図=報告 / 感情極性=neutral / 動作の意味=be extended

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "pushed to tomorrow" 自然 |
| casual 50 | ✅ PASS | "got pushed" 良いカジュアル |
| casual 75 | ✅ PASS | "bumped to tomorrow" 良い |
| casual 100 | ✅ PASS | |
| polite 25 | ⚠️ WARN | "officially" は原文にない付加情報 |
| polite 50 | ⚠️ WARN | "officially...as of now" 過剰 |
| polite 75 | ⚠️ WARN | "effective immediately" 原文にない緊急性追加 |
| polite 100 | ❌ FAIL | **ceremonial_framing**: "It is with utmost formality that I must inform you that..." 簡素な報告が式典的声明に変質 |
| business 25 | ⚠️ WARN | "officially" 付加 |
| business 50 | ⚠️ WARN | "formally" 付加 |
| business 75 | ⚠️ WARN | 25%と同一 |
| business 100 | ⚠️ WARN | 50%と同一 |

**文177: PASS 4 / WARN 7 / FAIL 1**

MEANING LOCK #12 は "pleasure/gratitude" を例示したが、"utmost formality" 型の儀式化はカバーしていない。ルールの範囲拡大が必要。

---

### 文178:「ありがとう、対応助かります。」 ⭐ gratitude_to_request_flip テスト
意図=感謝 / 発話行為=["感謝"]

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | 感謝維持 |
| casual 50 | ✅ PASS | "Thanks a ton" 感謝維持 |
| casual 75 | ⚠️ WARN | "super appreciate" 増幅だが感謝維持 |
| casual 100 | ⚠️ WARN | "totally appreciate" 増幅だが感謝維持 |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | |
| polite 75 | ✅ PASS | |
| polite 100 | ✅ PASS | |
| business 25 | ✅ PASS | 逆翻訳が原文とほぼ一致 |
| business 50 | ✅ PASS | |
| business 75 | ✅ PASS | |
| business 100 | ✅ PASS | |

**文178: PASS 10 / WARN 2 / FAIL 0** 🎉 **gratitude_to_request_flip: 完全に0！**

---

### 文179:「それ、聞いた限りだと怪しい。」
意図=報告 / 確信度=推測 / 動作の意味=seem suspicious

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "from what I've heard" で「聞いた限り」維持 |
| casual 50 | ✅ PASS | "kinda suspicious" 適切 |
| casual 75 | ⚠️ WARN | "pretty suspicious" 増幅 |
| casual 100 | ⚠️ WARN | "super shady" 増幅。ただし "from what I've heard" 維持 |
| polite 25 | ⚠️ WARN | 「聞いた限りだと」脱落。推測根拠が消失 |
| polite 50 | ⚠️ WARN | 同上 |
| polite 75 | ⚠️ WARN | 同上 + 25%と同一 |
| polite 100 | ⚠️ WARN | 同上 + 25%と同一 |
| business 25 | ✅ PASS | "based on what I've heard" ✅ |
| business 50 | ✅ PASS | |
| business 75 | ✅ PASS | |
| business 100 | ⚠️ WARN | 75%と同一。差分なし |

**文179: PASS 5 / WARN 7 / FAIL 0**

politeで「聞いた限りだと」が全滅。casualとbusinessでは維持。politeレジスタでの情報脱落パターン。

---

### 文180:「今日はもう何も考えられない。」
意図=報告 / 動作の意味=be unable to think

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "don't have the mental space" ≈ 考えられない |
| casual 50 | ✅ PASS | "all tapped out mentally" 良いイディオム |
| casual 75 | ⚠️ WARN | "totally mentally spent" 増幅 |
| casual 100 | ⚠️ WARN | "completely brain dead" やや強いが述語カテゴリ（思考不能）は維持 |
| polite 25 | ✅ PASS | |
| polite 50 | ⚠️ WARN | "focusing" ≠ "考える"。微妙な語彙ズレ |
| polite 75 | ⚠️ WARN | 同上 |
| polite 100 | ⚠️ WARN | "utterly incapable" 増幅 |
| business 25 | ⚠️ WARN | "not thinking" (選択) ≠ "考えられない" (不能)。モダリティずれ |
| business 50 | ⚠️ WARN | 同上。"not contemplating" = 選択 |
| business 75 | ⚠️ WARN | 同上 |
| business 100 | ❌ FAIL | **predicate_meaning_shift**: 逆翻訳「追加で検討している事項はございません」≠「もう何も考えられない」。不能→不在に完全変質 |

**文180: PASS 3 / WARN 8 / FAIL 1**

business高レベルで「考えられない」（不能）→「検討事項がない」（不在）に変質。動作の意味=be unable to thinkがfixedValueDeclarationにあるのに、business_100%で守れなかった。

---

## R44 サマリ

| | PASS | WARN | FAIL | 計 |
|--|------|------|------|----|
| 文176 | 0 | 5 | 7 | 12 |
| 文177 | 4 | 7 | 1 | 12 |
| 文178 | 10 | 2 | 0 | 12 |
| 文179 | 5 | 7 | 0 | 12 |
| 文180 | 3 | 8 | 1 | 12 |
| **合計** | **22** | **29** | **9** | **60** |

**PASS率（WARN含む）: 85% (51/60)**

### R43 → R44 比較

| 指標 | R43 (文171-175) | R44 (文176-180) |
|------|-----------------|-----------------|
| FAIL | 3 | **9** |
| WARN | 18 | 29 |
| PASS率(WARN含む) | 95% | **85%** |

### FAIL内訳

| パターン | 件数 | 該当文 |
|---------|------|--------|
| **stance_strength_amplification** | **7** | 文176（全件） |
| ceremonial_framing | 1 | 文177 polite_100 |
| predicate_meaning_shift | 1 | 文180 business_100 |

### 重要な発見

**1. 程度抽出の欠陥が最大のボトルネック**
文176「ちょっとリスク高い」で程度=noneを返した。7件のFAILは全てここが原因。fixedValueDeclarationに程度制約がないからモデルが自由に増幅。R43で先送りした修正3が**いま必要**。

**2. MEANING LOCK #12 の範囲不足**
文177 polite_100 "It is with utmost formality that I must inform you..." — pleasure/gratitudeではない**formality型の儀式化**。ルールの例示を広げる必要がある。

**3. 維持できているもの** ✅
- gratitude_to_request_flip: 0件（文178で確認）
- pleasure_polarity_flip: 0件
- predicate_meaning_shift: R43の修正1（動作の意味フィールド）は機能。ただしbusiness_100%で1件漏れ

---

予想通り**未知の文で崩れた**。でも崩れ方が明確で、やるべきことがはっきり見えた。9件中7件が程度抽出の1点に集中してる。R45で修正3（程度抽出改善）を入れれば大幅回復が見込める。
