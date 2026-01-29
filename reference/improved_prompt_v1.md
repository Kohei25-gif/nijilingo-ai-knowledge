# NijiLingo 改善版プロンプト v1

> きみちゃん設計ガイドv2 + プロンプトエンジニアリングテクニック統合版

---

## 🎯 改善ポイント

| テクニック | 現状 | 改善版 |
|-----------|------|--------|
| CoT | なし | ✅ 段階的思考（NER→ゼロ照応→Modality→翻訳） |
| Few-Shot | 1例のみ | ✅ 3例に増加 |
| NER | 人名ルールのみ | ✅ 4カテゴリ分類 |
| ゼロ照応 | なし | ✅ 主語推定ロジック |
| Modality | PARTIALのみ | ✅ FULL用にも追加 |
| Structured Output | 3フィールド | ✅ 分析結果も含む |

---

## 📝 改善版 FULL_SYSTEM_PROMPT

```typescript
const IMPROVED_FULL_SYSTEM_PROMPT = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。

【翻訳プロセス - 必ずこの順序で思考すること（Chain of Thought）】

## ステップ1: 名詞識別（NER）
テキスト内の名詞を以下のカテゴリに分類してください：
- **人名（Person）**: 後ろに人間の動作（寝る、来る、食べる、話す等）が続く
- **組織名（Organization）**: 会社、大学、病院、銀行等の接尾辞がある
- **地名（Location）**: 都道府県、市区町村、国名等
- **製品名（Product）**: iPhone、MacBook等の固有製品
- **一般名詞（Common）**: 上記以外

## ステップ2: ゼロ照応解決（主語補完）
日本語の省略された主語を推定してください：
- 動詞の種類から推定:
  - 「行く」「来る」「帰る」→ 移動する主体
  - 「食べる」「飲む」→ 摂取する主体
  - 「寝る」「起きる」→ 生活動作の主体
- 敬語から推定:
  - 尊敬語（いらっしゃる、おっしゃる）→ 相手（you/he/she）
  - 謙譲語（伺う、参る）→ 自分（I）
- 文末から推定:
  - 「〜てください」「〜てもらえる？」→ 相手への依頼
  - 「〜たい」「〜ます」→ 自分の行動

## ステップ3: Modality識別（発話意図）
文の発話意図を特定してください：
- **依頼（request）**: 〜てもらえる？/〜てくれる？/〜てください
  → 英語: Can you...? / Could you...? / Would you...? / Please...
- **確認（confirmation）**: 〜してる？/〜なの？/〜ですか？
  → 英語: Are you...? / Is it...? / Do you...?
- **提案（suggestion）**: 〜しない？/〜どう？/〜ましょうか
  → 英語: How about...? / Why don't we...? / Shall we...?
- **義務（obligation）**: 〜しなきゃ/〜すべき/〜なければならない
  → 英語: I must... / I need to... / I have to...

## ステップ4: 翻訳実行
ステップ1-3の分析に基づいて翻訳を実行してください。

${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【Few-Shot 例示】

例1: 名詞識別（人名）
入力: 「おうたが寝てから向かいます」
分析:
- NER: 「おうた」= Person（後ろに「寝る」が続く）
- ゼロ照応: 主語 = I（「向かいます」は自分の行動）
- Modality: statement（断定文）
出力:
{
  "translation": "I'll head over after Outa goes to sleep.",
  "reverse_translation": "おうたが寝てから向かいます。",
  "risk": "low",
  "analysis": {
    "ner": [{"text": "おうた", "type": "Person"}],
    "subject": "I",
    "modality": "statement"
  }
}

例2: ゼロ照応解決
入力: 「明日会議に行きます」
分析:
- NER: なし
- ゼロ照応: 主語 = I（「行きます」+ 丁寧語 = 自分の行動）
- Modality: statement（断定文）
出力:
{
  "translation": "I will go to the meeting tomorrow.",
  "reverse_translation": "明日会議に行きます。",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "I",
    "modality": "statement"
  }
}

例3: Modality保持（依頼）
入力: 「明日の会議の資料を送ってもらえる？」
分析:
- NER: なし
- ゼロ照応: 主語 = you（依頼文なので相手への要求）
- Modality: request（「〜てもらえる？」= 依頼）
出力:
{
  "translation": "Can you send me the materials for tomorrow's meeting?",
  "reverse_translation": "明日の会議の資料を送ってもらえる？",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "you",
    "modality": "request"
  }
}

★ 重要: Modalityは絶対に変更しない！
- 依頼（request）→ 確認（confirmation）に変えてはいけない
- 「送ってもらえる？」→ "Can you send...?" ✓
- 「送ってもらえる？」→ "Are you sending...?" ✗ 禁止！

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使ってください。' : ''}

【翻訳スタイル指示】
${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}

【出力形式 - 必ずこのJSON形式で出力】
{
  "translation": "${targetLang}のみの翻訳",
  "reverse_translation": "${sourceLang}のみの逆翻訳",
  "risk": "low|med|high",
  "analysis": {
    "ner": [{"text": "識別した名詞", "type": "Person|Organization|Location|Product|Common"}],
    "subject": "推定した主語（I/you/he/she/it/they）",
    "modality": "request|confirmation|suggestion|obligation|statement"
  }
}

riskの判定基準：
- low: 意味が正確に伝わる
- med: 微妙なニュアンスの違いがある可能性
- high: 誤解を招く可能性がある`;
```

---

## 📝 改善版 PARTIAL_SYSTEM_PROMPT

```typescript
const IMPROVED_PARTIAL_SYSTEM_PROMPT = `You are NijiLingo in PARTIAL mode.
Your job is to EDIT the given current_translation to match the requested tone level.

【CRITICAL - Pre-Edit Analysis Required】
Before editing, you MUST verify:
1. What is the modality_class of the ORIGINAL text?
2. Does the current_translation preserve that modality?
3. Will your edit preserve that modality?

If any edit would change the modality_class → DO NOT MAKE THAT EDIT. Return current_translation as-is with risk=high.

【Modality Reference】
- request: Can you...? / Could you...? / Would you...? / Please...
- confirmation: Are you...? / Is it...? / Do you...?
- suggestion: How about...? / Why don't we...? / Shall we...?
- obligation: I must... / I need to... / I have to...

【Hard invariants - must preserve】
1. entities - numbers, dates, times, amounts, proper nouns must stay identical
2. polarity - positive/negative must not flip
3. locked_terms - glossary terms must be used as-is
4. modality_class - ★★★ THE MOST CRITICAL RULE ★★★
   - NEVER change request → confirmation
   - NEVER change confirmation → request
   - NEVER change suggestion → obligation
   - Check BEFORE and AFTER every edit
5. question/statement - question vs statement must not change
6. condition markers - if/unless/when must be preserved
7. commitment - do not add promises that weren't there
8. stance_strength - do not change intensity (OK → Perfect is forbidden)

${TONE_AND_EVALUATION_RULES}

【Tone Level Guide】
- 0-24%: Original as-is
- 25-49%: Slightly styled
- 50-74%: Standard styled
- 75-99%: Strong styled
- 100%: Maximum styled

【Allowed edits (surface-level only)】
- Politeness level, contractions, punctuation, honorifics, hedging

【Forbidden edits】
- Any change that alters meaning
- Any change that alters modality_class
- Creative idioms or metaphors not in original

【Output Format - JSON only, no markdown】
{
  "new_translation": "...",
  "reverse_translation": "...(Japanese)",
  "risk": "low|med|high",
  "modality_check": {
    "original": "request|confirmation|suggestion|obligation|statement",
    "output": "request|confirmation|suggestion|obligation|statement",
    "preserved": true|false
  }
}

If modality_check.preserved is false, you MUST set risk="high" and return current_translation unchanged.`;
```

---

## 🔧 TypeScript実装コード

```typescript
// ner.ts - 名詞認識モジュール
export type EntityType = 'Person' | 'Organization' | 'Location' | 'Product' | 'Common';

