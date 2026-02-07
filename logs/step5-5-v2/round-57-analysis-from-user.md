120件全部来た。体系的に分析する。

## 1. Pleasure チェック

| 文 | FAIL | 詳細 |
|----|------|------|
| 文1 | 0/12 | ✅ |
| 文2 | **1/12** | polite 100% "I was **delighted** to have participated" |
| 文3 | 0/12 | ✅ |
| 文4 | 0/12 | ✅ |
| 文5 | 0/12 | ✅ |
| 文6 | 0/12 | ✅ |
| 文7 | 0/12 | ✅ |
| 文8 | 0/12 | ✅ |
| 文9 | 0/12 | ✅ |
| 文10 | 0/12 | ✅ |
| **合計** | **1/120（99.2%）** | |

R56と同じ傾向。**positive感情 × polite 100%でのみdelightedが出る**。パターンが完全に限定されてる。

---

## 2. 共通課題パターン抽出

### 課題A: トーン段階停滞（tone_plateau）

隣接トーンで同一または差が極小の出力:

| 文 | 箇所 | 詳細 |
|----|------|------|
| 文1 | business 25% ≒ 50% | "not being able to" vs "being unable to"（ほぼ同じ） |
| 文2 | polite 25% = 50% | 完全同一 "I enjoyed the drinking party yesterday." |
| 文2 | polite 75% = polite 50%のbusiness版 | "thoroughly enjoyed" |
| 文5 | casual 75% ≒ 100% | "Gotta pass" vs "Gotta skip"（差が微小） |
| 文7 | casual 25% ≒ 50% ≒ 75% ≒ 100% | 全部ほぼ同じ。"on the right track/going in the right direction" |
| 文7 | polite 50% = polite 100% | 完全同一 "It is my considered opinion..." |
| 文7 | polite 25% = polite 75% | ほぼ同一 "I believe this project is..." |
| 文9 | polite 25% ≒ 50% ≒ 75% ≒ 100% | 全部 "constrained...reductions" の同一構文 |
| 文10 | casual 75% = 100% | 完全同一 "it's gotta be March 15th" |
| 文6 | business 50% = 100% | 完全同一 "We propose meeting..." |

**発生率: 10文中8文で発生。最も深刻な共通課題。**

特に**casual全域とpoliteの中間層（25-75%）で段階が機能していない**。ユーザーがスライダーを動かしても変化を感じられないのは致命的。

### 課題B: casual最大での意味要素脱落（meaning_loss_casual_max）

| 文 | 脱落内容 |
|----|---------|
| 文5 | 「残念ながら」消失。"Gotta skip it for now." → 残念感ゼロ |
| 文8 | 構造維持 ✅（今回は脱落なし） |

R56の文3（「申し訳ない」消失）と同パターン。**casual最大でnegative感情の前置きが消える傾向**。ただし今回は文1で「ごめん」が全トーン保持されたので、常に起きるわけではない。文5だけ1件。

### 課題C: 主語の変質（subject_shift）

| 文 | 箇所 | 詳細 |
|----|------|------|
| 文9 | casual全域 | 原文「私が探す」→ "**Let's** look for" に変化。**「私」が「私たち」に** |
| 文9 | polite全域 | 同上。"**let us** identify" |
| 文8 | business 75-100% | 「（あなた）無理しないで」→ "**We** kindly request" / "**We** trust" → 個人の気遣いが組織の要請に |

原文が一人称の自発行動なのに、polite/businessで"let us/we"に変わるパターン。**business I→We転換は適切な場合もあるが、文9は「私が探します」であって提案ではない**。

### 課題D: polite 100%の過剰フォーマル化（hyper_formality）

| 文 | 翻訳 | 問題 |
|----|------|------|
| 文5 | "I must **perforce** decline" | 16世紀英語。現代では使わない |
| 文9 | "areas **wherein** further reductions may be **effected**" | 法律文書調 |
| 文10 | "I have **duly** verified...it is **hereby** confirmed" | 契約書。「やっぱり合ってるって」の軽さが完全消失 |
| 文7 | "It is my **considered** opinion" | 裁判官の判決文 |

**polite 100%で「日常の丁寧」を超えて「公文書・法律文書」の領域に入ってしまう。**

### 課題E: モダリティ保持（R56からの再検証）

