# gpt-4.1-nano 本番フロー検証結果サマリー

> 実施日: 2026-02-01
> テスト者: ベン（API直叩き）
> フロー: editJapaneseForTone → translateFull
> モデル: **gpt-4.1-nano** (OpenAI API)

---

## 📊 全体結果サマリー

| Round | Total | casual | business | formal | 主な改善 |
|-------|-------|--------|----------|--------|----------|
| 1 | 26/30 (87%) | 7/10 | 9/10 | 10/10 ✅ | 初期プロンプト |
| 2 | 29/30 (97%) | 9/10 | 10/10 ✅ | 10/10 ✅ | 0%/50%差の強調 |
| 3 | 29/30 (97%) | 9/10 | 10/10 ✅ | 10/10 ✅ | 差分必須ルール追加 |

**最高スコア: 29/30 (97%)**

---

## 📈 トーン別スコア推移

| トーン | R1 | R2 | R3 | 傾向 |
|--------|-----|-----|-----|------|
| casual | 7/10 | 9/10 | 9/10 | 改善したが1件残る |
| business | 9/10 | 10/10 ✅ | 10/10 ✅ | Round 2で完璧達成 |
| formal | 10/10 ✅ | 10/10 ✅ | 10/10 ✅ | 最初から完璧 |

---

## ❌ 失敗パターン詳細

### Round 1 失敗（4件）

#### casual（3件）

**1. 「それ、どういう意味？」**
- 問題: 英語 0%=50%
- 0%: "What do you mean by that?"
- 50%: "What do you mean by that?" ← 同じ
- 100%: "What the hell does that even mean?"

**2. 「お願いできる？」**
- 問題: 英語 0%=50%
- 0%: "Can you do me a favor?"
- 50%: "Can you do me a favor?" ← 同じ
- 100%: "I can totally do you a huge favor!"

**3. 「またよろしく」**
- 問題: 逆翻訳 0%=50%
- 0%: 「またよろしくね！」
- 50%: 「またよろしくね！」 ← 同じ
- 100%: 「おい、まじで頼りにしてくれよな！」

#### business（1件）

**4. 「来週都合どう？」**
- 問題: 逆翻訳 0%=50%
- 0%: 「来週のご都合はいかがでしょうか？」
- 50%: 「来週のご都合はいかがでしょうか？」 ← 同じ
- 100%: 「来週お会いできるご都合はいかがでしょうか。」

---

### Round 2 失敗（1件）

#### casual（1件）

**「それ、どういう意味？」**
- 問題: 英語 0%=50%
- 編集後日本語:
  - 0%: 「それ、どういう意味？」
  - 50%: 「それ、どういう意味だね？」 ← 編集された
- 英語:
  - 0%: "What do you mean by that?"
  - 50%: "What do you mean by that?" ← translateFullが同じ英語を返した
- 100%: "Yo, what the hell does that even mean?"

---

### Round 3 失敗（1件）

#### casual（1件）

**「お願いできる？」**
- 問題: 英語 0%=50%、editJapaneseForToneが50%で編集してない
- 編集後日本語:
  - 0%: 「お願いできる？」
  - 50%: 「お願いできる？」 ← 編集されてない！
- 英語:
  - 0%: "Can you do me a favor?"
  - 50%: "Can you do me a favor?" ← 同じ
- 100%: "Yo, I seriously gotta ask ya for a favor!"

**注意:** Round 2とRound 3で失敗パターンが入れ替わっている（ランダム性あり）

---

## 🔧 プロンプト改善履歴

### Round 1 → Round 2

**editJapaneseForTone改善:**
```
【最重要ルール】
- 0%: 原文をそのまま返す（一切変更しない）
- 50%: 原文から必ず変更する（語尾・言い回しを変える）
- 100%: 50%よりさらに強く変える
- 0%と50%が同じ文章になるのは禁止！
```

**translateFull改善:**
```
【50%の翻訳 - 0%と必ず異なる表現にすること！】
- 0%より親しみやすく/丁寧に
- ★ 0%と同じ英語は絶対禁止 ★
```

### Round 2 → Round 3

**translateFull追加:**
```
【最重要ルール - 差分必須】
- 入力の日本語が少しでも違えば、出力の英語も必ず変えること
- 語尾が「〜だね」「〜だよ」なら、英語も親しみやすい表現に変える
- 同じ英語を返すのは禁止（日本語が違うなら英語も違う）
```

---

## 💡 gpt-4.1-nano の特徴

### 得意なこと
- **formal**: 最初から完璧（10/10）
- **business**: Round 2以降完璧（10/10）
- 敬語表現の差分生成が上手い

### 苦手なこと
- **casual 0%/50%の差**: 英語で差をつけにくい
- 短い文（「お願いできる？」「それ、どういう意味？」）の差分生成
- editJapaneseForToneで50%の編集が不十分なケースあり

### ランダム性
- 同じプロンプトでも、失敗パターンが変わることがある
- Round 2とRound 3で失敗した文が入れ替わった

---

## 📁 関連ファイル

- 検証条件: `tests/verification_conditions_v3_production.md`
- Round 1結果: `tests/results/phase2-production/round1.md`
- Round 2結果: `tests/results/phase2-production/round2.md`
- Round 3結果: `tests/results/phase2-production/round3.md`
- スクリプト: `scripts/production-flow-test.js`

---

## 🎯 結論

- **最高スコア: 29/30 (97%)**
- **100%達成: No**
- **残り課題: casual 0%/50%の英語差分**
- **将来NANOを使う場合の参考として記録**

---

*作成: ベン*
*日時: 2026-02-01 01:00 JST*