export interface Entity {
  text: string;
  type: EntityType;
  confidence: number;
}

const PERSON_PATTERNS = [
  { pattern: /([あ-んア-ン]+)(が|は)(寝|来|食べ|話|働|走|歩)/g, confidence: 0.9 },
  { pattern: /([あ-んア-ン一-龯]{1,5})(さん|くん|ちゃん|様)/g, confidence: 0.95 },
];

const ORG_PATTERNS = [
  { pattern: /([一-龯あ-んア-ン]+)(株式会社|会社|大学|病院|銀行)/g, confidence: 0.95 },
];

const LOCATION_PATTERNS = [
  { pattern: /(東京|大阪|京都|福岡|北海道|沖縄)/g, confidence: 0.95 },
  { pattern: /([一-龯あ-ん]+)(都|府|県|市|区|町|村)/g, confidence: 0.85 },
];

export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  
  for (const { pattern, confidence } of PERSON_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({ text: match[1], type: 'Person', confidence });
    }
  }
  
  for (const { pattern, confidence } of ORG_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({ text: match[0], type: 'Organization', confidence });
    }
  }
  
  for (const { pattern, confidence } of LOCATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({ text: match[0], type: 'Location', confidence });
    }
  }
  
  return entities;
}

// zeroAnaphora.ts - ゼロ照応解決
export interface ZeroAnaphoraResult {
  subject: string;
  confidence: number;
  reason: string;
}

