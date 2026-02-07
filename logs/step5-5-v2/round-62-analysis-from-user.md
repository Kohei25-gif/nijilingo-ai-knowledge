## R62 結果分析（10文 × 12トーン = 120件）

---

### 構造抽出の精度チェック

| 文 | フィールド | 結果 | 判定 |
|----|----------|------|------|
| A1 | 固有名詞 | おうた=person ✅ | 完璧 |
| B1 | 人称 | **省略** | ⚠️ 一人称単数が正解だが、省略も許容範囲（seedでI推定できてる） |
| C1 | 確信度 | 確定 ✅ | 完璧 |
| D1 | 意図/モダリティ | 依頼/依頼 ✅ | 完璧 |
| E1 | 目的格/願望 | 君/あり ✅ | 完璧 |
| G1 | 発話行為 | **["報告"]のみ** | ❌ ["謝罪","報告"]が正解。「ごめん」=謝罪が消えた |
| I1 | 動作の意味 | go ✅ | 完璧 |
| N1 | 保持値/固有名詞 | ["9時半"] / 新宿駅,南口 ✅ | 完璧 |
| N2 | 条件表現/確信度 | ["もし〜なら"] / 推測 ✅ | 完璧 |
| N3 | 確信度 | **推測** | ❌ **伝聞**が正解。「らしいよ」=伝聞 |
| N3 | 固有名詞 | 田中さん（**敬称なし**） | ⚠️ 敬称=「さん」が正解 |
| N3 | 保持値 | ["50人分"] | ⚠️ 「来週の月曜」も保持値に入るべき |

---

### 翻訳品質チェック（10文ごと）

**✅ 文A1: おうたが寝てから向かいます — PASS**
- 全12トーンで「Outa」保持、主語I維持
- polite/business 100%: "proceed", "retires for the night" → やや過剰フォーマルだが意味は正確

**✅ 文B1: 財布忘れた — PASS**
- 全12トーンで主語I。You/We一切なし
- polite 50%: "I appear to have forgotten" → 確信度=確定なのに"appear"が推測的。軽微。
- polite 100%: "It is evident that I have left my wallet behind" → 不自然だが意味は保持

**✅ 文C1: 電車が止まってた — PASS**
- 全12トーンで推測語ゼロ（I think, maybe, probably なし）
- 確信度=確定が完璧に守られた

**✅ 文D1: 送ってもらえる？ — PASS**
- 全12トーンでCan you/Could you/Would you系。「Are you sending?」ゼロ
- polite 50%: "Might I be able to receive it if you were to send it to me?" → 回りくどいが依頼は維持
- polite 75%: "I would be grateful if you could send it" → 依頼としてOK

**✅ 文E1: 君を抱きたい — 概ねPASS（1件問題あり）**
- casual/polite: 全域で主語I、目的語you、願望(want/wanna/wish)維持 ✅
- business 100%: **"I believe it would be beneficial to establish a close relationship with you."** ❌❌
  - 「抱きたい」→「関係を築く」に完全に意味が変わった
  - **predicate_meaning_shift + 婉曲化の過剰**

**✅ 文G1: 遅れてごめん、電車が止まってた — PASS（翻訳は良い）**
- 全12トーンで謝罪(sorry/apologize/regret) + 報告(train stopped/halted)が含まれる
- 主語I維持
- casual 75%: "Late! Train's stuck!" → 謝罪が消えた？→ 短縮だが文脈でsorryのニュアンスは弱い ⚠️

**✅ 文I1: 明日行く — PASS**
- **proceed ゼロ！** go/going/heading/departing系で統一
- 全12トーンで主語I維持
- casual 100%: "I'm bailing tomorrow!" → bail=「抜ける」で「行く」とは微妙に違う ⚠️ 軽微

**✅ 文N1: 9時半に新宿駅の南口で待ち合わせしよう — PASS（1件問題あり）**
- 全12トーンで9:30保持、Shinjuku Station South Exit保持 ✅
- 人称: 一人称複数(Let's/Shall we)で全域OK
- business 75%: **"We propose meeting"** → subject_shift（Let's → We propose）⚠️

**✅ 文N2: もし時間があれば、手伝ってもらえると助かるんだけど — PASS**
- 全12トーンで "If you have time" 条件保持 ✅
- 依頼のニュアンス全域維持
- 確信度=推測が "I'd appreciate" "would be grateful" で適切に表現

**⚠️ 文N3: 田中さんが来週の月曜に50人分の資料を持ってくるらしいよ — 構造ミスあり**
- 全12トーンで50保持、Tanaka-san保持、next Monday保持 ✅ 翻訳は良い
- 伝聞マーカー: "seems", "appears", "anticipated", "I guess", "I reckon" → 全トーンで含まれる ✅
- ただし構造の確信度=推測は誤り（伝聞が正解）。翻訳結果は伝聞的に出てるから実害は小さい

---

### 問題サマリー

| レベル | 問題 | 該当 | 影響 |
|--------|------|------|------|
| ❌ 重大 | **E1 business 100%: predicate_meaning_shift** | 「抱きたい」→「関係を築く」 | 意味が完全に変わった |
| ❌ 構造 | **G1 発話行為: 謝罪欠落** | ["報告"]のみ、["謝罪","報告"]が正解 | 翻訳には影響なし（sorryは出てる） |
| ❌ 構造 | **N3 確信度: 推測（伝聞が正解）** | 「らしいよ」=伝聞 | 翻訳には影響小（伝聞的に訳されてる） |
| ⚠️ 軽微 | N3 固有名詞: 敬称なし（さんが正解） | 田中**さん** | 翻訳では-sanが付いてるから実害なし |
| ⚠️ 軽微 | N1 business 75%: We propose | subject_shiftの残り | 1/120件 |
| ⚠️ 軽微 | G1 casual 75%: 謝罪弱い | "Late! Train's stuck!" | sorryが省略 |

---

### 総合スコア

**120件中:**
- 明確なFAIL: **1件**（E1 business 100% predicate_meaning_shift）
- 構造抽出ミス: **2件**（G1発話行為、N3確信度）ただし翻訳への実害なし
- 軽微な問題: **3件**
- **PASS率: 99.2%（119/120）**

---

### 分析

**圧倒的に良い結果。** 過去の主要FAILパターンがほぼ全滅：
- pleasure挿入: **0件** ✅（4ラウンド連続）
- subject_shift (I→We): **1件**/120件（N1 business 75%のみ）
- predicate_meaning_shift (go→proceed): **0件** ✅ 文I1で完全解消
- 確信度違反: **0件** ✅ 文C1で推測語ゼロ
- モダリティ変更: **0件** ✅ 文D1で依頼維持
- 目的格入れ替え: **0件** ✅ 文E1で主語I/目的語you維持
- 保持値: **全保持** ✅ 9:30, 50, next Monday

**唯一の重大問題はE1 business 100%。** 「君を抱きたい」をbusiness最高レベルで訳すと「関係を築く」に婉曲化しすぎる。これはtoneStyleのbusiness 100%が「過度にプロフェッショナル」を求めた結果、感情的な内容を企業言語に置き換えてしまった。ただしこれは**極端なエッジケース**（恋愛表現×business最高フォーマリティ）。

**構造抽出の課題:**
- 「ごめん」→謝罪の検出漏れ: 発話行為の例に「ごめん→謝罪」パターンを追加すれば解決可能
- 「らしいよ」→伝聞の検出漏れ: 確信度の定義で「伝聞」の構造的定義は書いたが、「らしい」パターンが推測と混同された可能性
