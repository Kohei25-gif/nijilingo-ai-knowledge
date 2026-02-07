## Round 56 判定結果

### 1. Pleasure チェック

検索対象: pleasure, pleased, delight, delighted, privilege, privileged

| 文 | FAIL件数 | 詳細 |
|----|---------|------|
| 文1 | 0/12 | ✅ **R55では3/8 FAILだったのに全PASS** |
| 文2 | **1/12** | polite 100% "I am **delighted** to be looking forward to it." |
| 文3 | 0/12 | ✅ |
| 文4 | 0/12 | ✅ |
| 文5 | 0/12 | ✅ |

**合計: 1/60 FAIL（98.3% PASS）**

Scout時代の~50%から劇的改善。文1がR55で3件FAILだったのに今回全PASSなのはAPI非決定性だけど、全体傾向としてMaverickのpleasureバイアスは極めて低い。

---

### 2. 品質分析（文ごと）

#### 文1「今日ちょっといいニュースあった。」

**⚠️ 大きな変化: seedが変わった**
- R55（Scout FULL）: "I had some good news today." → 主語「I」
- R56（Maverick FULL）: "Something good happened today." → **無主語**

この結果、PARTIAL全部が「There was...」パターンになった。R55で良かった「I received... → We have...」の段階変化が消えている。

| 問題 | 詳細 |
|------|------|
| 主語消失 | polite/business全部 "There was..." |
| **トーン段階崩壊** | polite 25% = polite 75%（完全同一文） |
| **トーン段階崩壊** | polite 50% = polite 100%（完全同一文） |
| business段階 | 25→50→75は "good→positive→favourable" で段階あり。100%の "certain favourable" はやや不自然 |

**原因**: Maverick FULLが生成するseedの質がScoutと違う。PARTIALはseedをベースに調整するから、seedが無主語だと全部無主語になる。

#### 文2「やっと週末だ、楽しみ。」

| 良い点 | 問題点 |
|--------|--------|
| casual段階 ◎（got→got→awesome→totally awesome） | polite 25/50/75がほぼ同じ |
| business I→We切り替え ◎ | polite 100% "delighted to be looking forward to it" ← **不自然な英語 + pleasure** |
| 「楽しみ」がpleasureに化けず「looking forward to」で統一 ✅ | |

casual 100%の "super stoked" はネイティブ的にかなり自然。

#### 文3「申し訳ないですが、納期を1週間延ばしてもらえますか。」

| 良い点 | 問題点 |
|--------|--------|
| polite段階 ◎ (apologize→regret→apologize→sincerest apologies) | **casual 100%: "Hey, can ya push the deadline back a week?"** → 「申し訳ない」が完全消失 |
| 「1週間」全トーン保持 ✅ | business 50% = business 75%（同一構文） |
| 「納期」→ deadline で統一 ✅ | |

casual 100%で謝罪が消えるのは**polarity不変条件違反に近い**。原文は「申し訳ない」というnegative感情が核なのに、casual最大にしたら「Hey」だけになった。

#### 文4「田中さんが来月異動になるらしい。」

| 良い点 | 問題点 |
|--------|--------|
| 固有名詞: casual "Tanaka-san" → polite/business "Mr. Tanaka" ◎ | **polite 100%: "It has been announced"** ← 「らしい」（伝聞・不確実）が「発表された」（公式確定）に化けた。**モダリティ不変条件違反** |
| casual "transferring" → business "slated for transfer" ◎ | business 100% 逆翻訳: 「私の注意に喚起されました」← **不自然な日本語** |
| casual全体で "I heard" 保持 ✅ | polite 50/75: "reported" も「らしい」より確度が高すぎ |

「らしい」の確信度保持が高トーンで崩れている。casual/business低トーンでは "I heard" "I have been informed" で伝聞感が残ってるが、polite高トーンで "reported/announced" に格上げされてる。

#### 文5「もうちょっと安くなりませんか。」

| 良い点 | 問題点 |
|--------|--------|
| business 25% "Could it be slightly cheaper?" 完璧 ✅ | **casual 50%: "Can you make it cheaper?"** → 「もうちょっと」消失 |
| polite段階の丁寧度上昇は自然 | polite 100% "procure at a diminished cost" ← 調達用語すぎる |
| 逆翻訳は概ね安定 | polite 75% "acquire" も購入用語寄り |

---

### 3. 逆翻訳チェック

| 文 | 目立つ問題 |
|----|-----------|
| 文1 | business 100%「確かな好ましいニュース」← 不自然。「ちょっといい」から遠い |
| 文2 | 概ね安定 ✅ |
| 文3 | casual 100% 逆翻訳「ねえ、納期を1週間延ばしてくれない？」← 「申し訳ない」消失が逆翻訳にも反映。ユーザーは気づく |
| 文4 | business 100%「私の注意に喚起されました」← 日本語として破綻 |
| 文5 | 概ね安定 ✅ |

---

### 4. 総合スコアカード

| 項目 | 結果 | Scout比較 |
|------|------|----------|
| **Pleasure** | **1/60 FAIL（98.3%）** | Scout ~50% → 大幅改善 |
| **トーン段階機能** | ⚠️ 一部同一出力あり（文1 polite、文3 business） | 要観察 |
| **不変条件** | ⚠️ 2件違反（文3 casual謝罪消失、文4 politeモダリティ格上げ） | |
| **英語の自然さ** | ○ casual◎ / polite-business高トーンで硬い傾向 | |
| **逆翻訳の安心感** | ○ 概ね安定。文4 business 100%が破綻 | |

### 既知FAILパターンとの対応

| パターン | 発生 | 詳細 |
|---------|------|------|
| pleasure_polarity_flip | 1件 | 文2 polite 100% "delighted" |
| stance_strength_amplification | 0件 | ✅ 今回なし |
| predicate_meaning_shift | 1件 | 文3 casual 100%で謝罪消失 |
| **NEW: modality_escalation** | 1件 | 文4「らしい」→「announced」 |
| **NEW: tone_plateau** | 3箇所 | 隣接トーンで同一出力 |

---

## 判定

**Maverick切り替えはGO。** pleasure 98.3%は十分。

ただし新たに見えた課題:
1. **seed品質がFULL依存** → 文1のseedが無主語だったことで全トーン影響
2. **casual最大で意味要素が脱落** → 文3の謝罪消失
3. **polite高トーンでモダリティ格上げ** → 文4「らしい→announced」
4. **トーン段階が同一出力になる箇所** → スライダーが機能してないように見える

これらはPhase 2の弱点テストセットに入れるべきパターン。
