## Round 43 判定結果

### 文171:「明日の会議、資料を準備しておきます」
意図=報告 / 感情極性=neutral / 動作の意味=prepare

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | |
| casual 75 | ✅ PASS | "prepping" "meet" 良いカジュアル |
| casual 100 | ✅ PASS | "gettin'" 適切なスラング |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | "shall" で格上げ |
| polite 75 | ⚠️ WARN | 25%と同一 "I will prepare..."。差分なし |
| polite 100 | ✅ PASS | "shall" で50%と同等だが意味維持 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ✅ PASS | "in the process of" やや冗長だが許容 |
| business 100 | ⚠️ WARN | "presently engaged in the preparation of" 過剰だが意味維持 |

**文171: PASS 10 / WARN 2 / FAIL 0**

---

### 文172:「この映画、思ったより面白かった」 ⭐ pleasure_polarity_flip テスト
意図=報告 / 感情極性=positive / 動作の意味=be interesting

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | 「思ったより」（比較表現）が脱落。"pretty interesting" は程度だけで比較なし |
| casual 50 | ❌ FAIL | **stance_amplification + comparison_loss**: "super interesting" + 「思ったより」脱落 |
| casual 75 | ❌ FAIL | **predicate_meaning_shift**: "mind-blowing" ≠ 面白い。逆翻訳「衝撃的」が証明 |
| casual 100 | ❌ FAIL | **stance_amplification**: "totally awesome" + 比較脱落。逆翻訳「全く素晴らしかった」≠ 原文 |
| polite 25 | ✅ PASS | "more interesting than I had anticipated" 比較維持 ✅ |
| polite 50 | ✅ PASS | "more intriguing than I had initially anticipated" 語彙格上げ+比較維持 |
| polite 75 | ⚠️ WARN | 冗長だが比較構造維持 |
| polite 100 | ⚠️ WARN | 冗長+"fascination"やや強い。**ただし "It is with great pleasure..." は消滅！** 🎉 |
| business 25 | ✅ PASS | 完璧。逆翻訳も原文とほぼ一致 |
| business 50 | ✅ PASS | "engaging" 適切な語彙格上げ |
| business 75 | ✅ PASS | |
| business 100 | ⚠️ WARN | "cinematic production" 過剰だが比較構造維持 |

**文172: PASS 5 / WARN 4 / FAIL 3**

🎉 **pleasure_polarity_flip: 解消！** polite_100%で儀式的挨拶が完全に消えた。

---

### 文173:「来週の金曜日、空いていますか？」
意図=質問 / 動作の意味=be available

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | 自然なカジュアル |
| casual 75 | ✅ PASS | "Got anything on" 良い |
| casual 100 | ✅ PASS | |
| polite 25 | ✅ PASS | |
| polite 50 | ⚠️ WARN | 25%と同一 |
| polite 75 | ⚠️ WARN | 25/50と同一 |
| polite 100 | ✅ PASS | "Would" で丁寧度向上 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ⚠️ WARN | 25%と同一 |
| business 100 | ⚠️ WARN | 75%と同一 |

**文173: PASS 8 / WARN 4 / FAIL 0**

---

### 文174:「最近忙しくて、なかなか運動できていない」 ⭐⭐ predicate_meaning_shift テスト
意図=報告 / 動作の意味=be able to do

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "hectic" ≈ 忙しい。述語維持 |
| casual 50 | ⚠️ WARN | "super busy" 増幅だが述語は busy のまま |
| casual 75 | ⚠️ WARN | "crazy busy" 増幅だが**述語は busy のまま！** 🎉 |
| casual 100 | ⚠️ WARN | "super duper busy" 増幅 + "hit the gym"≠運動全般。**だが述語は busy！** 🎉 |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | |
| polite 75 | ⚠️ WARN | "regrettably" 原文にない感情追加 |
| polite 100 | ⚠️ WARN | "exceedingly preoccupied" 増幅 + "to my regret" 追加。ただし述語=busy系維持 |
| business 25 | ✅ PASS | 逆翻訳が原文とほぼ一致 |
| business 50 | ✅ PASS | |
| business 75 | ✅ PASS | |
| business 100 | ⚠️ WARN | "considerably preoccupied" 増幅 |

