# NijiLingo 翻訳システム 完全設計ガイド

> 理想と現実、研究と実装の架け橋

---

## 📑 目次

1. [現状分析：理想と現実](#1-現状分析理想と現実)
2. [日本語→英語翻訳の核心課題](#2-日本語英語翻訳の核心課題)
3. [研究ベースのプロンプト設計](#3-研究ベースのプロンプト設計)
4. [コード分析と実装ガイド](#4-コード分析と実装ガイド)
5. [検証と改善サイクル](#5-検証と改善サイクル)

---

## 1. 現状分析：理想と現実

### 1.1 理想の翻訳システム（Nani翻訳を参考）

```
┌─────────────────────────────────────────────────────────┐
│                    【理想の動作】                        │
├─────────────────────────────────────────────────────────┤
│ 1. ユーザーが日本語を入力                               │
│ 2. 300ms後、全トーンレベル（0/25/50/75/100）を事前生成  │
│ 3. スライダー操作時、即時（<10ms）で翻訳が切り替わる    │
│ 4. 日本語（逆翻訳）と英語（翻訳）が完全に対応           │
│ 5. 名詞認識、主語省略、modality_classが正確             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 現実の問題（検証で発見）

```
┌─────────────────────────────────────────────────────────┐
│                    【現実の課題】                        │
├─────────────────────────────────────────────────────────┤
│ 🔴 最重要: 操作しないと翻訳が変わらない                  │
│    → キャッシュ更新が間に合わない                       │
│                                                         │
│ 🟡 要検討: 日本語（逆翻訳）は変わるが英語（翻訳）は同じ  │
│    → 翻訳と逆翻訳の生成タイミングがずれている           │
│                                                         │
│ 🔴 名詞認識エラー（「おうた」→「singing」）              │
│    → 固有名詞と一般名詞の区別ができていない             │
│                                                         │
│ 🔴 主語省略の誤解釈                                      │
│    → 文脈からの推定が不十分                             │
│                                                         │
│ 🔴 modality_class変更（依頼→確認）                       │
│    → PARTIAL編集で意味が変わってしまう                  │
└─────────────────────────────────────────────────────────┘
```

### 1.3 根本原因の分析

| 問題 | 根本原因 | 影響範囲 |
|------|----------|----------|
| 翻訳が変わらない | 事前生成完了前にスライダー操作 | UI/UX |
| 日英乖離 | 翻訳と逆翻訳が別エージェントで生成 | 品質 |
| 名詞誤認識 | 文脈解析なしの単純な翻訳 | 正確性 |
| 主語省略誤解 | ゼロ照応解決ロジックなし | 正確性 |
| modality変更 | PARTIAL編集の制約が緩い | 品質 |

---

## 2. 日本語→英語翻訳の核心課題

### 2.1 課題1：名詞認識問題

#### 問題の具体例

```
【入力】おうたが寝てから向かいます。

【誤訳】"I'll go after singing sleeps."（おうた=singing）
【正解】"I'll head over after Ota goes to sleep."（おうた=人名Outa）
```

#### なぜ間違えるのか

| 要因 | 説明 |
|------|------|
| ひらがな表記 | 「おうた」は「お歌（song）」とも読める |
| 文脈解析不足 | 後続の「寝てから」が人間の動作であることを無視 |
| NER未実装 | 固有名詞識別（Named Entity Recognition）がない |

#### 研究知見：名詞認識の精度向上

論文 [^7^] "CodeNER: Code Prompting for Named Entity Recognition" によると：

> 「タスクに特化したプロンプトを用いることで、LLMのNER性能が向上する」

**適用方法**：
```
翻訳前に、テキスト内の名詞を以下に分類：
1. 人名（Person）: 後ろに人間の動作が続く
2. 組織名（Organization）: 固有名詞＋組織を示す接尾辞
3. 地名（Location）: 場所を示す文脈
4. 一般名詞（Common）: 上記以外
```

---

### 2.2 課題2：主語省略（ゼロ照応）

#### 問題の具体例

```
【入力】明日会議に行きます。

【誤訳】"Tomorrow will go to the meeting."（主語なし）
【正解】"I will go to the meeting tomorrow." / "He will go..."（文脈依存）
```

#### 日本語の特殊性

| 言語 | 主語の扱い |
|------|-----------|
| 日本語 | pro-drop言語（省略可能） |
| 英語 | 主語必須 |

#### 研究知見：ゼロ照応解決

論文 [^11^] "Japanese Zero Anaphora Resolution using Machine Translation" によると：

> 「文脈情報（前後の文、敬語、動詞の意味属性）から省略主語を推定可能」

**推定の手順**：
```
1. 動詞の種類から主語を推定
   - 来る・行く・帰る → 移動する主体
   - 食べる・飲む → 摂取する主体
   - 寝る・起きる → 生活動作の主体

2. 敬語情報から主語を推定
   - 尊敬語（いらっしゃる・おっしゃる）→ 相手が主語
   - 謙譲語（伺う・参る）→ 自分が主語

3. 文末の語尾から主語を推定
   - 〜てください → 相手に依頼
   - 〜たい → 自分の願望
```

---

### 2.3 課題3：modality_class保持

#### 問題の具体例

```
【入力】明日の会議の資料を送ってもらえる？

【誤訳】"Are you sending the materials for tomorrow's meeting?"（確認）
【正解】"Can you send me the materials for tomorrow's meeting?"（依頼）
```

#### modality_classの種類

| クラス | 例 | 日本語表現 |
|--------|-----|-----------|
| 依頼（Request） | Can you...? | 〜てもらえる？/〜てくれる？ |
| 確認（Confirmation） | Are you...? | 〜してる？/〜なの？ |
| 提案（Suggestion） | Shall we...? | 〜しない？/〜どう？ |
| 義務（Obligation） | You must... | 〜しなきゃ/〜すべき |

#### 研究知見：modality保持

論文 [^2^] "Multi-Agent System for High-Quality Translation" によると：

> 「翻訳時に発話の意図（modality）を明示的にタグ付けすることで、意図の保持率が向上」

---

## 3. 研究ベースのプロンプト設計

### 3.1 基本プロンプト構造

```
【システムプロンプト】

あなたは日本語から英語への翻訳専門家です。
以下のステップで翻訳を行ってください。

【ステップ1: 名詞識別（NER）】
テキスト内の名詞を分類：
- 人名: 後ろに人間の動作（寝る、来る、食べる等）が続く
- 組織名: 固有名詞＋組織を示す接尾辞
- 地名: 場所を示す文脈
- 一般名詞: 上記以外

【ステップ2: ゼロ照応解決】
省略されている主語を文脈から推定：
- 動詞の種類 → 主語の種類（移動/摂取/生活動作）
- 敬語の使用 → 主語の特定（尊敬語=相手、謙譲語=自分）
- 文末の語尾 → 主語の特定（〜てください=相手、〜たい=自分）

【ステップ3: Modality識別】
発話の意図を特定：
- 依頼: 〜てもらえる？/〜てくれる？
- 確認: 〜してる？/〜なの？
- 提案: 〜しない？/〜どう？
- 義務: 〜しなきゃ/〜すべき

【ステップ4: 翻訳実行】
ステップ1-3の分析に基づき翻訳

【出力形式】
{
  "ner_analysis": {
    "entities": [
      {"text": "おうた", "type": "Person", "reason": "後ろに「寝る」が続く"}
    ]
  },
  "zero_anaphora": {
    "inferred_subject": "I",
    "reason": "文末が〜ます（発話者の行動）"
  },
  "modality": {
    "class": "request",
    "marker": "〜てもらえる？"
  },
  "translation": "...",
  "reverse_translation": "..."
}
```

### 3.2 Few-shot例示

```
【例1: 名詞識別】
日本語: 「おうたが寝てから向かいます」
分析: 「おうた」= 人名（後ろに「寝る」が続く）
英語: "I'll head over after Ota goes to sleep."

【例2: ゼロ照応】
日本語: 「明日会議に行きます」
分析: 主語は「私」（文末が〜ます）
英語: "I will go to the meeting tomorrow."

【例3: Modality保持】
日本語: 「資料を送ってもらえる？」
分析: modality=依頼（〜てもらえる？）
英語: "Can you send me the materials?"
```

---

## 4. コード分析と実装ガイド

### 4.1 現状のコード問題点

#### 問題1: 事前生成のタイミング

```typescript
// App.tsx - 現状の問題コード
useEffect(() => {
  const timer = setTimeout(async () => {
    await generateAndCacheUiBuckets({...})  // ← 非同期で完了を待たない
  }, 500)
  return () => clearTimeout(timer)
}, [inputText])

// 問題: 生成完了前にスライダー操作されると古いキャッシュが表示される
```

**改善案**：
```typescript
// 改善版
useEffect(() => {
  const abortController = new AbortController()
  
  const timer = setTimeout(async () => {
    setPrefetchStatus('loading')  // 生成中状態を明示
    
    try {
      await generateAndCacheUiBuckets({
        ...,
        signal: abortController.signal
      })
      
      if (!abortController.signal.aborted) {
        setPrefetchStatus('completed')  // 完了通知
        // 現在のスライダー位置のキャッシュを即時反映
        updatePreviewFromCache(activeToneBucket)
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setPrefetchStatus('error')
      }
    }
  }, 300)  // 300msに短縮
  
  return () => {
    abortController.abort()
    clearTimeout(timer)
  }
}, [inputText])
```

#### 問題2: 翻訳と逆翻訳の乖離

```typescript
// groq.ts - 現状の問題
export async function translateFull(options: TranslateOptions): Promise<TranslationResult> {
  // 翻訳と逆翻訳を同時に生成するが、品質チェックが不十分
  const parsed = parseJsonResponse<TranslationResult>(response)
  
  // 問題: 翻訳と逆翻訳の対応関係をチェックしていない
  return parsed
}
```

**改善案**：
```typescript
// 改善版
interface TranslationResult {
  translation: string
  reverse_translation: string
  risk: 'low' | 'med' | 'high'
  alignment_score?: number  // 翻訳と逆翻訳の一致度
}

function calculateAlignmentScore(
  original: string,
  translation: string,
  reverseTranslation: string
): number {
  // 1. 原文と逆翻訳の編集距離を計算
  const distance = calculateEditDistance(original, reverseTranslation)
  const maxLen = Math.max(original.length, reverseTranslation.length)
  
  // 2. 一致度スコア（1.0が完全一致）
  const score = 1 - (distance / maxLen)
  
  return score
}

export async function translateFull(
  options: TranslateOptions
): Promise<TranslationResult> {
  const response = await callGeminiAPI(...)
  const parsed = parseJsonResponse<TranslationResult>(response)
  
  // 翻訳と逆翻訳の一致度を計算
  const alignmentScore = calculateAlignmentScore(
    options.sourceText,
    parsed.translation,
    parsed.reverse_translation
  )
  
  // 一致度が低い場合はリスクを上げる
  if (alignmentScore < 0.7) {
    parsed.risk = 'high'
    parsed.alignment_score = alignmentScore
  }
  
  return parsed
}
```

#### 問題3: 名詞認識の欠如

```typescript
// 現状: NER処理がない

// 改善版: NERモジュールを追加
interface Entity {
  text: string
  type: 'Person' | 'Organization' | 'Location' | 'Common'
  confidence: number
}

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = []
  
  // 人名パターン: ひらがな/カタカナ + 人間の動作
  const personPattern = /([あ-んア-ン]+)(が|は|を|に|と)(寝る|来る|食べる|話す|働く)/g
  let match
  while ((match = personPattern.exec(text)) !== null) {
    entities.push({
      text: match[1],
      type: 'Person',
      confidence: 0.9
    })
  }
  
  // その他のパターン...
  
  return entities
}

// プロンプトにNER結果を組み込む
function buildSystemPrompt(sourceText: string): string {
  const entities = extractEntities(sourceText)
  
  let entitySection = ''
  if (entities.length > 0) {
    entitySection = `
【名詞識別結果】
${entities.map(e => `- "${e.text}": ${e.type}（信頼度: ${e.confidence}）`).join('\n')}

【注意】上記の名詞分類を尊重して翻訳してください。
`
  }
  
  return `${BASE_SYSTEM_PROMPT}${entitySection}`
}
```

---

## 5. 検証と改善サイクル

### 5.1 検証テストケース

| # | テスト文 | 検証項目 |
|---|----------|----------|
| 1 | 「おうたが寝てから向かいます」 | 名詞認識（人名） |
| 2 | 「明日会議に行きます」 | ゼロ照応（主語補完） |
| 3 | 「資料を送ってもらえる？」 | modality保持（依頼） |
| 4 | 「遅れてごめん、電車が止まってた」 | トーン調整（カジュアル） |
| 5 | 「明日の会議の資料を送ってもらえる？」 | 統合テスト |

### 5.2 改善サイクル

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  実装   │ → │  検証   │ → │  分析   │ → │  改善   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     ↑                                          │
     └──────────────────────────────────────────┘
```

---

## 参考文献

- [^2^] Multi-Agent System for High-Quality Translation (2025)
- [^7^] CodeNER: Code Prompting for Named Entity Recognition (2025)
- [^11^] Japanese Zero Anaphora Resolution using Machine Translation
- [^12^] Collaborative Multi-Agent Translation Systems

---

## まとめ

| 課題 | 研究ベースの解決策 | 実装ポイント |
|------|-------------------|-------------|
| 名詞認識 | NERプロンプト [^7^] | 翻訳前に名詞分類 |
| ゼロ照応 | 文脈解析 [^11^] | 動詞/敬語/語尾から推定 |
| modality | 意図タグ付け [^2^] | 発話意図を明示的に識別 |
| スピード | Nani方式 | 事前生成 + キャッシュ連動 |



---

## 6. 詳細実装ガイド

### 6.1 名詞認識（NER）モジュールの完全実装

```typescript
// ner.ts - 名詞認識モジュール

export type EntityType = 'Person' | 'Organization' | 'Location' | 'Common' | 'Product';

export interface Entity {
  text: string;
  type: EntityType;
  confidence: number;
  start: number;
  end: number;
}

// 人名判定パターン
const PERSON_PATTERNS = [
  // ひらがな/カタカナ + 人間の動作
  { pattern: /([あ-んア-ン]+)(が|は|を|に|と)(寝る|来る|食べる|話す|働く|走る|歩く|座る|立つ)/g, confidence: 0.9 },
  // さん/くん/ちゃん付き
  { pattern: /([あ-んア-ン一-龯]{1,5})(さん|くん|ちゃん|様|殿)/g, confidence: 0.95 },
  // 人名らしいパターン（2-4文字のひらがな）
  { pattern: /([あ-ん]{2,4})(さん|くん|ちゃん|が|は)/g, confidence: 0.7 },
];

// 組織名判定パターン
const ORG_PATTERNS = [
  { pattern: /([一-龯あ-んア-ン]+)(株式会社|会社|大学|病院|銀行|学校)/g, confidence: 0.95 },
  { pattern: /([A-Z][a-z]+)(Inc\.?|Corp\.?|Ltd\.?|Co\.)/g, confidence: 0.9 },
];

// 地名判定パターン
const LOCATION_PATTERNS = [
  { pattern: /(東京|大阪|京都|名古屋|福岡|札幌|仙台|広島|沖縄|北海道)/g, confidence: 0.95 },
  { pattern: /([一-龯あ-ん]+)(都|府|県|市|区|町|村)/g, confidence: 0.85 },
];

// 製品名判定パターン
const PRODUCT_PATTERNS = [
  { pattern: /(iPhone|iPad|MacBook|AirPods|Apple Watch|Galaxy|Pixel)/g, confidence: 0.98 },
  { pattern: /([A-Z][a-zA-Z0-9]*)(Pro|Max|Ultra|Mini)/g, confidence: 0.85 },
];

export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const seen = new Set<string>();

  // 人名抽出
  for (const { pattern, confidence } of PERSON_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match[1]}_${match.index}`;
      if (!seen.has(key)) {
        entities.push({
          text: match[1],
          type: 'Person',
          confidence,
          start: match.index,
          end: match.index + match[1].length
        });
        seen.add(key);
      }
    }
  }

  // 組織名抽出
  for (const { pattern, confidence } of ORG_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match[1]}_${match.index}`;
      if (!seen.has(key)) {
        entities.push({
          text: match[0],
          type: 'Organization',
          confidence,
          start: match.index,
          end: match.index + match[0].length
        });
        seen.add(key);
      }
    }
  }

  // 地名抽出
  for (const { pattern, confidence } of LOCATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match[0]}_${match.index}`;
      if (!seen.has(key)) {
        entities.push({
          text: match[0],
          type: 'Location',
          confidence,
          start: match.index,
          end: match.index + match[0].length
        });
        seen.add(key);
      }
    }
  }

  // 製品名抽出
  for (const { pattern, confidence } of PRODUCT_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match[0]}_${match.index}`;
      if (!seen.has(key)) {
        entities.push({
          text: match[0],
          type: 'Product',
          confidence,
          start: match.index,
          end: match.index + match[0].length
        });
        seen.add(key);
      }
    }
  }

  return entities.sort((a, b) => a.start - b.start);
}

// プロンプト用NERセクション生成
export function generateNerSection(entities: Entity[]): string {
  if (entities.length === 0) return '';

  const lines = entities.map(e => {
    const typeLabels: Record<EntityType, string> = {
      Person: '人名',
      Organization: '組織名',
      Location: '地名',
      Product: '製品名',
      Common: '一般名詞'
    };
    return `- "${e.text}": ${typeLabels[e.type]}（信頼度: ${Math.round(e.confidence * 100)}%）`;
  });

  return `
