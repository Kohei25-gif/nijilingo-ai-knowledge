# Phase 2 弱点文テスト 判定レポート
## R50/R51/R52 再現性分析（3回テスト → 2/3以上FAILのみ「本物」）

---

## 判定サマリ

| パターン | 判定 | 再現率 | 修正優先度 |
|---------|------|--------|-----------|
| **stance_strength_amplification** | ✅ 本物 | 3/3再現（casual 75-100%） | 🔴 最優先 |
| **pleasure_polarity_flip** | ✅ 本物 | 3/3再現（polite 25-100%, business 50-100%） | 🔴 最優先 |
| **predicate_meaning_shift** | ✅ 本物 | 3/3再現（casual 25-100%） | 🟡 高 |
| **commitment_weakening** | ❌ API揺れ | 0/3再現 | なし |

---

## 文ごとの詳細判定

### 文154「正直、ちょっと不安。」→ stance_strength_amplification

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_75 | PASS (a little) | FAIL (super on edge) | FAIL (super on edge) | 2/3 | **本物** |
| casual_100 | FAIL (super anxious) | FAIL (totally freaking out) | FAIL (totally freaking out) | 3/3 | **本物** |
| polite_100 | PASS (somewhat) | FAIL (considerable) | PASS (certain degree) | 1/3 | API揺れ |
| business_100 | PASS (minor) | PASS (degree of) | PASS (reservations) | 0/3 | PASS |

### 文164「今日は割と集中できた。」→ stance_strength_amplification

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_75 | FAIL (totally crushed) | FAIL (totally crushed) | FAIL (totally nailed) | 3/3 | **本物** |
| casual_100 | FAIL (absolutely nailed) | FAIL (absolutely nailed) | FAIL (absolutely crushed) | 3/3 | **本物** |
| polite_100 | FAIL (great fortune) | WARN (considerable) | FAIL (pleasure + highly) | 2/3 | **本物** |
| business_75 | FAIL (exceptionally) | PASS (quite) | PASS (good level) | 1/3 | API揺れ |
| business_100 | FAIL (exceptional focus) | PASS (considerable) | PASS (satisfactory) | 1/3 | API揺れ |

### 文176「それはちょっとリスク高い。」→ stance_strength_amplification

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_50 | FAIL (pretty significant) | PASS (fairly high) | PASS (pretty high) | 1/3 | API揺れ |
| casual_75 | FAIL (pretty hefty) | PASS (pretty high) | PASS (pretty high) | 1/3 | API揺れ |
| casual_100 | FAIL (super hefty) | FAIL (super high) | FAIL (super high) | 3/3 | **本物** |
| business_100 | FAIL (considerable) | PASS (moderate) | FAIL (considerable) | 2/3 | **本物** |

### 文156「それはあんまり現実的じゃない。」→ stance_strength_amplification

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_75 | PASS (not super) | FAIL (totally not) | FAIL (super unrealistic) | 2/3 | **本物** |
| casual_100 | FAIL (hella not) | FAIL (not at all) | FAIL (totally not) | 3/3 | **本物** |

**注意**: 構造解析で「程度」が3回ともnoneと抽出されている。「あんまり」の程度が正しく抽出できていない。

### 文182「今日ちょっといいニュースあった。」→ pleasure_polarity_flip + stance

#### pleasure_polarity_flip（polite/business）

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| polite_25 | FAIL (pleasure) | FAIL (pleasure) | FAIL (pleasure) | 3/3 | **本物** |
| polite_50 | FAIL (my pleasure) | FAIL (my pleasure) | FAIL (my pleasure) | 3/3 | **本物** |
| polite_75 | FAIL (delight) | FAIL (delighted) | FAIL (delighted) | 3/3 | **本物** |
| polite_100 | FAIL (great pleasure) | FAIL (utmost pleasure) | FAIL (utmost pleasure) | 3/3 | **本物** |
| business_50 | FAIL (pleasure) | PASS (favorable) | FAIL (pleasure) | 2/3 | **本物** |
| business_75 | FAIL (my pleasure) | FAIL (pleased) | FAIL (my pleasure) | 3/3 | **本物** |
| business_100 | FAIL (delighted) | FAIL (pleasure) | FAIL (delighted) | 3/3 | **本物** |

#### stance_amplification（casual）

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_75 | WARN (awesome) | WARN (amazing) | FAIL (amazing day + awesome) | 1/3 | API揺れ |
| casual_100 | FAIL (sick news) | WARN (awesome) | FAIL (best news ever) | 2/3 | **本物** |

**程度フィールド注意**: 「ちょっと」が3回ともnoneと抽出されている。程度抽出の精度問題が再確認された。

### 文192「今日、久々に外で食べた。」→ pleasure_polarity_flip

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| polite_50 | FAIL (pleasure) | FAIL (pleasure) | FAIL (pleasure) | 3/3 | **本物** |
| polite_75 | FAIL (genuine delight) | FAIL (delighted) | FAIL (delight) | 3/3 | **本物** |
| polite_100 | FAIL (absolute pleasure) | FAIL (great pleasure) | FAIL (deeply grateful) | 3/3 | **本物** |
| business_75 | FAIL (my pleasure) | FAIL (my pleasure) | FAIL (pleasure) | 3/3 | **本物** |
| business_100 | FAIL (distinct pleasure) | FAIL (distinct pleasure) | FAIL (distinct honor) | 3/3 | **本物** |

### 文200「今日はもう寝たい。」→ pleasure_polarity_flip

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| polite_100 | FAIL (immense pleasure) | WARN (immense favor) | PASS (most grateful) | 1/3 | API揺れ |
| business_100 | WARN (slumber) | WARN (rest) | WARN (respite) | 0/3 | 儀式化WARNのみ |

