## R65-invariant-link-partial 採点結果

### B2-01「ごめん、今日ちょっと体調悪くて休ませてもらうね」

| レベル | casual | business | formal |
|---|---|---|---|
| 0 | ✅ | ✅ | ✅ |
| 25 | ✅ | ✅ | ✅ |
| 50 | ✅ | ✅ | ✅ |
| 75 | ✅ | ✅ | ✅ |
| 100 | ❌ degree_escalation | ✅ | ✅ |

❌ casual_100: "feelin' **super** crummy" — 「ちょっと」(slight)に対してsuperは程度増幅（新規FAIL）

B2-01: **14/15**（前回15/15 → -1）

### B2-02「田中さんが来週の月曜に来るらしいよ」

| レベル | casual | business | formal |
|---|---|---|---|
| 0 | ✅ | ✅ | ✅ |
| 25 | ✅ | ✅ | ✅🔧 |
| 50 | ✅ | ✅ | ❌ hearsay→rumor |
| 75 | ✅ | ✅ | ❌ hearsay→rumor |
| 100 | ✅ | ✅ | ❌ hearsay→rumor |

🔧 formal_25: 前回 "It is understood"(certainty_shift) → 今回 "It is said that" — 伝聞が保存された！
❌ formal_50/75/100: "rumored" — 「らしい」(伝聞) → 噂に格下げ。**新パターン復活**

B2-02: **12/15**（前回14/15 → **-2**）

### B2-03「もし時間があったら手伝ってもらえると助かるんだけど」

| レベル | casual | business | formal |
|---|---|---|---|
| 0 | ✅ | ✅ | ✅ |
| 25 | ✅ | ✅ | ✅ |
| 50 | ✅ | ✅ | ✅ |
| 75 | ❌ degree_escalation | ✅ | ✅ |
| 100 | ❌ tone_shift | ✅ | ✅ |

変化なし。casual_75 "super grateful"、casual_100 "stoked" が残存。

B2-03: **13/15**（前回13/15 → ±0）

### B2-04「この資料、かなりよくできてると思うよ」

| レベル | casual | business | formal |
|---|---|---|---|
| 0 | ✅ | ✅ | ✅ |
| 25 | ✅ | ✅ | ✅ |
| 50 | ✅ | ✅ | ✅🔧 |
| 75 | ✅ | ✅ | ✅🔧 |
| 100 | ✅ | ✅ | ✅🔧 |

🔧🔧🔧 **satisfactory完全消滅！** formal_50/75/100が全て "prepared thoroughly/with great thoroughness" に改善。

B2-04: **15/15**（前回12/15 → **+3**）🎉

### B2-05「駅前の新しいラーメン屋、めちゃくちゃ並んでたから諦めた」

| レベル | casual | business | formal |
|---|---|---|---|
| 0 | ✅ | ✅ | ✅ |
| 25 | ✅ | ✅ | ✅ |
| 50 | ✅ | ✅ | ❌ relinquished |
| 75 | ✅ | ✅ | ✅ |
| 100 | ✅ | ✅ | ❌ relinquished |

formal_50/100の "relinquished" は残存。ただしformal_75は "abandoned" でPASS。

B2-05: **13/15**（前回13/15 → ±0）

---

## 📊 全バージョン比較

| | nano | Mav | Mav+FULL2文 | Mav+FULL&PARTIAL2文 |
|---|---|---|---|---|
| **合計** | 52/75 (69.3%) | 64/75 (85.3%) | 67/75 (89.3%) | **67/75 (89.3%)** |
| casual | 18/25 (72%) | 23/25 (92%) | 23/25 (92%) | 23/25 (92%) |
| business | 18/25 (72%) | 22/25 (88%) | 24/25 (96%) | **25/25 (100%)** 🎉 |
| formal | 16/25 (64%) | 19/25 (76%) | 20/25 (80%) | **19/25 (76%)** |

### PARTIAL追加の効果

| 改善 | 悪化 |
|---|---|
| ✅ B2-04 for50/75/100 satisfactory完全消滅（+3） | ❌ B2-02 for50/75/100 rumor復活（-3） |
| ✅ B2-02 for25 certainty_shift解消（+1） | ❌ B2-01 cas100 degree_escalation新規（-1） |

**トータルは±0で89.3%のまま**。ただし中身が大きく変わった。

**最大の成果**: satisfactory問題が完全消滅、business帯100%達成

**新たな問題**: B2-02のformal帯で「rumored」が3件復活。PARTIAL追加で伝聞の表現がrumorに引っ張られてる。これはPARTIALが「フォーマルにしろ」と解釈するときに「らしい」→「rumored」を選んでしまう問題。

数字だけ見ると同じだけど、satisfactory消滅とbusiness 100%は大きな進歩。rumor問題は新パターンだから、広域テストで再現性を見るべき。