【名詞識別結果】
${lines.join('\n')}

【翻訳時の注意】
- 人名は音訳（Outa, Tanaka等）
- 組織名は標準的な英語表記を使用
- 地名は一般的な英語表記を使用
- 製品名は公式の英語表記を使用
`;
}
```

### 6.2 ゼロ照応解決モジュール

```typescript
// zeroAnaphora.ts - ゼロ照応解決モジュール

export interface ZeroAnaphoraResult {
  inferredSubject: string;
  confidence: number;
  reason: string;
}

// 動詞→主語タイプマッピング
const VERB_TO_SUBJECT: Record<string, string[]> = {
  // 移動動詞
  '来る': ['I', 'you', 'he', 'she'],
  '行く': ['I', 'you', 'he', 'she'],
  '帰る': ['I', 'you', 'he', 'she'],
  '戻る': ['I', 'you', 'he', 'she'],
  // 摂取動詞
  '食べる': ['I', 'you', 'he', 'she'],
  '飲む': ['I', 'you', 'he', 'she'],
  // 生活動作
  '寝る': ['I', 'you', 'he', 'she'],
  '起きる': ['I', 'you', 'he', 'she'],
  '働く': ['I', 'you', 'he', 'she'],
  // コミュニケーション
  '話す': ['I', 'you', 'he', 'she'],
  '聞く': ['I', 'you', 'he', 'she'],
  '見る': ['I', 'you', 'he', 'she'],
};

// 尊敬語→主語
const RESPECTFUL_TO_SUBJECT: Record<string, string> = {
  'いらっしゃる': 'you',
  'おっしゃる': 'you',
  'なさる': 'you',
  'くださる': 'you',
};

// 謙譲語→主語
const HUMBLE_TO_SUBJECT: Record<string, string> = {
  '伺う': 'I',
  '参る': 'I',
  '申す': 'I',
  'いたす': 'I',
  'まいる': 'I',
};

// 文末パターン→主語
const ENDING_TO_SUBJECT: Record<string, string> = {
  'てください': 'you',
  'ていただけますか': 'you',
  'てもらえますか': 'you',
  'てくれますか': 'you',
  'たい': 'I',
  'たくない': 'I',
  'たかった': 'I',
};

export function resolveZeroAnaphora(
  text: string,
  context?: { previousText?: string; nextText?: string }
): ZeroAnaphoraResult {
  // 1. 動詞から推定
  for (const [verb, subjects] of Object.entries(VERB_TO_SUBJECT)) {
    if (text.includes(verb)) {
      return {
        inferredSubject: subjects[0],
        confidence: 0.7,
        reason: `動詞「${verb}」から主語を推定`
      };
    }
  }

  // 2. 敬語から推定
  for (const [verb, subject] of Object.entries(RESPECTFUL_TO_SUBJECT)) {
    if (text.includes(verb)) {
      return {
        inferredSubject: subject,
        confidence: 0.9,
        reason: `尊敬語「${verb}」から相手を主語として推定`
      };
    }
  }

  for (const [verb, subject] of Object.entries(HUMBLE_TO_SUBJECT)) {
    if (text.includes(verb)) {
      return {
        inferredSubject: subject,
        confidence: 0.9,
        reason: `謙譲語「${verb}」から自分を主語として推定`
      };
    }
  }

  // 3. 文末から推定
  for (const [ending, subject] of Object.entries(ENDING_TO_SUBJECT)) {
    if (text.endsWith(ending) || text.includes(ending)) {
      return {
        inferredSubject: subject,
        confidence: 0.85,
        reason: `文末「${ending}」から主語を推定`
      };
    }
  }

  // 4. デフォルト
  return {
    inferredSubject: 'I',
    confidence: 0.5,
    reason: '文脈から主語を推定できなかったため、デフォルトで「I」を使用'
  };
}

// プロンプト用ゼロ照応セクション生成
export function generateZeroAnaphoraSection(result: ZeroAnaphoraResult): string {
  return `
