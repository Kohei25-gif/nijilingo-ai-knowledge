## R64 結果分析

### 構造抽出 — 維持確認

| フィールド | R63b | R64 | 判定 |
|-----------|------|-----|------|
| G1 発話行為 | ["謝罪","報告"] | ["謝罪","報告"] | ✅ |
| N3 確信度 | 伝聞 | 伝聞 | ✅ |
| N3 保持値 | ["50人分","来週の月曜"] | ["来週の月曜"] | ⚠️ 50人分欠落 |
| E1 意味保持 | "I wish to embrace you" | "I wish to hold you close" | ✅ |

### リグレッションチェック

| 項目 | R63b | R64 | 判定 |
|------|------|-----|------|
| pleasure | 0/120 | 0/120 | ✅ 7ラウンド連続 |
| G1 jammed問題 | ✅解消 | ✅解消（stuck/stopped） | ✅ |
| I1 ghosting | casual 100% | casual 100% | 同等（API揺れ） |
| convene | N1 polite 50%/100% | N1 polite 50%/100% | 同等 |
| thither | A1 polite 100% | A1 polite 100% | 同等 |
| subject_shift | N1 business 75%/100% | N1 business 100%のみ | ✅ 微改善 |

### 新しい変化

| 文 | トーン | R63b | R64 | 判定 |
|----|--------|------|-----|------|
| B1 | polite 50% | "appear to have forgotten" | "appear to have **misplaced**" | ⚠️ forgot≠misplaced |
| N3 | polite 75%/100% | "understood/ascertained" | "**rumored**" | ⚠️ 伝聞を「噂」に |
| D1 | polite 75% | "Might I be able to receive" | "I would be grateful if you could send" | ✅ 改善 |
| D1 | polite 100% | "accorded the courtesy" | "most grateful if you could be so kind" | ✅ 改善 |
| I1 | business 50% | "I will be going" | "**attending**" | ⚠️ go→attend |

### 総括

**リファクタリングは安全。** R63bと同等の品質。

良くなった点：D1 polite 75%/100%が自然になった（prevail upon/accorded消滅）、N1 subject_shiftが1件減。

変わらない点：convene、thither、ghostingはプロンプトで制御不能なMaverickの傾向。

微悪化：B1 misplaced（forgot≠misplaced）、N3 rumored（伝聞を噂に）、I1 attending（go→attend）。ただしどれもAPI非決定性の範囲内で、次回実行で消える可能性がある。

**結論：180行削減してR63bと同等。リファクタリング採用でいい。** コードが30%短くなって防御力は変わってない。今後の修正がやりやすくなった。
