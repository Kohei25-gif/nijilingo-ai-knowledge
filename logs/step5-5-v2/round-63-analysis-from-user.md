## R63 結果分析

### 構造抽出の修正 — 両方成功

| 文 | フィールド | R62 | R63 | 判定 |
|----|----------|-----|-----|------|
| G1 | 発話行為 | ["報告"] ❌ | ["謝罪","報告"] ✅ | 修正成功 |
| N3 | 確信度 | 推測 ❌ | 伝聞 ✅ | 修正成功 |
| N3 | 保持値 | ["50人分"] | ["50人分","来週の月曜"] ✅ | ボーナス改善 |

E1 business 100%:
- R62: "establish a close relationship" ❌（意味変更）
- R63: "I desire to embrace you." ✅（意味保持）

構造抽出の2件とE1の意味保持、これは修正した通り直った。

### リグレッションチェック — 本題

維持できてるもの:
- pleasure: 0/120 ✅（5ラウンド連続）
- 主語I維持（B1, E1, G1, I1）: 全域 ✅
- 保持値（N1の9:30, N3の50）: 全域 ✅
- 条件表現（N2のif）: 全域 ✅
- 依頼モダリティ（D1）: 全域 ✅

### toneStyleの変更 — 効いてない

| 問題語 | R62 | R63 | 改善？ |
|-------|-----|-----|------|
| convene | N1 polite 50%/100% | N1 polite 50%/100% | ❌ 同じ |
| retires for the night | A1 polite/business 100% | retires to slumber | ❌ 悪化 |
| proceed | A1 polite 75%〜 | A1 polite 75%〜 + thither | ❌ 悪化 |
| prevail upon | — | D1 polite 75% | ❌ 新規発生 |

### 新しい意味変更

| 文 | トーン | R62 | R63 | 問題 |
|----|-------|-----|-----|------|
| G1 | casual 75% | "Late! Train's stuck!" | "train was jammed" | jammed=混んでた ≠ 止まってた |
| G1 | casual 100% | "Train's dead stopped!" | "train was super jammed" | 同上、predicate_meaning_shift |
| I1 | business 75% | "scheduled to depart" | "attending" | go→attend、意味変更 |

### 総括

- 構造抽出の修正（謝罪検出・伝聞判定）は完全に成功。
- toneStyleの英語特化修正は失敗。
- 具体的な英語例と禁止リストにモデルが過剰反応し、別の堅い語へ逃げる副作用が出た。

### R63bで必要な修正

toneStyleの英語特化部分を削除し、哲学準拠の構造的定義へ置換する:
- 丁寧さは語彙の希少性ではなく、表現の間接性・柔らかさで実現する。
- 直接的な表現を間接的な構文に置き換えることで丁寧度を上げる。
- フォーマリティのために原文の動作や意味を別の概念に置き換えてはならない。
- 英語のGood/Bad例、禁止単語リスト、具体フレーズは全削除。