【ゼロ照応解決結果】
- 推定主語: "${result.inferredSubject}"
- 信頼度: ${Math.round(result.confidence * 100)}%
- 理由: ${result.reason}

【翻訳時の注意】
日本語の省略主語を「${result.inferredSubject}」で補完してください。
`;
}
```

### 6.3 Modality識別モジュール

```typescript
// modality.ts - Modality識別モジュール

export type ModalityClass = 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'statement';

export interface ModalityResult {
  class: ModalityClass;
  confidence: number;
  marker: string;
}

// Modalityパターン定義
const MODALITY_PATTERNS: Array<{
  class: ModalityClass;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    class: 'request',
    patterns: [
      /てもらえる[？?]?$/,
      /てくれる[？?]?$/,
      /ていただけますか[？?]?$/,
      /てもらえますか[？?]?$/,
      /てください[。！]?$/,
      /てくれませんか[？?]?$/,
      /てもらえない[？?]?$/,
    ],
    confidence: 0.9
  },
  {
    class: 'confirmation',
    patterns: [
      /してる[？?]?$/,
      /している[？?]?$/,
      /なの[？?]?$/,
      /ですか[？?]?$/,
      /ますか[？?]?$/,
      /でしょうか[？?]?$/,
      /だよね[？?]?$/,
    ],
    confidence: 0.85
  },
  {
    class: 'suggestion',
    patterns: [
      /しない[？?]?$/,
      /どう[？?]?$/,
      /どうですか[？?]?$/,
      /どうでしょう[？?]?$/,
      /みない[？?]?$/,
      /ましょうか[？?]?$/,
    ],
    confidence: 0.85
  },
  {
    class: 'obligation',
    patterns: [
      /しなきゃ[。！]?$/,
      /しなくちゃ[。！]?$/,
      /すべき[。！]?$/,
      /なければならない[。！]?$/,
      /なきゃいけない[。！]?$/,
    ],
    confidence: 0.9
  }
];

// 英語でのModality表現
const ENGLISH_MODALITY: Record<ModalityClass, string[]> = {
  request: ['Can you', 'Could you', 'Would you', 'Please', 'Will you'],
  confirmation: ['Are you', 'Do you', 'Is it', 'Did you', 'Have you'],
  suggestion: ['Shall we', 'How about', 'What about', "Why don't we"],
  obligation: ['You must', 'You should', 'You have to', 'You need to'],
  statement: [] // 特別なマーカーなし
};

export function detectModality(text: string): ModalityResult {
  for (const { class: modalityClass, patterns, confidence } of MODALITY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        return {
          class: modalityClass,
          confidence,
          marker: match ? match[0] : ''
        };
      }
    }
  }

  return {
    class: 'statement',
    confidence: 0.5,
    marker: ''
  };
}

// 英語のModality表現を取得
export function getEnglishModality(modality: ModalityClass): string[] {
  return ENGLISH_MODALITY[modality];
}

// プロンプト用Modalityセクション生成
export function generateModalitySection(result: ModalityResult): string {
  const classLabels: Record<ModalityClass, string> = {
    request: '依頼',
    confirmation: '確認',
    suggestion: '提案',
    obligation: '義務',
    statement: '断定'
  };

  const englishExpressions = getEnglishModality(result.class);

  return `