**結論**: 文200ではpleasure_polarity_flipは再現せず。R49でのFAILはAPI揺れだった。ただし儀式化（ceremonial_framing）のWARNは一貫して出現。

### 文187「今日の会議、結局結論出なかった。」→ predicate_meaning_shift

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_25 | PASS (conclusion) | FAIL (wrap up) | FAIL (wrap up) | 2/3 | **本物** |
| casual_50 | FAIL (wrap up) | FAIL (get finished) | FAIL (get finished) | 3/3 | **本物** |
| casual_75 | FAIL (get wrapped up) | FAIL (wrap up) | FAIL (wrap up) | 3/3 | **本物** |
| casual_100 | FAIL (get wrapped up) | FAIL (go down) | FAIL (get wrapped up) | 3/3 | **本物** |
| polite_25+ | PASS全レベル | PASS全レベル | PASS全レベル | 0/3 | PASS |
| business_25+ | PASS全レベル | PASS全レベル | PASS全レベル | 0/3 | PASS |

**根本原因**: casualトーンで「結論出なかった」→「wrap up」「finish」に変換。「結論=conclusion」がcasualでは使われず、「終わる」系の語彙に置換される。polite/businessでは正確に"conclusion"が保持される。

### 文189「それ、噂だけ先行してる気がする。」→ predicate_meaning_shift

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual_50 | PASS (kinda getting ahead) | FAIL (out of hand) | FAIL (out of hand) | 2/3 | **本物** |
| casual_75 | WARN (totally ahead) | FAIL (spiraling out of control) | FAIL (out of hand) | 2/3 | **本物** |
| casual_100 | FAIL (blowing up out of control) | FAIL (blowing up out of control) | FAIL (spiraling outta control) | 3/3 | **本物** |
| polite_50+ | FAIL (gaining momentum/traction) | FAIL (gaining momentum) | PASS (ahead of itself) | 不定 | 要注意 |
| business全 | FAIL (gaining momentum/traction) | FAIL (gaining traction) | FAIL (progressing rapidly) | 3/3 | **本物**（別の意味シフト） |

**根本原因**:
- casual: 「先行してる」→「out of control / spiraling」に変質。先行=前に出ている≠制御不能
- polite/business: 「先行してる」→「gaining momentum / traction」に変質。噂が先行している（事実に先んじている）≠噂が勢いを増している

### 文165「もし必要なら、私が対応する。」→ commitment_weakening

| トーン/レベル | R50 | R51 | R52 | 再現 | 判定 |
|-------------|-----|-----|-----|------|------|
| casual全レベル | PASS | PASS | PASS | 0/3 | **API揺れ確定** |
| polite全レベル | PASS | PASS | PASS | 0/3 | PASS |
| business全レベル | PASS | PASS | PASS | 0/3 | PASS |

**結論**: R41で出現した「might respond / idk」はAPI揺れだった。修正不要。

---

## 修正優先順位と方針

### 🔴 Priority 1: pleasure_polarity_flip
- **影響範囲**: 文182, 192（positive報告 × polite/business 25-100%）
- **再現率**: 3/3（最も安定的に再現）
- **根本原因**: positive感情 + 報告文 + polite/businessトーン → LLMが自動的にpleasure/delight/honorを挿入
- **修正方針**: 構造解析の感情極性=positiveかつ発話行為=報告の場合に、pleasure系語彙を抑制する制御をPARTIALプロンプトに追加
- **注意**: toneStyleに英語例を入れない鉄則を遵守

### 🔴 Priority 2: stance_strength_amplification
- **影響範囲**: 文154, 164, 176, 156（程度修飾語 × casual 75-100%）
- **再現率**: 2-3/3
- **根本原因**: 「ちょっと/割と/あんまり」の程度がcasual高レベルでsuper/totally/absolutelyに変換
- **修正方針**:
  1. 構造解析の程度フィールド抽出精度の改善（「ちょっと」「あんまり」がnoneになる問題）
  2. 程度フィールドがslightまたはmoderateの場合にPARTIAL翻訳で程度保持を強制
- **注意**: ルール追加ではなく構造解析フィールドで制御（R38教訓）

### 🟡 Priority 3: predicate_meaning_shift
- **影響範囲**: 文187（casual全レベル）、文189（casual + business全レベル）
- **再現率**: 3/3（文187 casual）、2-3/3（文189）
- **根本原因**:
  - 文187: casualでは「conclusion」を避けて「wrap up / finish」を使う → 述語の意味が変わる
  - 文189: 「先行」のニュアンスが「out of control」「gaining momentum」に変質
- **修正方針**: 構造解析の「動作の意味」フィールドをPARTIAL翻訳でより強く参照させる
- **難易度**: 高。言語の語彙選択レベルの問題で、構造ルールだけでは抑えにくい可能性

---

## 追加発見事項

### 程度フィールドの抽出精度問題（再確認）
- 文156「あんまり」: 3回ともnone（正しくはmoderate negation）
- 文182「ちょっと」: 3回ともnone（正しくはslight）
- 文154「ちょっと」: R50はslight、R51/R52はnone（不安定）
- **→ Gemini 2.5 Flash Liteへの切り替え検証の根拠が強化された**

### 文189のpolite/business意味シフト
- 「噂だけ先行してる」が「gaining momentum/traction」に変質
- これはcasualの「out of control」とは別パターン
- 全トーンで述語の意味が正確に保持できていない

---

*判定: クロちゃん（Claude Opus）2026-02-07*
