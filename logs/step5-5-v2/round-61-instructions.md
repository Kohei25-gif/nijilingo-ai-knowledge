# R61: 全フィールド動的制約 + INVARIANT_RULES統合 — 実装指示書

## 概要
構造分析の全フィールドから文ごとの翻訳制約を動的生成し、PARTIAL_SYSTEM_PROMPTの汎用ルールを大幅削減する。
R60で4フィールドの動的制約がpleasure/considered opinion問題を完全解消した実績を基に、全フィールドに拡張する。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| types.ts | ExpandedStructureに2フィールド追加、structureData拡張 |
| prompts.ts | EXPANDED_STRUCTURE_PROMPT修正、INVARIANT_RULES削減、PARTIAL_SYSTEM_PROMPT整理 |
| groq.ts | generateDynamicConstraints拡張、extractStructureのバリデーション更新 |

---

## 変更1: types.ts

### ExpandedStructureに2フィールド追加

```typescript
export interface ExpandedStructure {
  主題: string;
  動作: string;
  動作の意味: string;
  意図: IntentType;
  感情極性: SentimentPolarity;
  モダリティ: ModalityType;
  主語: string;
  対象: string;
  目的格: string;
  願望: string;
  人称: string;
  確信度: CertaintyLevel;
  程度: DegreeLevel;
  発話行為: string[];
  固有名詞: NamedEntity[];
  // ▼ R61追加
  保持値: string[];     // 翻訳で変えてはいけない具体値（数値、日時、金額、数量、割合）
  条件表現: string[];   // 原文の条件構造（「〜ので」「もし〜なら」「〜の場合」等）
}
```

**注意**: 固有名詞はNamedEntity[]のまま残す（人名の敬称情報が必要なため）。保持値は数値・日時・金額などの単純文字列リスト。

### structureDataを拡張

```typescript
export interface TranslateOptions {
  // ...既存フィールド...
  
  // R61: 全フィールド動的制約生成用（R60の4フィールドから拡張）
  structureData?: {
    人称?: string;
    確信度?: string;
    程度?: string;
    感情極性?: string;
    // ▼ R61追加
    モダリティ?: string;
    発話行為?: string[];
    動作の意味?: string;
    願望?: string;
    固有名詞?: Array<{ text: string }>;  // 名前だけ使う
    保持値?: string[];
    条件表現?: string[];
  };
}
```

---

## 変更2: prompts.ts

### 2-1. EXPANDED_STRUCTURE_PROMPTに2項目追加

既存の15項目の後に追加:

```
16. 保持値: 翻訳で変えてはいけない具体値のリスト（固有名詞以外の数値・日時・金額・数量・割合）
    例: ["9時半", "3月15日", "50%", "3つ", "500円"]
    ★ 固有名詞（人名・地名・組織名）は15番に入れる。ここには数値系のみ。
    ★ 該当がなければ空配列 []

17. 条件表現: 原文に含まれる条件・理由の構造
    例: ["〜ので", "もし〜なら", "〜の場合", "〜しない限り", "〜たら", "〜れば"]
    ★ 該当がなければ空配列 []
```

JSON出力フォーマットにも追加:

```json
{
  "主題": "...",
  "動作": "...",
  // ...既存15項目...
  "保持値": ["9時半", "3月15日"],
  "条件表現": ["〜ので"]
}
```

### 2-2. INVARIANT_RULESを1個に削減

**変更前:**
```typescript
export const INVARIANT_RULES = `
【不変条件】
1. entities - 数字・日付・時刻・金額・固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. modality_class - 依頼/義務/提案のクラスを変えない
5. question/statement - 質問/断定を変えない
6. condition markers - if/unless/when等を保持
7. commitment - 約束を勝手に追加しない
8. stance_strength - 同意や感情の強さを変えない
9. 意図・確信度・感情極性・モダリティは構造情報の値を固定

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;
```

**変更後:**
```typescript
export const INVARIANT_RULES = `
【不変条件】
1. locked_terms - 用語集の語句をそのまま使う

その他の不変条件（人称・極性・モダリティ・条件・確信度等）は、各リクエストの [Constraints for THIS sentence] セクションで文ごとに具体的に指定される。そちらに厳密に従うこと。

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;
```

### 2-3. PARTIAL_SYSTEM_PROMPTの整理

現在のPARTIAL_SYSTEM_PROMPTには ═══ MEANING LOCK ═══ セクションに12個のルールがある。
動的制約と重複するものを削除・統合する。

**変更前の ═══ MEANING LOCK ═══ セクション:**
```
1. Entities: numbers, dates, times, amounts, proper nouns
2. Polarity: positive ↔ negative never flips
3. Subject: never change (1st person singular ≠ 1st person plural)
4. Intent & modality class: request/report/gratitude/suggestion stays the same
5. Question/statement type preserved
6. Condition markers (if/unless/when) preserved — never drop them
7. Commitment lock: ...
8. Predicate meaning lock: ...
9. Degree lock: ...
10. Speech acts lock: ...
11. No extra facts: ...
12. No ceremonial framing: ...
```

