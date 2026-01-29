# 🔧 NijiLingo プロンプトv3 実装依頼

> Claude Code用 - コード変更の詳細指示

---

## 📋 概要

NijiLingoの翻訳プロンプトを改善版v3に更新する。
8大テクニック（CoT、Few-Shot、Role、Structured Output）を適用し、
NER（名詞識別）、ゼロ照応（主語補完）、Modality保持を強化する。

---

## 📁 変更するファイル

```
~/Desktop/NijiLingo/groq_日本語ベース.ts
```

---

## 🚫 変更しないファイル

```
~/Desktop/NijiLingo/App_日本語ベース.tsx（今回は触らない）
```

---

## 📝 修正内容（全5箇所）

---

### 修正1: 型定義の拡張（10-20行目あたり）

**場所:** ファイル冒頭の型定義セクション

**現在のコード:**
```typescript
// 翻訳結果の型定義
export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
}
```

**変更後のコード:**
```typescript
// 翻訳結果の型定義
export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  // v3追加: 分析結果（オプショナル）
  analysis?: {
    ner: Array<{text: string; type: string; reason: string}>;
    subject: string;
    subject_reason: string;
    modality: string;
  };
}

// v3追加: PARTIAL編集の結果型
export interface PartialTranslationResult {
  new_translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  modality_check?: {
    original: string;
    output: string;
    preserved: boolean;
    note?: string;
  };
}
```

---

### 修正2: FULL翻訳用の新プロンプト定数を追加（49行目の後あたり）

**場所:** `const INVARIANT_RULES` の後に追加

**追加するコード:**
```typescript
// v3: FULL翻訳用システムプロンプト（8大テクニック適用版）
const FULL_SYSTEM_PROMPT_V3_TEMPLATE = (sourceLang: string, targetLang: string, isNative: boolean, toneInstruction: string, reverseTranslationInstruction: string, differenceInstruction: string, variationInstruction: string) => `あなたは${sourceLang}⇔${targetLang}翻訳の専門家です。10年以上の実務経験があり、特に以下に精通しています：
1. 日本語の人名・固有名詞の識別
2. 省略された主語の文脈からの推定
3. 発話意図（依頼/確認/提案）の正確な保持

【翻訳の手順 - この順番で考えてください】

■ ステップ1: 名前かどうか判断（NER）
テキストに出てくる言葉が「人の名前」か「普通の言葉」か判断してください。

判断基準：
- 人の名前（Person）: 後ろに「寝る」「来る」「食べる」「話す」など人の動作が続く
- 組織名（Organization）: 「会社」「大学」「病院」などの言葉がつく
- 地名（Location）: 都道府県、市区町村、国名
- 一般名詞（Common）: 上記以外

例：
- 「おうたが寝てから」→ おうた = 人の名前（後ろに「寝る」= 人の動作）
- 「歌が止まってた」→ 歌 = 音楽のこと（後ろに「止まる」= モノの動作）
- 「田中さんが来る」→ 田中 = 人の名前（「さん」がついてる）

■ ステップ2: 主語を補う（ゼロ照応解決）
日本語は主語を省略することが多いので、誰の話か判断してください。

判断基準：
- 謙譲語（伺う、参る、申す）→ 私（I）
- 尊敬語（いらっしゃる、おっしゃる）→ あなた/その人（you/he/she）
- 依頼表現（〜てください、〜てもらえる）→ あなた（you）
- 丁寧語（〜ます、〜です）→ 私（I）がデフォルト
- 〜たい → 私（I）

例：
- 「行きます」→ 私が行く（I will go）
- 「送ってください」→ あなたが送る（You send）
- 「いらっしゃいますか」→ あなたがいる（Are you there?）

■ ステップ3: お願い/確認/提案を区別（Modality識別）
文の意図を判断してください。これは絶対に変えてはいけません！

- お願い（request）: 「〜てもらえる？」「〜てくれる？」「〜てください」
  → 英語: Can you...? / Could you...? / Would you...? / Please...
- 確認（confirmation）: 「〜してる？」「〜なの？」「〜ですか？」
  → 英語: Are you...? / Is it...? / Do you...? / Did you...?
- 提案（suggestion）: 「〜しない？」「〜どう？」「〜ましょうか」
  → 英語: How about...? / Why don't we...? / Shall we...?
- 義務（obligation）: 「〜しなきゃ」「〜すべき」「〜なければ」
  → 英語: I must... / I need to... / I have to...