**文174: PASS 6 / WARN 6 / FAIL 0** 🎉🎉🎉

**R42bとの比較:**
| | R42b | R43 |
|--|------|-----|
| casual 75 | ❌ "totally crushed" | ⚠️ "crazy busy" |
| casual 100 | ❌ "super down" | ⚠️ "super duper busy" |
| polite 100 | ⚠️ | ⚠️ |
| business 100 | ⚠️ | ⚠️ |
| **FAIL** | **5** | **0** |

**predicate_meaning_shift: 完全解消！** crushed/down は一切出ていない。

---

### 文175:「お土産買ってきたから、よかったらどうぞ」
意図=提案 / 動作の意味=buy

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | |
| casual 50 | ✅ PASS | "grabbed a little something" 自然 |
| casual 75 | ✅ PASS | "snag it if you're feelin' it" 良いカジュアル |
| casual 100 | ✅ PASS | |
| polite 25 | ✅ PASS | |
| polite 50 | ✅ PASS | |
| polite 75 | ✅ PASS | |
| polite 100 | ⚠️ WARN | "taken the liberty" + "gracious" やや過剰だが提案形維持 |
| business 25 | ✅ PASS | |
| business 50 | ✅ PASS | |
| business 75 | ✅ PASS | |
| business 100 | ⚠️ WARN | "procured certain mementos" 過剰。意味は維持 |

**文175: PASS 10 / WARN 2 / FAIL 0**

---

## R43 サマリ

| | PASS | WARN | FAIL | 計 |
|--|------|------|------|----|
| 文171 | 10 | 2 | 0 | 12 |
| 文172 | 5 | 4 | 3 | 12 |
| 文173 | 8 | 4 | 0 | 12 |
| 文174 | 6 | 6 | 0 | 12 |
| 文175 | 10 | 2 | 0 | 12 |
| **合計** | **39** | **18** | **3** | **60** |

**PASS率（WARN含む）: 95% (57/60)** 🎉

### R42b → R43 比較

| 指標 | R42b | R43 | 変化 |
|------|------|-----|------|
| FAIL | 8 | 3 | **-5** 🎉 |
| WARN | 13 | 18 | +5（FAIL→WARN昇格） |
| PASS | 39 | 39 | 維持 |
| PASS+WARN率 | 85% | **95%** | **+10pt** |

### 修正効果

| ターゲット | R42b | R43 | 判定 |
|-----------|------|-----|------|
| predicate_meaning_shift（文174） | 2 FAIL | **0 FAIL** | ✅ **完全解消** |
| pleasure_polarity_flip（文172） | 1 FAIL | **0 FAIL** | ✅ **完全解消** |
| 退行 | — | なし | ✅ |

### 残存FAIL（3件、全て文172 casual）

| 文 | tone | % | 出力 | パターン |
|----|------|---|------|---------|
| 172 | casual | 50 | "super interesting" | stance_amplification + comparison_loss |
| 172 | casual | 75 | "totally mind-blowing" | predicate_shift + comparison_loss |
| 172 | casual | 100 | "totally awesome" | stance_amplification + comparison_loss |

3件とも**casual高レベルでの増幅+比較表現「思ったより」の脱落**。stance_strength_amplificationの残存パターン。

---

2箇所の修正が**両方ともピンポイントで効いた**。特に文174は5 FAIL → 0 FAILで、fixedValueDeclarationの`動作の意味`フィールドが述語の逸脱を完璧に防いでる。polite_100のpleasure framingも消滅。副作用ゼロ。

残り3件は全部casual高レベルの「思ったより」脱落+増幅で、これは構造解析の程度抽出改善で次に対応する領域。