**変更後:**
```
═══ MEANING LOCK (never change) ═══
1. No extra facts: do not add new reasons, excuses, evaluations, or details not present in Seed(0%).
2. No ceremonial framing: Do NOT wrap the message in ceremony not present in the source.
3. locked_terms: glossary terms must be used as-is.

All other meaning constraints (subject, polarity, modality, conditions, degree, entities, speech acts, etc.) are specified per-sentence in [Constraints for THIS sentence]. Follow those strictly.
```

12個 → 3個。残すのは:
- No extra facts（構造フィールドでカバーできない「追加禁止」系）
- No ceremonial framing（同上）
- locked_terms（アプリ機能、構造分析外）

**═══ DYNAMIC CONSTRAINTS ═══ セクションも更新:**

```
═══ DYNAMIC CONSTRAINTS ═══
Each request includes a [Constraints for THIS sentence] block with immutable values
extracted from structural analysis. These constraints override any general rules.
Follow every constraint in that block strictly.
```

---

## 変更3: groq.ts

### 3-1. generateDynamicConstraints を全フィールド対応に拡張

R60の既存関数を以下に置き換え:

```typescript
/**
 * 構造分析データから、この文専用の翻訳制約を動的に生成する。
 * 全フィールドから具体的な指示を生成し、汎用ルールを不要にする。
 */
function generateDynamicConstraints(
  structureData?: TranslateOptions['structureData']
): string {
  if (!structureData) return '';

  const constraints: string[] = [];

  // 1. 人称
  if (structureData.人称) {
    const personMap: Record<string, string> = {
      '一人称単数': 'Subject: first person singular (I/my)',
      '一人称複数': 'Subject: first person plural (we/our)',
      '二人称': 'Subject: second person (you/your)',
      '三人称': 'Subject: third person (he/she/they)',
    };
    const instruction = personMap[structureData.人称];
    if (instruction) constraints.push(instruction);
  }

  // 2. 確信度（発話行為との衝突解決付き）
  if (structureData.確信度) {
    const certaintyMap: Record<string, string> = {
      '確定': 'Certainty: definite statements, no hedging',
      '推測': 'Certainty: use hedging (I think, it seems, perhaps)',
      '可能性': 'Certainty: express as possibility (might, could, maybe)',
      '伝聞': 'Certainty: express as hearsay (apparently, I heard that)',
      '希望': 'Certainty: express as hope/wish',
    };
    let certaintyText = certaintyMap[structureData.確信度] || '';
    
    // 衝突解決: 発話行為に「依頼」「命令」があり確信度が「推測」の場合
    // → 質問/意見部分のみにhedgingを適用、助言/依頼部分は直接表現
    if (certaintyText && structureData.発話行為 && structureData.発話行為.length > 1) {
      const hasDirectAct = structureData.発話行為.some(
        a => ['依頼', '命令', '謝罪'].includes(a)
      );
      if (hasDirectAct && structureData.確信度 === '推測') {
        certaintyText += ' (for question/opinion parts only; advice/request parts stay direct)';
      }
    }
    
    if (certaintyText) constraints.push(certaintyText);
  }

  // 3. 程度
  if (structureData.程度 && structureData.程度 !== 'none') {
    const degreeMap: Record<string, string> = {
      'extreme': 'Degree: keep extreme (absolutely, completely, totally)',
      'strong': 'Degree: keep strong (very, quite, considerably)',
      'moderate': 'Degree: keep moderate (a bit, somewhat, a little)',
      'slight': 'Degree: keep slight (slightly, barely, a touch)',
    };
    const instruction = degreeMap[structureData.程度];
    if (instruction) constraints.push(instruction);
  }

  // 4. 感情極性
  if (structureData.感情極性) {
    const polarityMap: Record<string, string> = {
      'positive': 'Polarity: positive — keep natural, no escalation to formal gratitude (avoid: delighted, pleasure, honored)',
      'negative': 'Polarity: negative — maintain throughout, do not soften to neutral',
      'neutral': 'Polarity: neutral — do not add positive or negative sentiment',
    };
    const instruction = polarityMap[structureData.感情極性];
    if (instruction) constraints.push(instruction);
  }

  // 5. モダリティ
  if (structureData.モダリティ) {
    const modalityMap: Record<string, string> = {
      '報告': 'Modality: report/statement — do not convert to request or suggestion',
      '質問': 'Modality: question — maintain question form',
      '依頼': 'Modality: request — maintain as request, do not convert to command',
      '提案': 'Modality: suggestion — maintain suggestive tone',
      '感謝': 'Modality: gratitude — maintain gratitude expression',
      '感想': 'Modality: impression — maintain as personal impression',
      'その他': '',  // 制約なし
    };
    const instruction = modalityMap[structureData.モダリティ];
    if (instruction) constraints.push(instruction);
  }

  // 6. 発話行為（複数値対応）
  if (structureData.発話行為 && structureData.発話行為.length > 0) {
    const actMap: Record<string, string> = {
      '質問': 'question',
      '報告': 'report',
      '依頼': 'request/advice',
      '感想': 'impression',
      '提案': 'suggestion',
      '感謝': 'gratitude',
      '謝罪': 'apology',
      '命令': 'command',
    };
    if (structureData.発話行為.length === 1) {
      const mapped = actMap[structureData.発話行為[0]] || structureData.発話行為[0];
      constraints.push(`Speech act: ${mapped}`);
    } else {
      const mapped = structureData.発話行為.map(a => actMap[a] || a);
      constraints.push(`Speech acts: ${mapped.join(' + ')} — preserve ALL parts`);
    }
  }

  // 7. 動作の意味
  if (structureData.動作の意味 && structureData.動作の意味 !== 'なし') {
    constraints.push(`Core action: "${structureData.動作の意味}" — preserve this meaning`);
  }

  // 8. 願望
  if (structureData.願望) {
    if (structureData.願望 === 'なし') {
      constraints.push('Do not add wishes, hopes, or promises not in original');
    } else {
      constraints.push('Preserve the wish/desire expression');
    }
  }

  // 9. 保持値（数値・日時・金額等）
  if (structureData.保持値 && structureData.保持値.length > 0) {
    constraints.push(`Preserve exactly (values): ${structureData.保持値.join(', ')}`);
  }

  // 10. 固有名詞（人名・地名等）
  if (structureData.固有名詞 && structureData.固有名詞.length > 0) {
    const names = structureData.固有名詞.map(e => e.text);
    constraints.push(`Preserve exactly (names): ${names.join(', ')}`);
  }

  // 11. 条件表現
  if (structureData.条件表現 && structureData.条件表現.length > 0) {
    constraints.push(`Condition logic: preserve "${structureData.条件表現.join('", "')}" structure`);
  }

  if (constraints.length === 0) return '';

  return `\n[Constraints for THIS sentence — MUST follow]\n${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
}
```

### 3-2. translatePartialの呼び出し部分でstructureDataを拡張

translatePartialを呼ぶ箇所で、structureから全フィールドを渡す:

```typescript
structureData: {
  人称: structure.人称,
  確信度: structure.確信度,
  程度: structure.程度,
  感情極性: structure.感情極性,
  モダリティ: structure.モダリティ,
  発話行為: structure.発話行為,
  動作の意味: structure.動作の意味,
  願望: structure.願望,
  固有名詞: structure.固有名詞,
  保持値: structure.保持値,
  条件表現: structure.条件表現,
}
```

### 3-3. extractStructureのバリデーション更新

extractStructure内のdefaultStructureに追加:

```typescript
const defaultStructure: ExpandedStructure = {
  // ...既存フィールド...
  保持値: [],
  条件表現: [],
};
```

パース後のバリデーションにも追加:

```typescript
// 保持値のバリデーション
保持値: Array.isArray(parsed.保持値)
  ? parsed.保持値.filter((v): v is string => typeof v === 'string')
  : [],