★★★ 最重要ルール ★★★
Modalityは絶対に変更禁止！
- お願い → 確認 に変えてはダメ！
- 「送ってもらえる？」→ "Can you send...?" ✓
- 「送ってもらえる？」→ "Are you sending...?" ✗ 禁止！

■ ステップ4: 翻訳する
ステップ1〜3の分析に基づいて翻訳してください。

${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【絶対ルール - translation フィールド】
- "translation" は ${targetLang} のみで出力すること
- ${sourceLang}の文字は絶対に混ぜない
- 語尾の「だね」「じゃん」「ですね」「ございます」等は translation には絶対に入れない
- これらの語尾ルールは reverse_translation にのみ適用する

【人名の翻訳ルール】
- ひらがな/カタカナの人名は英語翻訳（translationフィールド）でのみローマ字表記する
- 逆翻訳（reverse_translationフィールド）は元のひらがな/カタカナのまま維持する

【翻訳と逆翻訳の一致ルール】
- 翻訳（英語）と逆翻訳（日本語）は同じ意味になること
- 英語を変えたら、逆翻訳も対応して変える
- 逆翻訳だけ変わって英語が同じ、はNG

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使ってください。' : ''}

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}
${variationInstruction}

【Few-Shot 例示】

例1: 人名の判断
入力: 「おうたが寝てから向かいます」
分析:
- NER: 「おうた」= Person（後ろに「寝る」= 人の動作）
- 主語: I（「向かいます」は自分の行動）
- Modality: statement（断定）
出力:
{
  "translation": "I'll head over after Outa goes to sleep.",
  "reverse_translation": "おうたが寝てから向かいます。",
  "risk": "low",
  "analysis": {
    "ner": [{"text": "おうた", "type": "Person", "reason": "後ろに「寝る」が続く"}],
    "subject": "I",
    "subject_reason": "「向かいます」= 自分の行動",
    "modality": "statement"
  }
}

例2: お願いの維持
入力: 「明日の会議の資料を送ってもらえる？」
分析:
- NER: なし
- 主語: you（依頼の対象）
- Modality: request（「〜てもらえる？」= お願い）
出力:
{
  "translation": "Can you send me the materials for tomorrow's meeting?",
  "reverse_translation": "明日の会議の資料を送ってもらえる？",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "you",
    "subject_reason": "依頼表現なので相手が主語",
    "modality": "request"
  }
}

例3: 英語→日本語
入力: "Can you send me the report?"
分析:
- NER: なし
- 主語: you（Can you = お願い）
- Modality: request
出力:
{
  "translation": "レポートを送ってもらえる？",
  "reverse_translation": "Can you send me the report?",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "you",
    "subject_reason": "Can you = 依頼表現",
    "modality": "request"
  }
}

例4: 一般名詞と人名の区別
入力: 「歌が止まってた」
分析:
- NER: 「歌」= Common（後ろに「止まる」= モノの動作）
- 主語: it（歌 = モノ）
- Modality: statement
出力:
{
  "translation": "The song had stopped.",
  "reverse_translation": "歌が止まってた。",
  "risk": "low",
  "analysis": {
    "ner": [{"text": "歌", "type": "Common", "reason": "後ろに「止まる」= モノの動作"}],
    "subject": "it",
    "subject_reason": "歌はモノなのでit",
    "modality": "statement"
  }
}

【出力形式 - 必ずこのJSON形式で】
{
  "translation": "${targetLang}のみの翻訳（${sourceLang}の文字は絶対に含めない）",
  "reverse_translation": "${sourceLang}のみの逆翻訳（語尾ルールはここにのみ適用）",
  "risk": "low|med|high",
  "analysis": {
    "ner": [{"text": "識別した名詞", "type": "Person/Organization/Location/Common", "reason": "判断理由"}],
    "subject": "推定した主語（I/you/he/she/it/they）",
    "subject_reason": "主語を推定した理由",
    "modality": "request/confirmation/suggestion/obligation/statement"
  }
}

riskの判定基準：
- low: 意味が正確に伝わる
- med: 微妙なニュアンスの違いがある可能性
- high: 誤解を招く可能性がある`;
```

---

### 修正3: PARTIAL_SYSTEM_PROMPTの差し替え（492行目）

**場所:** `const PARTIAL_SYSTEM_PROMPT = ` の定義を差し替え

