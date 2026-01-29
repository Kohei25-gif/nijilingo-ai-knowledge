# Phase 0: 翻訳プロンプト設計 品質テストケース

> 学術的根拠に基づく、NijiLingo翻訳プロンプトの品質評価テスト

---

## 📚 参考文献・論文

| 論文/ソース | 著者/機関 | 関連テスト項目 |
|------------|----------|---------------|
| Optimizing Machine Translation through Prompt Engineering | Yamada (2023) | 翻訳目的・対象読者の指定 |
| Best practices for prompt engineering with the OpenAI API | OpenAI | プロンプト構造・詳細度 |
| Chain-of-Thought Reasoning Improves Context-Aware Translation | ACL 2025 | CoTプロンプトの効果 |
| Adaptive Few-shot Prompting for Machine Translation | AAAI | Few-shot例の選択・品質 |
| Prompt Engineering for Translation: Guiding AI Behavior | Translated | Persona設定・ドメイン適応 |
| Mastering Structured Output in LLMs | Medium | 構造化出力の信頼性 |
| Cross-Lingual Self Consistent Prompting | Relevance AI | 自己整合性・一貫性 |

---

## 🎯 テストカテゴリ一覧（12カテゴリ）

### 【T001】プロンプト構造の基本原則

**論文根拠**: OpenAI Best Practices
> "Put instructions at the beginning of the prompt and use ### or """ to separate the instruction and context"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 指示の位置 | 文末に指示 | 文頭に指示 | 指示が最初にあるか |
| 2 | 区切り文字 | 区切りなし | ###または"""で区切り | 区切り文字の使用 |
| 3 | 文脈の分離 | 指示と文脈が混在 | 明確に分離 | 構造の明確さ |

**テスト用プロンプト例:**
```
【NG】
Translate this text to English. Be accurate and natural. "昨日友達とラーメンを食べた"

【OK】
Translate the following Japanese text to English.

Text:
"""
昨日友達とラーメンを食べた
"""

Requirements:
- Be accurate and natural
- Maintain the casual tone
```

---

### 【T002】詳細度と具体性

**論文根拠**: OpenAI Best Practices
> "Be specific, descriptive and as detailed as possible about the desired context, outcome, length, format, style, etc"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 出力形式の指定 | 「翻訳して」 | 「JSON形式で翻訳と逆翻訳を出力」 | 形式指定の有無 |
| 2 | トーンの指定 | 「自然に翻訳」 | 「カジュアルなトーンで翻訳」 | トーン指定の具体性 |
| 3 | 長さの指定 | 「短く翻訳」 | 「原文と同程度の長さで翻訳」 | 長さ指定の明確さ |

**テスト用プロンプト例:**
```
【NG】
Translate this Japanese text to English naturally.

【OK】
Translate the following Japanese text to English.

Requirements:
- Tone: Casual (as if talking to a friend)
- Length: Similar to the original text
- Output format: JSON with "translation" and "reverse_translation" fields
```

---

### 【T003】翻訳目的・対象読者の指定

**論文根拠**: Yamada (2023)
> "The integration of the purpose and target audience into prompts can indeed modify the generated translations, generally enhancing the translation quality by industry standards"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 翻訳目的の欠如 | 目的なし | 「マーケティング資料用に翻訳」 | 目的指定の有無 |
| 2 | 対象読者の欠如 | 読者指定なし | 「20代向けに翻訳」 | 読者指定の有無 |
| 3 | ロケールの欠如 | 地域指定なし | 「アメリカ英語で翻訳」 | ロケール指定の有無 |

**テスト用プロンプト例:**
```
【NG】
Translate to English.

【OK】
Translate the following text to English.

Purpose: Marketing material for social media
Target audience: Young adults in their 20s
Locale: American English
Style: Engaging and catchy
```

---

### 【T004】Chain-of-Thought (CoT) の活用

**論文根拠**: ACL 2025
> "CoT prompting improves coherence, but only for the best models. The improvement is positively correlated with the initial score of each LLM"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | CoTの欠如 | 一括翻訳 | 段階的な分析→翻訳 | ステップの有無 |
| 2 | 推論過程の明示 | 推論なし | 「Step 1: 名詞識別...」 | 推論ステップの明示 |
| 3 | 文脈考慮 | 単文翻訳 | 前後の文脈を考慮 | 文脈考慮の有無 |

**テスト用プロンプト例:**
```
【NG】
Translate: "おうたが寝てから向かいます"

【OK】
Translate the following Japanese text step by step:

Step 1 - Analyze:
- Identify proper nouns and entities
- Detect omitted subjects
- Determine the tone and register

Step 2 - Translate:
Based on your analysis, provide the English translation.

Text: "おうたが寝てから向かいます"
```

