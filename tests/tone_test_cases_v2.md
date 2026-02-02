# NijiLingo トーン差検証用テスト文 v2

> 作成日: 2025-02-01
> 作成者: シュワちゃん（Claude Swarm）
> 目的: AIが間違いやすいパターンでトーン差検証

---

## 📋 検証条件

### 対象API
- llama-4-scout
- gpt-oss-120b

### トーン × レベル
| トーン | 0% | 50% | 100% |
|--------|-----|-----|------|
| casual | ✓ | ✓ | ✓ |
| business | ✓ | ✓ | ✓ |
| formal | ✓ | ✓ | ✓ |

### 評価基準
- 0%/50%/100%で**全て異なる表現**が出れば合格（1点）
- 各トーン3点満点 → 合計9点満点

---

## 🧪 テスト文（10個）

### 【テスト文1】
**文**: これ、いいね
**難しさ**: 短すぎて「いいね」が何を指すか不明瞭。カジュアルにもフォーマルにも解釈可能。
**期待される差**:
- 0% casual: "This is nice!" / "Nice!"
- 50% business: "This looks good."
- 100% formal: "This appears to be of high quality."

---

### 【テスト文2】
**文**: ちょっと聞きたいんだけど
**難しさ**: 「ちょっと」のニュアンスが英語で再現しにくい。依頼の強さが曖昧。
**期待される差**:
- 0% casual: "Hey, can I ask you something?"
- 50% business: "I'd like to ask you something."
- 100% formal: "I was wondering if I might inquire about something."

---

### 【テスト文3】
**文**: また今度ね
**難しさ**: 「今度」が曖昧（近い将来？次の機会？）。トーンで意味が変わりやすい。
**期待される差**:
- 0% casual: "Let's do it again sometime!" / "Catch you later!"
- 50% business: "Let's schedule another time."
- 100% formal: "I look forward to our next meeting."

---

### 【テスト文4】
**文**: それ、どういう意味？
**難しさ**: 質問の意図が不明（本当に知りたい？皮肉？）。トーンで解釈が変わる。
**期待される差**:
- 0% casual: "What do you mean by that?" / "Huh?"
- 50% business: "Could you clarify what you mean?"
- 100% formal: "I would appreciate it if you could elaborate on that point."

---

### 【テスト文5】
**文**: お願いできる？
**難しさ**: 主語省略＋依頼の丁寧さが「お願い」だけで判断しにくい。
**期待される差**:
- 0% casual: "Can you do me a favor?" / "Help me out?"
- 50% business: "Could I ask you for a favor?"
- 100% formal: "I was wondering if you might be able to assist me with something."

---

### 【テスト文6】
**文**: まあ、いいか
**難しさ**: 「まあ」「いいか」の曖昧さ。肯定？諦め？トーンでニュアンスが大きく変わる。
**期待される差**:
- 0% casual: "Whatever." / "I guess it's fine."
- 50% business: "Well, I suppose that will do."
- 100% formal: "I believe that will be acceptable."

---

### 【テスト文7】
**文**: 来週都合どう？
**難しさ**: 主語省略＋「都合」が英語で表現しにくい。カジュアル過ぎると失礼になりやすい。
**期待される差**:
- 0% casual: "You free next week?" / "How's next week looking?"
- 50% business: "What does your schedule look like next week?"
- 100% formal: "I was wondering about your availability next week."

---

### 【テスト文8】
**文**: そうなんだ
**難しさ**: 短すぎて「そうなんだ」の意図が不明（納得？驚き？皮肉？）。
**期待される差**:
- 0% casual: "Oh, really?" / "I see."
- 50% business: "I understand."
- 100% formal: "I see. Thank you for letting me know."

---

### 【テスト文9】
**文**: それ、本当？
**難しさ**: 質問の強さが不明（軽い確認？真剣な疑問？）。トーンで解釈が変わる。
**期待される差**:
- 0% casual: "Wait, for real?" / "Seriously?"
- 50% business: "Is that correct?"
- 100% formal: "I would like to confirm whether that is accurate."

---

### 【テスト文10】
**文**: またよろしく
**難しさ**: 「よろしく」の英語表現が難しい。カジュアル過ぎると失礼、フォーマル過ぎると不自然。
**期待される差**:
- 0% casual: "See you around!" / "Catch you later!"
- 50% business: "I look forward to working with you again."
- 100% formal: "I sincerely hope for your continued support and cooperation."

---

## 📊 難易度カテゴリ

| 観点 | 該当テスト文 |
|------|-------------|
| トーン差が出にくい | 1, 6, 8 |
| 日本語特有の難しさ | 2, 5, 7 |
| 英語で差をつけにくい | 3, 10 |
| 意味が変わりやすい | 4, 9 |

---

## 📁 旧テスト文（v1）

参考用に残しておく：
1. その服素敵だね
2. 遅れてごめん、電車が止まってた
3. 明日の会議の資料を送ってもらえる？