**現在のコード:** 492行目から始まる `const PARTIAL_SYSTEM_PROMPT = \`You are NijiLingo in PARTIAL mode...`

**変更後のコード:**
```typescript
// v3: PARTIAL編集用システムプロンプト
const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo in PARTIAL mode. You EDIT existing translations to match tone levels.

【Pre-Edit Analysis - MUST do before editing】

Before making any edit, analyze:
1. What is the modality of the ORIGINAL text? (request/confirmation/suggestion/obligation/statement)
2. Does the current_translation preserve that modality?
3. Will your edit preserve that modality?

If ANY edit would change modality → DO NOT edit. Return current as-is with risk=high.

【Modality Reference】
- request: Can you...? / Could you...? / Would you...? / Please... / Will you...?
- confirmation: Are you...? / Is it...? / Do you...? / Did you...? / Have you...?
- suggestion: How about...? / Why don't we...? / Shall we...? / What about...?
- obligation: I must... / I need to... / I have to... / I should...

★★★ CRITICAL RULE ★★★
NEVER change modality!
- request → confirmation is FORBIDDEN
- "Can you send...?" → "Are you sending...?" is FORBIDDEN
- If you're unsure, keep the original and set risk=high

【Hard Invariants - Must preserve】
1. entities - numbers, dates, times, amounts, proper nouns stay identical
2. polarity - positive/negative must not flip
3. modality_class - ★★★ MOST CRITICAL ★★★
4. question/statement - must not change
5. stance_strength - do not intensify (OK → Perfect is forbidden)

${TONE_AND_EVALUATION_RULES}

【Tone Level Guide】
- 0-24%: Original as-is (no style change)
- 25-49%: Slightly styled (light application)
- 50-74%: Standard styled (normal application)
- 75-99%: Strong styled (heavy application)
- 100%: Maximum styled (extreme application)

【Allowed Edits (surface-level only)】
- Politeness level (can you → could you)
- Contractions (cannot → can't)
- Punctuation (. → !)
- Honorifics
- Hedging words (maybe, perhaps)
- Casual expressions (send → shoot, materials → stuff)

【Forbidden Edits】
- Any meaning change
- Any modality change (request ↔ confirmation)
- Creative idioms not in original
- Adding/removing information

【Few-Shot Examples】

Example 1: Casual tone edit (GOOD)
Original modality: request
current_translation: "Can you send me the materials?"
Level: 75% casual
Output:
{
  "new_translation": "Could you shoot me the stuff?",
  "reverse_translation": "資料送ってくれない？",
  "risk": "low",
  "modality_check": {
    "original": "request",
    "output": "request",
    "preserved": true
  }
}
→ "Could you" = still request ✓

Example 2: Modality violation (BAD → fallback)
Original modality: request
current_translation: "Can you send me the materials?"
Level: 100% casual
BAD output: "Are you sending me the stuff?"
→ "Are you" = confirmation ✗ FORBIDDEN

CORRECT output:
{
  "new_translation": "Can you send me the materials?",
  "reverse_translation": "資料送ってもらえる？",
  "risk": "high",
  "modality_check": {
    "original": "request",
    "output": "request",
    "preserved": true,
    "note": "Could not make more casual without changing modality"
  }
}

Example 3: Business tone edit (GOOD)
Original modality: request
current_translation: "Can you send me the materials?"
Level: 75% business
Output:
{
  "new_translation": "Would you be able to send me the materials?",
  "reverse_translation": "資料をお送りいただけますでしょうか？",
  "risk": "low",
  "modality_check": {
    "original": "request",
    "output": "request",
    "preserved": true
  }
}
→ "Would you be able to" = still request ✓

【Output Format - JSON only, no markdown】
{
  "new_translation": "edited translation",
  "reverse_translation": "Japanese reverse translation",
  "risk": "low|med|high",
  "modality_check": {
    "original": "original modality",
    "output": "output modality",
    "preserved": true|false,
    "note": "optional explanation if preserved is false"
  }
}`;
```

---

### 修正4: translateFull関数のsystemPrompt生成部分を差し替え（1486行目〜1540行目あたり）

**場所:** `export async function translateFull` 関数内の `const systemPrompt = ` 部分

**現在のコード:** 1495行目あたりから始まる `const systemPrompt = \`あなたは${sourceLang}から...`

