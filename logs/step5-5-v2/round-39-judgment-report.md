# Round 39 判定結果レポート

- **判定者**: クロちゃん（Claude Opus）
- **日時**: 2026-02-07
- **対象**: 文156〜160（round-39-outputs.json）
- **モデル**: Scout (Llama 4)
- **プロンプト**: R37版（プロンプト統合版。R38の追加は戻し済み）

## 総合結果

| | PASS | WARN | FAIL | 計 |
|--|------|------|------|----|
| 文156 | 7 | 2 | 3 | 12 |
| 文157 | 10 | 2 | 0 | 12 |
| 文158 | 10 | 2 | 0 | 12 |
| 文159 | 8 | 3 | 1 | 12 |
| 文160 | 11 | 1 | 0 | 12 |
| **合計** | **46** | **10** | **4** | **60** |

**PASS率（WARN含む）: 93% (56/60)**

### 推移
R34: 63% → R35: 73% → R36: 82% → R37: 90% → R38: 85%📉 → **R39: 93%** 🎉

---

## 解消確認済みパターン

| パターン | 状態 |
|----------|------|
| gratitude_to_request_flip | ✅ 0件（文158で感謝文テスト、全レベルPASS）|
| certainty_flip | ✅ 0件 |
| pleasure_polarity_flip | ✅ 0件 |
| report_to_request_flip | ✅ 0件 |
| casual_lol_injection | ✅ 0件 |

## 残存FAILパターン

### stance_strength_amplification（4件）

| 文 | tone | % | 出力 | 問題 |
|----|------|---|------|------|
| 156 | casual | 75 | "That's totally not realistic." | 「あんまり」≠「全然」 |
| 156 | casual | 100 | "That's completely unrealistic." | 「あんまり」≠「全く」 |
| 156 | business | 100 | "highly unrealistic" | 「あんまり」≠「非常に」 |
| 159 | casual | 100 | "That sounds totally bizarre." | 「違和感ある」≠「完全に奇妙」 |

**傾向**: casual高レベル（75-100%）とbusiness 100%に集中。politeでは0件。

---

## 文別詳細

### 文156:「それはあんまり現実的じゃない。」 PASS 7 / WARN 2 / FAIL 3
「あんまり」の程度維持テスト。casual 25-50%は維持、75-100%で増幅。politeは全PASS。

### 文157:「今日の会議メモ、共有するね。」 PASS 10 / WARN 2 / FAIL 0 🎉
報告形が全レベルで維持。WARN: polite100("for your perusal")、business100("disseminated")の語彙選択。

### 文158:「ありがとう、助言ありがたい。」 PASS 10 / WARN 2 / FAIL 0 🎉
感謝文テスト。全レベルで感謝形を維持。gratitude_to_request_flip完全解消を確認。

### 文159:「それ、聞いた感じだと違和感ある。」 PASS 8 / WARN 3 / FAIL 1
casual100%で"totally bizarre"に増幅。polite/businessは全PASS。

### 文160:「今日はもう外出たくない。」 PASS 11 / WARN 1 / FAIL 0 🎉
報告形・否定表現が全レベルで維持。WARN: business100("lost all desire")のみ。