| 文 | 原文の確信度 | 結果 |
|----|------------|------|
| 文3 | 「かもしれない」（伝聞+不確実） | casual: "might be canceled" ✅ / polite-business: "possibility of canceling" "potential cancellation" ✅ |
| 文7 | 「と思うんだけど」（推測+婉曲） | casual: "I think" ✅ / polite: "I believe" "my considered opinion" ⚠️ 確信度UP |
| 文10 | 「合ってるって」（伝聞確定） | casual: "definitely" ✅ / polite: "indeed" "confirmed" ✅ / polite 100%: "hereby confirmed" ⚠️ 公式宣言化 |

文3の「かもしれない」は**R56文4（「らしい→announced」）と違って全トーンで不確実性を保持**。改善？API非決定性？いずれにしても今回は問題なし。

文7の「思うんだけど」は、polite高トーンで "considered opinion"（熟慮した意見）に変わり、**原文の婉曲的な自信のなさが消えている**。

### 課題F: 固有名詞・数値保持

| 文 | 項目 | 結果 |
|----|------|------|
| 文3 | 鈴木部長 | casual "Suzuki bucho" / polite-business "Manager Suzuki" ✅ |
| 文6 | 9時半、新宿駅、南口 | **全120件で3つとも完全保持** ✅✅✅ |
| 文10 | 山田さん、3月15日 | **全12件で両方完全保持** ✅✅ |

**entities不変条件は完璧。Maverickの強み。**

### 課題G: 逆翻訳の問題

| 文 | トーン | 逆翻訳 | 問題 |
|----|--------|--------|------|
| 文2 | business 100% | 「私は昨日の**社交的な集まり**を十分に楽しみました」 | 「飲み会」→「social gathering」→「社交的な集まり」。ユーザーは「え？」 |
| 文8 | polite 75% | 「お体は**おいくつ**ですか？」 | ❌ **完全誤訳。年齢を聞いてる**。"Are you recovering?"の逆翻訳としてありえない |
| 文9 | business 100% | 「包括的な検討を実施するつもりです」 | 原文「探してみます」の軽さが完全消失 |
| 文10 | polite 100% | 「ここに確認されました」 | "hereby confirmed"の直訳。不自然 |

文8 polite 75%の「おいくつですか」は**致命的誤訳**。逆翻訳の信頼性を損なう。

---

## 3. 課題の深刻度ランキング

| 順位 | 課題 | 発生率 | 深刻度 | プロンプトで直せるか |
|------|------|--------|--------|-------------------|
| **🔴 1** | **tone_plateau（段階停滞）** | 8/10文 | 致命的（スライダーUXが壊れる） | △ 難しい。Maverickの表現力限界の可能性 |
| **🟠 2** | **hyper_formality（過剰フォーマル）** | 4/10文 polite 100% | 高（公文書化は不自然） | ○ toneStyle定義で上限を設定可能 |
| **🟡 3** | **subject_shift（主語変質）** | 2/10文 | 中（意味が変わるケースあり） | ○ 構造分析の主語フィールド参照指示で改善可能 |
| **🟡 4** | **逆翻訳の致命的誤訳** | 1/120件 | 低頻度だが致命的 | △ 逆翻訳は別パイプラインの問題 |
| **🟢 5** | **meaning_loss_casual_max** | 1/10文 | 低（限定的） | ○ 不変条件のpolarity保持で対処可能 |
| **🟢 6** | **pleasure** | 1/120件 | 極低 | △ 残存するが影響極小 |

---

## 4. プロンプト最適化の方向性

### 最優先: tone_plateau対策

これが一番厄介。**25%→50%→75%→100%の4段階で明確に異なる出力を生成させる必要がある。** 現状のtoneStyle定義がMaverickにとって段階の差を作りにくい書き方になっている可能性がある。

考えられるアプローチ:
- 各レベルに具体的な**文法構造の指定**を追加（例: 25%=短文, 50%=複文, 75%=受動態, 100%=格式表現）
- 「前のレベルとは必ず異なる表現にすること」という明示的指示

### 次: hyper_formality抑制

polite 100%の上限を設定:
- 「polite 100%は丁寧なビジネスメール相当。法律文書・公文書の語彙（hereby, perforce, wherein, duly）は使用禁止」

### 次: subject_shift防止

- 「構造分析の主語フィールドが一人称の場合、翻訳でもI/myを維持すること。Weへの変更はbusinessトーンかつ原文が組織を代表する発言の場合のみ」