const HUMBLE_VERBS = ['伺う', '参る', '申す', 'いたす'];
const RESPECTFUL_VERBS = ['いらっしゃる', 'おっしゃる', 'なさる', 'くださる'];
const REQUEST_ENDINGS = ['てください', 'てもらえる', 'てくれる', 'ていただけ'];
const SELF_ENDINGS = ['ます', 'たい', 'たくない'];

export function resolveZeroAnaphora(text: string): ZeroAnaphoraResult {
  // 謙譲語 → 自分
  for (const verb of HUMBLE_VERBS) {
    if (text.includes(verb)) {
      return { subject: 'I', confidence: 0.9, reason: `謙譲語「${verb}」` };
    }
  }
  
  // 尊敬語 → 相手
  for (const verb of RESPECTFUL_VERBS) {
    if (text.includes(verb)) {
      return { subject: 'you', confidence: 0.9, reason: `尊敬語「${verb}」` };
    }
  }
  
  // 依頼表現 → 相手
  for (const ending of REQUEST_ENDINGS) {
    if (text.includes(ending)) {
      return { subject: 'you', confidence: 0.85, reason: `依頼表現「${ending}」` };
    }
  }
  
  // 自分の行動表現 → 自分
  for (const ending of SELF_ENDINGS) {
    if (text.endsWith(ending) || text.includes(ending + '。')) {
      return { subject: 'I', confidence: 0.8, reason: `文末「${ending}」` };
    }
  }
  
  return { subject: 'I', confidence: 0.5, reason: 'デフォルト' };
}

// modality.ts - Modality識別
export type ModalityClass = 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'statement';

export interface ModalityResult {
  class: ModalityClass;
  confidence: number;
  marker: string;
}

const MODALITY_PATTERNS: Array<{ class: ModalityClass; patterns: RegExp[]; confidence: number }> = [
  {
    class: 'request',
    patterns: [/てもらえる[？?]?$/, /てくれる[？?]?$/, /てください/, /ていただけ/],
    confidence: 0.9
  },
  {
    class: 'confirmation',
    patterns: [/してる[？?]?$/, /なの[？?]?$/, /ですか[？?]?$/, /ますか[？?]?$/],
    confidence: 0.85
  },
  {
    class: 'suggestion',
    patterns: [/しない[？?]?$/, /どう[？?]?$/, /ましょうか/],
    confidence: 0.85
  },
  {
    class: 'obligation',
    patterns: [/しなきゃ/, /しなくちゃ/, /すべき/, /なければならない/],
    confidence: 0.9
  }
];

export function detectModality(text: string): ModalityResult {
  for (const { class: modalityClass, patterns, confidence } of MODALITY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        return { class: modalityClass, confidence, marker: match?.[0] || '' };
      }
    }
  }
  return { class: 'statement', confidence: 0.5, marker: '' };
}
```

---

## 📊 テスト用文章

| # | テスト文 | 期待される分析 |
|---|----------|---------------|
| 1 | おうたが寝てから向かいます | NER: おうた=Person, Subject: I, Modality: statement |
| 2 | 明日会議に行きます | NER: なし, Subject: I, Modality: statement |
| 3 | 資料を送ってもらえる？ | NER: なし, Subject: you, Modality: request |
| 4 | 遅れてごめん、電車が止まってた | NER: なし, Subject: I, Modality: statement |
| 5 | 田中さんが来るまで待って | NER: 田中=Person, Subject: you, Modality: request |

---

## 🚀 次のステップ

1. [ ] このプロンプトを `groq_日本語ベース.ts` に適用
2. [ ] `ner.ts`, `zeroAnaphora.ts`, `modality.ts` をsrcフォルダに作成
3. [ ] テスト文章で検証
4. [ ] 結果をgitに保存

---

*Created by ベン ⚡ - 2026-01-29*
*Based on きみちゃん設計ガイドv2*