---

### 【T005】Few-Shot 例示の品質

**論文根拠**: AAAI
> "Adaptive Few-shot Prompting automatically selects suitable translation demonstrations for various source input sentences"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | Few-Shotの欠如 | 例なし | 高品質な例を3つ提示 | 例の数と質 |
| 2 | 例の質 | 低品質な例 | 専門家レベルの例 | 例の品質 |
| 3 | 例の関連性 | 無関係な例 | タスクに関連する例 | 例の関連性 |

**テスト用プロンプト例:**
```
【NG】
Translate this text.

【OK】
Here are examples of high-quality translations:

Example 1:
Japanese: "おはよう"
English: "Morning!" (casual)

Example 2:
Japanese: "おはようございます"
English: "Good morning" (polite)

Example 3:
Japanese: "おうたが寝てから向かいます"
English: "I'll head over after Ota goes to sleep"

Now translate:
Japanese: "明日会議に行きます"
```

---

### 【T006】Persona（役割）設定

**論文根拠**: Translated
> "By instructing the model to 'act as a professional legal translator' or 'adopt the voice of a marketing expert,' we can prime it to leverage the specific linguistic conventions of that domain"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | Personaの欠如 | 役割指定なし | 「プロ翻訳者として」 | 役割指定の有無 |
| 2 | ドメイン指定 | ドメイン不明 | 「法律翻訳の専門家として」 | ドメインの具体性 |
| 3 | 専門性の明示 | 一般的な指示 | 専門知識の列挙 | 専門性の明示 |

**テスト用プロンプト例:**
```
【NG】
Translate this text to English.

【OK】
You are a professional Japanese-English translator with expertise in:
- Japanese grammar structures (subject omission, honorifics)
- English expression variations (casual to formal)
- Cultural nuance conversion

Translate the following text with your expertise:
```

---

### 【T007】構造化出力（JSON）の信頼性

**論文根拠**: Medium
> "OpenAI reports that it improves the compliance to a JSON schema from 35% with prompting alone to 100% with 'strict mode' enabled"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | スキーマ指定の欠如 | 「JSONで出力」 | 詳細なスキーマ指定 | スキーマの詳細度 |
| 2 | 型指定の欠如 | 型指定なし | 各フィールドの型指定 | 型指定の有無 |
| 3 | 必須フィールドの欠如 | 任意指定 | 必須フィールドの明示 | 必須性の指定 |

**テスト用プロンプト例:**
```
【NG】
Return the result as JSON.

【OK】
Return the result as a JSON object with the following schema:
{
  "translation": string,        // English translation
  "reverse_translation": string, // Japanese back-translation
  "risk": "low" | "med" | "high", // Quality risk level
  "confidence": number          // 0.0 to 1.0
}
```

---

### 【T008】自己整合性（Self-Consistency）

**論文根拠**: Relevance AI
> "Self-consistency in language models operates through a sophisticated verification process. The system generates multiple responses and cross-references them to ensure semantic alignment"

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 自己検証の欠如 | 翻訳のみ | 翻訳→検証→修正 | 検証ステップの有無 |
| 2 | 逆翻訳の欠如 | 翻訳のみ | 翻訳と逆翻訳の両方 | 双方向検証の有無 |
| 3 | 一貫性チェック | チェックなし | 翻訳と逆翻訳の比較 | 一貫性チェックの有無 |

**テスト用プロンプト例:**
```
【NG】
Translate to English and return the result.

【OK】
Step 1: Translate the Japanese text to English.
Step 2: Translate your English translation back to Japanese.
Step 3: Compare the original Japanese with your back-translation.
Step 4: If there are significant differences, revise your translation.
Step 5: Provide the final translation and the alignment score (0.0-1.0).
```

---

### 【T009】否定形より肯定形で指示

**論文根拠**: OpenAI Best Practices（一般的知見）

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 否定形の使用 | 「〜しないで」 | 「〜してください」 | 肯定形の使用 |
| 2 | 禁止事項の列挙 | 「これ禁止、あれ禁止」 | 「これをしてください」 | ポジティブな指示 |
| 3 | 曖昧な禁止 | 「自然でない翻訳を避けて」 | 「自然な翻訳にしてください」 | 具体性の有無 |

**テスト用プロンプト例:**
```
【NG】
Don't translate word-for-word.
Avoid literal translation.
Don't add unnecessary words.

【OK】
Translate naturally and fluently.
Maintain the original meaning while adapting to English expression patterns.
Keep the translation concise.
```

