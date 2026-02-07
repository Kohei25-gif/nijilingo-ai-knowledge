## R61 全フィールド動的制約 結果分析

### 4つの実問題の追跡

| 課題 | R60 | **R61** | 判定 |
|------|-----|---------|------|
| **pleasure (delighted)** | 0/60 ✅ | 0/60 ✅ | **✅ 維持解消** |
| **considered opinion** | 0/60 ✅ | 0/60 ✅ | **✅ 維持解消** |
| **polite 100% hyper_formality** | wherein 1件 | wherein 1件 | **→ 変わらず** |
| **business subject_shift** | 2/60 | 4/60 | **⚠️ 悪化** |

---

### 詳細

**pleasure — 完全解消維持** 🎉
- 文2 business 100%: "I greatly enjoyed" ✅ 3ラウンド連続でdelighted排除

**considered opinion — 解消...だが新問題** ⚠️
- "considered opinion"は消えた ✅
- しかし文7 polite 50%: "I am **convinced**" / polite 75%: "I **firmly believe**" / polite 100%: "I am **convinced**"
- 構造の確信度=**確定**になってる。R60では確信度=**推測**だった
- → **構造抽出が変わった。** 「思うんだけど」を「確定」と判定してる。これは構造抽出の劣化

**hyper_formality — 変わらず**
- 文9 polite 100%: "areas **wherein** expenditures can be reduced" — まだ出る
- 文9 polite 75%: "I will **endeavor** to identify further areas where costs can be **curtailed**" — endeavor/curtailedも重い
- 文8 polite 100%: "I would strongly recommend that you **refrain from excessive exertion**" — 同傾向

**business subject_shift — 悪化**
- 文5 business全域: 25%"**we'll**" / 50%"**We** regret" / 75%"**We** regret" / 100%"**We** regret" — 全滅
- 文9 business全域: 25%"**let's**" / 50%"**let's**" / 75%"**let's**" / 100%"**let us**" — 全滅
- 人称=一人称単数の制約が入ってるはずだが効いてない

---

### 文8の「I think」過剰適用（R60問題）

R60: polite 25%で "I **think** you should be careful" ← 過剰適用
R61: polite 25%で "Please don't overexert yourself." ✅

...ただし理由が違う。R61では構造の確信度=**推測**、発話行為=[**質問のみ**]。R60では発話行為=[質問, 依頼]だった。衝突解決ロジックが発動する条件（発話行為に依頼を含む）が成立してない。構造抽出が「依頼」を抽出しなくなった。

結果的にI think問題は出てないけど、**衝突解決ロジックの検証はできてない**。

---

### 構造抽出の変化（重要）

| 文 | フィールド | R60 | R61 | 問題？ |
|----|----------|-----|-----|--------|
| 文7 | 確信度 | **推測** | **確定** | ❌ 「思うんだけど」は推測が正しい |
| 文8 | 感情極性 | **positive** | **neutral** | ⚠️ 微妙。体調気遣いはneutralでもposでも解釈できる |
| 文8 | 発話行為 | [質問, **依頼**] | [**質問のみ**] | ⚠️ 「無理しないでね」は依頼/助言要素あり |

**文7の確信度=確定は明らかに間違い。** 「〜と思うんだけど」は典型的な推測/婉曲表現。EXPANDED_STRUCTURE_PROMPTの変更か、モデルの非決定性で構造抽出の精度が変わった可能性がある。

---

### business subject_shift悪化の原因

文5・文9のbusiness全域でWe/let'sが出てる。動的制約に `Subject: first person singular (I/my)` が入ってるはずだが効いてない。

考えられる原因：
1. PARTIAL_SYSTEM_PROMPTのMEANING LOCKを12個→3個に削減した結果、「Subject: never change」の汎用ルールが消えて、動的制約だけでは重みが足りない
2. toneStyleのbusiness人称指示も同時に削除したので、二重で弱くなった
3. R60では MEANING LOCK 12個 + 動的制約4個の**二重防御**だったのが、R61ではMEANING LOCK 3個 + 動的制約12個で**一重防御**になった

---

### 総合評価

| 指標 | R60 | R61 | 判定 |
|------|-----|-----|------|
| pleasure | 0件 | 0件 | ✅ 同等 |
| considered opinion | 0件 | 0件（別問題発生） | ⚠️ |
| hyper_formality | 1件 | 2-3件 | ❌ 微悪化 |
| subject_shift | 2件 | 4件 | ❌ 悪化 |
| 構造抽出精度 | 正常 | 文7確信度ミス | ❌ 劣化 |

**正直に言うと、R61はR60より全体的に悪くなってる。**

原因は2つ：
1. **MEANING LOCKの削減が攻めすぎた** — 汎用ルールと動的制約の二重防御が必要だった
2. **構造抽出プロンプトの変更が精度に影響した** — 保持値・条件表現の追加で他フィールドの精度が下がった可能性

次の手としては：

- **MEANING LOCKをR60レベルに戻して**、動的制約は12フィールドのまま**追加**する（二重防御に戻す）
- 構造抽出の保持値・条件表現追加が他フィールドに影響してないか切り分け

どうする？