【Modality識別結果】
- 発話意図: ${classLabels[result.class]}
- 信頼度: ${Math.round(result.confidence * 100)}%
- マーカー: "${result.marker}"

【翻訳時の注意】
発話意図「${classLabels[result.class]}」を保持してください。
英語表現の候補: ${englishExpressions.join(', ')}
`;
}
```

### 6.4 統合プロンプトビルダー

```typescript
// promptBuilder.ts - 統合プロンプトビルダー

import { extractEntities, generateNerSection } from './ner';
import { resolveZeroAnaphora, generateZeroAnaphoraSection } from './zeroAnaphora';
import { detectModality, generateModalitySection } from './modality';

export interface AnalysisResult {
  ner: ReturnType<typeof extractEntities>;
  zeroAnaphora: ReturnType<typeof resolveZeroAnaphora>;
  modality: ReturnType<typeof detectModality>;
}

export function analyzeText(text: string): AnalysisResult {
  return {
    ner: extractEntities(text),
    zeroAnaphora: resolveZeroAnaphora(text),
    modality: detectModality(text)
  };
}

export function buildSystemPrompt(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  tone?: string,
  toneLevel?: number
): string {
  const analysis = analyzeText(sourceText);

  const basePrompt = `あなたは${sourceLang}から${targetLang}へのプロ翻訳者です。