// 条件表現のバリデーション
条件表現: Array.isArray(parsed.条件表現)
  ? parsed.条件表現.filter((v): v is string => typeof v === 'string')
  : [],
```

### 3-4. toneStyleのbusiness人称指示を削除

R59で追加したbusiness各レベル末尾の人称指示を全て削除。
動的制約の人称制約で置き換えられるため不要。

---

## テスト: R61

同じ5文 × 12トーン = 60件

| # | 日本語原文 | 主な検証ポイント |
|---|-----------|----------------|
| 文2 | 昨日の飲み会、すごく楽しかった！ | pleasure維持解消 |
| 文5 | 残念ながら、今回は見送らせていただきます。 | business I維持 |
| 文7 | この企画、かなりいい線いってると思うんだけど。 | considered opinion維持解消 |
| 文8 | 体調よくなった？無理しないでね。 | **「I think」過剰適用が解消されるか（衝突解決ロジック検証）** |
| 文9 | 予算がちょっと厳しいので、もう少し削れるところを探してみます。 | wherein解消 + I維持 + 条件表現「〜ので」保持 |

### 実行フロー
1. `extractStructure(日本語原文)` → structure取得（保持値・条件表現含む）
2. `translateFull(日本語原文, structure)` → seed取得
3. 各トーン×レベルで `translatePartial(seed, structure, tone, level, structureData全フィールド)` → 結果取得

### 出力
ファイル名: `round-61-full-dynamic-constraints.json`
アップ先: `logs/step5-5-v2/round-61-full-dynamic-constraints.json`

JSONに構造データも含めること（保持値・条件表現が正しく抽出されているか確認用）。

---

## ロールバック
- generateDynamicConstraintsの先頭に `return '';` で無効化
- INVARIANT_RULESとPARTIAL_SYSTEM_PROMPTは旧版をコメントアウトして残しておく
- structureDataの拡張はオプショナルなので他に影響なし