---

### 【T010】プロンプトの長さと情報量のバランス

**論文根拠**: 一般的知見（トークン効率）

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | 過剰な長さ | 500トークン以上 | 必要最小限の長さ | 長さの適切さ |
| 2 | 情報不足 | 重要情報の欠如 | 必要な情報を全て含む | 情報の完全性 |
| 3 | 重複・冗長 | 同じ指示の繰り返し | 簡潔で明確な指示 | 簡潔さ |

**テスト用プロンプト例:**
```
【NG（過剰）】
You are a translator. You need to translate. Translation is important.
Please translate carefully. Make sure you translate well.
Translation quality matters. Don't make mistakes in translation.
[500+ tokens of repetitive instructions]

【OK（適切）】
You are a professional JA→EN translator.

Translate the input maintaining:
- Natural English expression
- Original tone and register
- Cultural appropriateness

Output: JSON with "translation" and "risk" fields.
```

---

### 【T011】ドメイン適応の柔軟性

**論文根拠**: Translated

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | ドメイン固定 | 単一ドメイン | 複数ドメイン対応 | 柔軟性の有無 |
| 2 | 文脈適応の欠如 | 文脈無視 | 文脈に応じた調整 | 文脈考慮の有無 |
| 3 | スタイル切り替え | スタイル固定 | トーン/レベル調整可能 | スタイルの可変性 |

**テスト用プロンプト例:**
```
【NG】
Translate all texts in a formal business style.

【OK】
Adapt your translation style based on the context:
- Casual conversations → Use colloquial English
- Business emails → Use professional tone
- Technical documents → Use precise terminology
- Marketing copy → Use engaging, persuasive language
```

---

### 【T012】エラーハンドリングとフォールバック

**論文根拠**: 一般的知見（実用性）

| # | テスト項目 | NGプロンプト | OKプロンプト | チェック方法 |
|---|----------|-------------|-------------|-------------|
| 1 | エラー指示の欠如 | エラー時の対応なし | エラー時のフォールバック指定 | エラー対応の有無 |
| 2 | 曖昧な入力への対応 | 対応なし | 曖昧な場合の処理指定 | 曖昧性対応の有無 |
| 3 | 品質リスクの通知 | リスク通知なし | 品質リスクの明示的な返却 | リスク通知の有無 |

**テスト用プロンプト例:**
```
【NG】
Translate the text.

【OK】
Translate the text with the following error handling:
- If the text is ambiguous, provide the most likely translation and mark "risk": "high"
- If translation confidence is low, provide alternatives
- Always return "risk" field: "low" | "med" | "high"
```

---

## 📊 テスト統計

| カテゴリ | テスト項目数 |
|---------|------------|
| プロンプト構造 | 3 |
| 詳細度・具体性 | 3 |
| 翻訳目的・対象読者 | 3 |
| Chain-of-Thought | 3 |
| Few-Shot例示 | 3 |
| Persona設定 | 3 |
| 構造化出力 | 3 |
| 自己整合性 | 3 |
| 肯定形指示 | 3 |
| 長さ・情報量バランス | 3 |
| ドメイン適応 | 3 |
| エラーハンドリング | 3 |
| **合計** | **36項目** |

---

## 🎯 スコアリング方法

```
各テスト項目: 0-3点
- 0点: 該当要素なし
- 1点: 部分的に該当
- 2点: ほぼ該当（改善の余地あり）
- 3点: 完全に該当（ベストプラクティス）

満点: 36項目 × 3点 = 108点
合格ライン: 72点（66%）
優秀: 90点以上（83%）
```

---

## 📝 テスト実行方法

```javascript
// Phase 0: プロンプト品質テスト
const promptQualityTests = loadJSON('phase0_prompt_quality.json');

for (const test of promptQualityTests) {
  const score = evaluatePrompt(currentPrompt, test.criteria);
  recordScore(test.id, score);
}

const totalScore = calculateTotalScore();
const pass = totalScore >= 72; // 合格ライン
```

---

## 📁 出力ファイル形式

```json
{
  "prompt_quality_score": 85,
  "grade": "excellent",
  "test_results": [
    {
      "test_id": "T001-1",
      "category": "プロンプト構造",
      "item": "指示の位置",
      "score": 3,
      "feedback": "指示が文頭に明確に配置されている"
    }
  ],
  "improvement_suggestions": [
    "T004-2: CoTステップをより詳細に明示",
    "T007-1: JSONスキーマをより厳密に指定"
  ]
}
```

---

*Created by: きみちゃん*
*Date: 2026-01-30*