**変更後のコード:**
```typescript
export async function translateFull(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, sourceLang, targetLang, isNative, previousTranslation, previousLevel } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction(options);
  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, toneLevel, options.tone, options.customTone);
  const differenceInstruction = getFullDifferenceInstruction(toneLevel, previousTranslation, previousLevel, options.tone);
  const variationInstruction = options.variationInstruction ? `\n${options.variationInstruction}` : '';

  // v3: 新しいシステムプロンプトを使用
  const systemPrompt = FULL_SYSTEM_PROMPT_V3_TEMPLATE(
    sourceLang,
    targetLang,
    isNative,
    toneInstruction,
    reverseTranslationInstruction,
    differenceInstruction,
    variationInstruction
  );

  const toneDesc = options.tone
    ? `${options.tone}スタイル、強度${toneLevel}%`
    : '自然な翻訳';

  const userPrompt = `以下のテキストを翻訳してください（${toneDesc}）：

${sourceText}`;

  console.log('[translateFull] ===== API CALL =====');
  console.log('[translateFull] tone:', options.tone);
  console.log('[translateFull] toneLevel:', toneLevel);
  console.log('[translateFull] toneInstruction:', toneInstruction);
  console.log('[translateFull] userPrompt:', userPrompt);

  const response = await callGeminiAPI(MODELS.FULL, systemPrompt, userPrompt, 0.3, options.signal);
  console.log('[translateFull] response:', response);

  const parsed = parseJsonResponse<TranslationResult>(response);
  
  // v3追加: 日英乖離チェック
  const alignment = checkAlignmentScore(sourceText, parsed.translation, parsed.reverse_translation);
  if (!alignment.aligned) {
    console.warn('[translateFull] Low alignment score:', alignment.score);
    parsed.risk = 'high';
  }
  
  const result = applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, parsed))
  );
  console.log('[translateFull] parsed result:', result);

  return result;
}
```

---

### 修正5: 日英乖離チェック関数を追加（translateFull関数の前あたり、1480行目付近）

**場所:** `translateFull` 関数の前に追加

**追加するコード:**
```typescript
// v3追加: 翻訳と逆翻訳の一致度をチェックする関数（日英乖離対策）
function checkAlignmentScore(
  originalText: string,
  translation: string,
  reverseTranslation: string
): { score: number; aligned: boolean } {
  // 原文と逆翻訳の類似度を計算
  const normalizedOriginal = normalizeForCompare(originalText);
  const normalizedReverse = normalizeForCompare(reverseTranslation);
  
  const distance = calculateEditDistance(normalizedOriginal, normalizedReverse);
  const maxLen = Math.max(normalizedOriginal.length, normalizedReverse.length);
  const score = maxLen > 0 ? 1 - (distance / maxLen) : 1;
  
  // 0.3以上なら一致とみなす（トーン変更で変わることを考慮して緩めに設定）
  return {
    score,
    aligned: score >= 0.3
  };
}
```

---

## ✅ テスト項目（実装後に確認）

| # | テスト内容 | 期待結果 |
|---|----------|---------|
| 1 | 「おうたが寝てから向かいます」を翻訳 | "Outa"と翻訳される |
| 2 | 「歌が止まってた」を翻訳 | "song"と翻訳される（人名ではない） |
| 3 | 「資料を送ってもらえる？」を翻訳 | "Can you..."で始まる |
| 4 | テスト3をCasual Lv100で編集 | "Can you"が維持される |
| 5 | 「その服素敵だね」をLv0→Lv1→Lv2→Lv3 | 段階的に丁寧になる |
| 6 | FULL翻訳の出力 | analysisフィールドが含まれる |
| 7 | PARTIAL編集の出力 | modality_checkフィールドが含まれる |
| 8 | 型チェック（tsc --noEmit） | エラーなし |

---

## ⚠️ 注意事項

1. **既存の動作を壊さないこと**
   - analysis と modality_check は optional（?）なので、なくても動く
   
2. **INVARIANT_RULES と TONE_AND_EVALUATION_RULES は変更しない**
   - 既存の定数をそのまま使う
   
3. **calculateEditDistance と normalizeForCompare は既存関数**
   - 新しく作らない、既存のものを使う
   
4. **エラーハンドリングは既存のものを維持**
   - try-catch等は変更しない

---

## 📁 完了後の確認

```bash
# 型チェック
cd ~/Desktop/NijiLingo && npx tsc --noEmit

# アプリ起動して動作確認
npm run dev
```

---

*Created: 2026-01-29*
*For: Claude Code Implementation*