以下の分析結果に基づいて翻訳を行ってください。
`;

  const nerSection = generateNerSection(analysis.ner);
  const zeroAnaphoraSection = generateZeroAnaphoraSection(analysis.zeroAnaphora);
  const modalitySection = generateModalitySection(analysis.modality);

  const toneSection = tone ? `
【トーン調整】
トーン: ${tone}
レベル: ${toneLevel}%
` : '';

  const outputFormat = `
【出力形式】
{
  "translation": "${targetLang}での翻訳",
  "reverse_translation": "${sourceLang}での逆翻訳",
  "risk": "low|med|high"
}
`;

  return `${basePrompt}${nerSection}${zeroAnaphoraSection}${modalitySection}${toneSection}${outputFormat}`;
}
```

---

## 7. 実装チェックリスト

### Phase 1: 基盤構築
- [ ] NERモジュール実装 (`ner.ts`)
- [ ] ゼロ照応モジュール実装 (`zeroAnaphora.ts`)
- [ ] Modalityモジュール実装 (`modality.ts`)
- [ ] プロンプトビルダー実装 (`promptBuilder.ts`)

### Phase 2: 統合
- [ ] `groq.ts`に分析モジュールを統合
- [ ] `App.tsx`の事前生成ロジック改善
- [ ] キャッシュ戦略の見直し

### Phase 3: 検証
- [ ] テストケース実行
- [ ] 名詞認識精度測定
- [ ] ゼロ照応解決精度測定
- [ ] Modality保持精度測定

### Phase 4: 最適化
- [ ] パフォーマンスチューニング
- [ ] エラーハンドリング強化
- [ ] ユーザーフィードバック収集

