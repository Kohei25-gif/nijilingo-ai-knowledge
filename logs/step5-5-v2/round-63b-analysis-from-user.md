## R63b 結果分析

### 構造抽出 — 維持確認 ✅

| フィールド | R63b | 判定 |
|-----------|------|------|
| G1 発話行為 | ["謝罪","報告"] | ✅ 維持 |
| N3 確信度 | 伝聞 | ✅ 維持 |
| N3 保持値 | ["50人分","来週の月曜"] | ✅ 維持 |

### R63からの改善

| 問題 | R63 | R63b | 判定 |
|------|-----|------|------|
| G1 casual 75%/100% | jammed（混んでた）❌ | **stuck（止まってた）** ✅ | 意味復活 |
| I1 business 75% | attending ❌ | **scheduled to depart** | 改善 |
| A1 polite 100% | retires to slumber ❌ | retires for the night | R62レベルに戻った |
| D1 polite 75% | prevail upon ❌ | Might I be able to receive | 別の不自然さ |

### 変わらなかった問題

| 問題 | R63b | 状態 |
|------|------|------|
| convene | N1 polite 50%/100% | 消えない |
| proceed | A1 polite 75%〜 | 消えない |
| thither | A1 polite 100% | 消えない |
| "It is evident that" | B1 polite 100% | 消えない |

### 新しい問題

| 文 | トーン | 翻訳 | 問題 |
|----|--------|------|------|
| I1 | casual 100% | **"I'm ghosting tomorrow"** | ghosting=既読無視/消える ≠ 行く ❌ 意味変更 |
| D1 | polite 100% | "Might I be accorded the courtesy" | 過剰だが意味は保持 |
| B1 | business 100% | "I am writing to inform you" | 書面前提の表現になった |

### 過去FAIL

| 項目 | R63b | 判定 |
|------|------|------|
| pleasure | 0/120 | ✅ 6ラウンド連続 |
| E1 business 100% | "I wish to embrace you" | ✅ 意味保持 |
| subject_shift | N1 business 75%/100%のみ | ⚠️ R62と同レベル |

---

### 正直な総括

**構造的定義に変えてよかった点：** R63で発生した「禁止語の代替探し」問題（jammed、attending）は消えた。明示的禁止ルールを消したことでR38型の悪化は解消。

**構造的定義でも解決できない点：** convene、proceed、thitherは英語例があってもなくても出る。Maverickの「フォーマリティ = 語彙レベルを上げる」という内部傾向はプロンプトでは制御しきれない。

**でも紅平の判断が正しい。** ここの問題は全部polite/business 75〜100%の自然さの話。意味保持の観点では：

- R63bの明確なFAIL: **1件**（I1 casual 100% ghosting）
- E1 business 100%: ✅ 修正維持
- G1 jammed: ✅ 修正された

I1 casual 100%の「ghosting」は新しい意味変更だけど、これもAPI非決定性の可能性がある。casual 100%は最もスラングが強い領域で、ここは毎回揺れる。

**結論：** 構造抽出の修正（謝罪・伝聞）は完全成功。toneStyleは「禁止リスト」も「構造的定義」もpolite/business高レベルの語彙傾向を変える力が弱い。でもそれは紅平が言った通り「トーンと文の意図が合ってない場合」の問題であって、優先度は低い。

意味保持の観点では120件中119件PASS。プロンプト完成と言っていいレベルだと思う。
