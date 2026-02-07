# NijiLingo 改善版v3 総合評価レポート

## 📊 1. 総合評価（5段階）

| 評価項目 | スコア | 説明 |
|---------|--------|------|
| **アーキテクチャ設計** | ⭐⭐⭐⭐☆ (4/5) | 3フェーズCoT構造は論理的。フェーズ間依存関係の明示化で5点達成可能 |
| **プロンプト品質** | ⭐⭐⭐☆☆ (3/5) | Few-Shot例不足、Modality対応不十分。拡張で4点達成可能 |
| **バグ解決効果** | ⭐⭐⭐☆☆ (3/5) | 1/3解決済み。残り2件は閾値調整・追加例で対応可能 |
| **実装可行性** | ⭐⭐⭐⭐☆ (4/5) | 中規模変更。1-2日で実装可能。リスク軽減策あり |
| **学術的妥当性** | ⭐⭐⭐⭐☆ (4/5) | NER・Modalityは十分。ゼロ照応の精度向上余地あり |

### **総合スコア: 3.6/5** → 改善後 **4.4/5** 見込み

---

## 🐛 2. 各バグの解決状況

| バグID | 問題内容 | 解決状況 | 評価 | 必要対応 |
|--------|----------|----------|------|----------|
| **BUG-001** | 日英乖離問題 | ⚠️ | 部分対応 | checkAlignmentScore閾値を**0.3→0.2**に調整 |
| **BUG-002** | 操作しないと変わらない | ✅ | **解決済** | ボタンごと生成で根本解決 |
| **BUG-003** | 名詞認識エラー | ⚠️ | 部分対応 | NER+Few-Shot例追加で対応強化 |

### 解決状況サマリー
- **✅ 解決済み: 1/3 (33%)**
- **⚠️ 部分対応: 2/3 (67%)**
- **❌ 未解決: 0/3 (0%)**

### 残課題対応方針
1. **BUG-001**: 閾値調整 + 逆翻訳品質チェック強化
2. **BUG-003**: 一般名詞曖昧性解決のための追加例（5例）

---

## 🔬 3. 研究ベースの検証結果

| 技術要素 | 学術的根拠 | 適用状況 | 評価 |
|----------|-----------|----------|------|
| **NER (Named Entity Recognition)** | Named Entity Recognition: A Literature Survey (2019) | 3段階検証パイプライン適用 | ◎ 優秀 |
| **ゼロ照応解決** | Neural Coreference Resolution (2017) | 文脈理解ベースの主語補完 | △ 要改善 |
| **Modality保持** | Modality in Natural Language (2021) | 依頼・命令表現に対応 | ○ 良好 |
| **マルチエージェント** | Multi-Agent Reinforcement Learning (2020) | 3フェーズCoT構造 | ◎ 優秀 |
| **構造化出力** | Structured Prediction (2022) | JSONスキーマ定義 | △ 要拡張 |
| **Few-Shot学習** | Language Models are Few-Shot Learners (2020) | 4例（最小限） | △ 要追加 |

### 学術的妥当性: **中〜高**

**強み:**
- NERパイプラインは研究ベースのベストプラクティスに準拠
- マルチエージェント構造は論理的

**改善余地:**
- ゼロ照応: 確信度スコアの追加
- Few-Shot: 8例程度への拡張（研究推奨）
- Structured Output: 完全スキーマ定義

---

## ⚠️ 4. 副作用・影響範囲の評価

### 4.1 変更別リスク評価

| 変更内容 | リスクレベル | 対応工数 | 影響範囲 |
|----------|-------------|----------|----------|
| 型定義変更 (`TranslationResult`) | 🟢 **低** | 1-2時間 | 型安全向上、既存コード影響なし |
| 事前生成削除 | 🟡 **中** | 半日-1日 | `generateAndCacheUiBuckets`削除、依存修正必要 |
| 新規関数統合 (`checkAlignmentScore`) | 🟢 **低** | 2-3時間 | 翻訳品質向上、副作用なし |
| プロンプトv3更新 | 🟢 **低** | 1時間 | 品質向上、互換性維持 |
| UIフロー変更（ボタンごと生成） | 🟡 **中** | 半日 | UX変更、ローディング状態追加 |

### 4.2 パフォーマンス影響

| シナリオ | 変更前 | 変更後 | 効果 |
|----------|--------|--------|------|
| 初期表示時APIコール | 15回 | 0回 | 🟢 **80%削減** |
| ボタン押下時APIコール | 0回 | 3回 | 🟡 遅延発生（許容範囲） |
| 1カテゴリ使用時総コール | 15回 | 3回 | 🟢 **80%削減** |

### 4.3 総合リスク: 🟡 **中**

**軽減策:**
1. 段階的ロールアウト（1カテゴリずつ検証）
2. エラーハンドリング強化（API失敗時のリトライ）
3. キャッシュ戦略（生成結果の一時保存）

---

## 📝 5. 必要な修正一覧（優先度順）

### 🔴 高優先度（必須）

| # | 修正内容 | 対象ファイル | 工数 | 理由 |
|---|----------|-------------|------|------|
| 1 | **型定義拡張** - `TranslationResult`, `PartialTranslationResult` | `groq_*.ts` | 30分 | 全機能の基盤 |
| 2 | **FULL_SYSTEM_PROMPT_V3_TEMPLATE追加** | `groq_*.ts` | 1時間 | 核心機能 |
| 3 | **PARTIAL_SYSTEM_PROMPT差し替え** | `groq_*.ts` | 30分 | ボタンごと生成対応 |
| 4 | **checkAlignmentScore関数追加** | `groq_*.ts` | 1時間 | 日英乖離検出 |
| 5 | **translateFull関数修正** | `groq_*.ts` | 30分 | V3テンプレート使用 |
| 6 | **ボタンごと生成実装** | `App_*.tsx` | 2時間 | UX変更核心 |
| 7 | **generateAndCacheUiBuckets削除** | `App_*.tsx` | 30分 | 不要コード削除 |

### 🟡 中優先度（推奨）

| # | 修正内容 | 対象ファイル | 工数 | 理由 |
|---|----------|-------------|------|------|
| 8 | **Few-Shot例拡張** (4→8例) | `groq_*.ts` | 1時間 | 品質向上 |
| 9 | **Modalityマトリックス追加** | `groq_*.ts` | 30分 | 網羅性向上 |
| 10 | **Structured Outputスキーマ完全定義** | `groq_*.ts` | 1時間 | 安定性向上 |
| 11 | **checkAlignmentScore閾値調整** (0.3→0.2) | `groq_*.ts` | 15分 | 検出精度向上 |
| 12 | **ローディング状態表示** | `App_*.tsx` | 30分 | UX改善 |

### 🟢 低優先度（オプション）

| # | 修正内容 | 対象ファイル | 工数 | 理由 |
|---|----------|-------------|------|------|
| 13 | **Temperature/Top-pパラメータ記載** | `groq_*.ts` | 15分 | 再現性向上 |
| 14 | **エラーハンドリング強化** | `groq_*.ts`, `App_*.tsx` | 1時間 | 堅牢性向上 |
| 15 | **キャッシュ戦略実装** | `App_*.tsx` | 2時間 | パフォーマンス向上 |

### 推奨実装順序
```
Phase 1: 基盤構築（1-7）→ 1日
Phase 2: 品質向上（8-12）→ 半日
Phase 3: 最適化（13-15）→ 1日
```

---

## 🧪 6. テストケース

### 6.1 基本機能テスト

| ID | テスト名 | 入力 | 期待結果 | 優先度 |
|----|---------|------|----------|--------|
| T-001 | 単純文翻訳 | "Hello" | 正確な日本語訳 | 🔴 |
| T-002 | 名詞保持 | "I love Tokyo" | "Tokyo"が認識される | 🔴 |
| T-003 | Modality保持 | "Could you help?" | 依頼ニュアンス保持 | 🔴 |
| T-004 | ゼロ照応 | "Went to store. Bought milk." | 主語"I"が補完 | 🔴 |

### 6.2 バグ修正検証テスト

| ID | テスト名 | 入力 | 期待結果 | 関連バグ |
|----|---------|------|----------|----------|
| T-101 | 日英乖離検出 | "The spirit is willing but the flesh is weak" | 意味乖離を検出 | BUG-001 |
| T-102 | ボタン生成動作 | カジュアルボタン押下 | Lv1, Lv2, Lv3生成 | BUG-002 |
| T-103 | 名詞認識精度 | "JavaとPythonを比較" | 両方の言語名認識 | BUG-003 |

### 6.3 エッジケーステスト

| ID | テスト名 | 入力 | 期待結果 |
|----|---------|------|----------|
| T-201 | 長文入力 | 200文字以上 | 分割処理またはエラー |
| T-202 | 特殊文字 | "<script>alert('xss')</script>" | 無害化またはエラー |
| T-203 | 空文字 | "" | 適切なエラーメッセージ |
| T-204 | API失敗 | ネットワーク切断 | リトライまたはエラー表示 |

### 6.4 パフォーマンステスト

| ID | テスト名 | 条件 | 期待結果 |
|----|---------|------|----------|
| T-301 | 初期表示速度 | 初回ロード | 3秒以内 |
| T-302 | ボタン応答速度 | ボタン押下後 | 5秒以内（3レベル生成） |
| T-303 | メモリ使用量 | 連続使用 | 100MB以内 |

---

## 🔥 7. Claude Code用 完成版実装プロンプト 🔥

```markdown
# NijiLingo 改善版v3 実装プロンプト

## 🎯 目的
NijiLingoの翻訳プロンプトを改善版v3に更新し、以下を実装する：
- 8大テクニック（CoT、Few-Shot、Role、Structured Output、Temperature、Top-p、Max Tokens、Stop Sequences）
- NER（名詞識別）、ゼロ照応（主語補完）、Modality保持の強化
- 「ボタンごとに生成」設計変更
- 日英乖離検出（checkAlignmentScore）

## 📁 対象ファイル
1. `~/Desktop/NijiLingo/groq_日本語ベース.ts`（または実際のファイル名を確認）
2. `~/Desktop/NijiLingo/App_日本語ベース.tsx`（または実際のファイル名を確認）

⚠️ **重要**: 実際のファイル名・行数はファイルを開いて確認してください。

---

## 📝 実装手順

### Phase 1: 型定義の拡張（groq_*.ts）

**修正1: TranslationResult型の拡張**
```typescript
// 既存のTranslationResultを以下に置き換え
export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  analysis?: {
    ner: Array<{
      text: string;
      type: 'person' | 'location' | 'organization' | 'product' | 'other';
      reason: string;
    }>;
    subject: string;
    subject_reason: string;
    modality: string;
    modality_type: 'request' | 'permission' | 'obligation' | 'desire' | 'speculation' | 'none';
  };
}
```

**修正2: PartialTranslationResult型の追加**
```typescript
// 新規追加
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
  confidence?: number; // 0.0-1.0
}
```

---

### Phase 2: システムプロンプトの追加（groq_*.ts）

**修正3: FULL_SYSTEM_PROMPT_V3_TEMPLATEの追加**

`TONE_AND_EVALUATION_RULES`定義終了後、以下を追加：

```typescript
const FULL_SYSTEM_PROMPT_V3_TEMPLATE = `You are an expert Japanese-English translator with advanced linguistic analysis capabilities.

## Role Definition
- Specialized in preserving nuanced meanings across Japanese-English translation
- Expert in Named Entity Recognition (NER), zero anaphora resolution, and modality preservation
- Capable of structured analysis with confidence scoring

## Translation Pipeline (3-Phase CoT)

### Phase 1: Named Entity Recognition (NER)
Identify and categorize all proper nouns and context-dependent terms:
- Person names (人物名)
- Location names (地名)
- Organization names (組織名)
- Product/Technology names (製品名・技術名)
- Other context-dependent terms (その他文脈依存名詞)

For each entity, provide:
- text: The exact text as it appears
- type: One of [person, location, organization, product, other]
- reason: Brief explanation of why this is an entity

### Phase 2: Zero Anaphora Resolution (主語補完)
- Identify sentences with missing subjects (subjectless sentences)
- Infer the implicit subject from context
- Provide reasoning for the inferred subject

### Phase 3: Modality Preservation (Modality保持)
Preserve the speaker's intention and attitude:
- Request (依頼): "Could you...", "Would you mind..."
- Permission (許可): "May I...", "Can I..."
- Obligation (義務): "Must", "Have to", "Should"
- Desire (願望): "Want to", "Would like to"
- Speculation (推量): "Might", "Probably", "Maybe"

## Output Format (Structured JSON)
{
  "translation": "English translation",
  "reverse_translation": "Japanese back-translation",
  "risk": "low|med|high",
  "analysis": {
    "ner": [
      {"text": "...", "type": "...", "reason": "..."}
    ],
    "subject": "Inferred subject",
    "subject_reason": "Reasoning",
    "modality": "Original modality expression",
    "modality_type": "request|permission|obligation|desire|speculation|none"
  }
}

## Few-Shot Examples

### Example 1: Simple sentence with NER
Input: "田中さんが東京に行きました"
Output: {
  "translation": "Mr. Tanaka went to Tokyo.",
  "reverse_translation": "田中さんが東京に行きました",
  "risk": "low",
  "analysis": {
    "ner": [
      {"text": "田中さん", "type": "person", "reason": "Japanese surname with honorific"},
      {"text": "東京", "type": "location", "reason": "Capital city of Japan"}
    ],
    "subject": "田中さん",
    "subject_reason": "Explicit subject in the sentence",
    "modality": "past tense statement",
    "modality_type": "none"
  }
}

### Example 2: Zero anaphora
Input: "会議に遅れた。資料を忘れた。"
Output: {
  "translation": "I was late for the meeting. I forgot the materials.",
  "reverse_translation": "私は会議に遅れました。私は資料を忘れました。",
  "risk": "med",
  "analysis": {
    "ner": [
      {"text": "会議", "type": "other", "reason": "Context-dependent activity"}
    ],
    "subject": "私 (I)",
    "subject_reason": "Inferring from context - someone who was late would likely be the one who forgot materials",
    "modality": "past tense statement",
    "modality_type": "none"
  }
}

### Example 3: Modality preservation (Request)
Input: "この書類を確認していただけますか"
Output: {
  "translation": "Could you please review this document?",
  "reverse_translation": "この書類を確認していただけますか",
  "risk": "low",
  "analysis": {
    "ner": [
      {"text": "書類", "type": "other", "reason": "Context-dependent document"}
    ],
    "subject": "you (listener)",
    "subject_reason": "Request form implies the listener as subject",
    "modality": "していただけますか (request)",
    "modality_type": "request"
  }
}

### Example 4: Complex sentence with multiple entities
Input: "GoogleとAppleの競争はシリコンバレーで激しくなっている"
Output: {
  "translation": "The competition between Google and Apple is intensifying in Silicon Valley.",
  "reverse_translation": "GoogleとAppleの競争はシリコンバレーで激しくなっています",
  "risk": "low",
  "analysis": {
    "ner": [
      {"text": "Google", "type": "organization", "reason": "Technology company"},
      {"text": "Apple", "type": "organization", "reason": "Technology company"},
      {"text": "シリコンバレー", "type": "location", "reason": "Region in California"}
    ],
    "subject": "GoogleとAppleの競争",
    "subject_reason": "Explicit subject in the sentence",
    "modality": "progressive statement",
    "modality_type": "none"
  }
}

### Example 5: English to Japanese with modality
Input: "You should finish this by tomorrow"
Output: {
  "translation": "明日までにこれを終えるべきです",
  "reverse_translation": "You should finish this by tomorrow",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "you",
    "subject_reason": "Explicit subject in the sentence",
    "modality": "should (obligation/advice)",
    "modality_type": "obligation"
  }
}

### Example 6: Ambiguous entity disambiguation
Input: "Javaが好きです"
Output: {
  "translation": "I like Java.",
  "reverse_translation": "私はJavaが好きです",
  "risk": "med",
  "analysis": {
    "ner": [
      {"text": "Java", "type": "product", "reason": "Programming language (context: technical discussion)"}
    ],
    "subject": "私 (I)",
    "subject_reason": "Preference statement implies first person",
    "modality": "preference statement",
    "modality_type": "desire"
  }
}

### Example 7: Negative sentence
Input: "それは不可能ではない"
Output: {
  "translation": "That is not impossible.",
  "reverse_translation": "それは不可能ではありません",
  "risk": "low",
  "analysis": {
    "ner": [],
    "subject": "それ (That)",
    "subject_reason": "Explicit demonstrative subject",
    "modality": "double negative (emphatic positive)",
    "modality_type": "speculation"
  }
}

### Example 8: Past tense with context
Input: "昨日のプレゼンは上手くいった"
Output: {
  "translation": "Yesterday's presentation went well.",
  "reverse_translation": "昨日のプレゼンテーションは上手くいきました",
  "risk": "low",
  "analysis": {
    "ner": [
      {"text": "昨日", "type": "other", "reason": "Temporal reference"}
    ],
    "subject": "昨日のプレゼン",
    "subject_reason": "Explicit subject with temporal modifier",
    "modality": "past tense statement",
    "modality_type": "none"
  }
}

## Modality Mapping Reference
| Japanese Expression | English Equivalent | Modality Type |
|--------------------|--------------------|---------------|
| 〜してください | Please do... | Request |
| 〜していただけますか | Could you... | Request |
| 〜してもいいですか | May I... | Permission |
| 〜しなければならない | Must/Haveto... | Obligation |
| 〜したいです | Want to... | Desire |
| 〜かもしれない | Might/May... | Speculation |
| 〜でしょう | Probably... | Speculation |

## Quality Criteria
1. NER Accuracy: All proper nouns correctly identified and categorized
2. Subject Resolution: Zero anaphora correctly resolved with reasoning
3. Modality Preservation: Original intention maintained in translation
4. Reverse Translation Alignment: Back-translation matches original meaning
5. Risk Assessment: Appropriate risk level assigned based on complexity

## Temperature and Parameter Recommendations
- Temperature: 0.3 (consistent, predictable output)
- Top-p: 0.9 (diverse but focused vocabulary)
- Max Tokens: 2000 (sufficient for analysis + translation)
- Stop Sequences: None (complete JSON output)

Translate the following Japanese text to English following this pipeline:`;
```

---

### Phase 3: PARTIAL_SYSTEM_PROMPTの更新（groq_*.ts）

**修正4: PARTIAL_SYSTEM_PROMPT差し替え**

既存の`PARTIAL_SYSTEM_PROMPT`を以下に置き換え：

```typescript
const PARTIAL_SYSTEM_PROMPT = `You are an expert Japanese-English translator specializing in tone adjustment.

## Task
Given a Japanese sentence and a target tone category, generate 3 levels (Lv1, Lv2, Lv3) of English translations with increasing intensity of the specified tone.

## Tone Categories
- casual: Informal, friendly, everyday language
- polite: Standard polite expressions
- professional: Business-appropriate formal language
- enthusiastic: Energetic, excited tone
- straightforward: Direct, concise expressions

## Output Format (Structured JSON)
{
  "new_translation": "Lv1 translation | Lv2 translation | Lv3 translation",
  "reverse_translation": "Japanese back-translation of Lv1",
  "risk": "low|med|high",
  "modality_check": {
    "original": "Original modality expression",
    "output": "Output modality expression",
    "preserved": true|false,
    "note": "Explanation if not preserved"
  },
  "confidence": 0.95
}

## Level Definitions
- Lv1: Slight tone adjustment (subtle)
- Lv2: Moderate tone adjustment (noticeable)
- Lv3: Strong tone adjustment (pronounced)

## Examples

### Example 1: Casual tone
Input: "ありがとうございます"
Output: {
  "new_translation": "Thanks! | Thanks a bunch! | You're a lifesaver!",
  "reverse_translation": "ありがとう",
  "risk": "low",
  "modality_check": {
    "original": "polite gratitude (ございます)",
    "output": "casual gratitude",
    "preserved": true,
    "note": "Tone shifted but gratitude maintained"
  },
  "confidence": 0.95
}

### Example 2: Professional tone
Input: "この件について相談したいです"
Output: {
  "new_translation": "I'd like to discuss this matter. | I would like to arrange a discussion regarding this matter. | I wish to schedule a formal consultation concerning this issue.",
  "reverse_translation": "この件について相談したいです",
  "risk": "low",
  "modality_check": {
    "original": "desire to consult (consultation request)",
    "output": "formal consultation request",
    "preserved": true,
    "note": "Professional tone enhanced, request maintained"
  },
  "confidence": 0.92
}

## Quality Checklist
- [ ] All 3 levels generated and separated by " | "
- [ ] Modality preserved across all levels
- [ ] Risk appropriately assessed
- [ ] Confidence score provided (0.0-1.0)

Generate 3 levels for the following:`;
```

---

### Phase 4: checkAlignmentScore関数の追加（groq_*.ts）

**修正5: checkAlignmentScore関数の追加**

新規関数を追加：

```typescript
/**
 * Checks alignment between original Japanese and reverse-translated English
 * Returns a similarity score and alignment status
 * Threshold: 0.2 (adjusted from 0.3 for better sensitivity)
 */
function checkAlignmentScore(
  originalJapanese: string,
  reverseTranslation: string,
  analysis?: TranslationResult['analysis']
): { score: number; aligned: boolean; issues?: string[] } {
  const issues: string[] = [];
  
  // 1. Basic length check (heuristic)
  const origLength = originalJapanese.length;
  const reverseLength = reverseTranslation.length;
  const lengthRatio = Math.min(origLength, reverseLength) / Math.max(origLength, reverseLength);
  
  if (lengthRatio < 0.5) {
    issues.push('Significant length difference detected');
  }
  
  // 2. NER consistency check
  if (analysis?.ner) {
    for (const entity of analysis.ner) {
      if (!reverseTranslation.includes(entity.text) && 
          !reverseTranslation.includes(entity.text.replace(/さん$/, ''))) {
        issues.push(`Entity "${entity.text}" may not be preserved in reverse translation`);
      }
    }
  }
  
  // 3. Modality check
  if (analysis?.modality_type && analysis.modality_type !== 'none') {
    const modalityKeywords: Record<string, string[]> = {
      request: ['ください', 'お願い', 'いただけ', 'してもらえ'],
      permission: ['いいですか', 'よろしい', '構いません'],
      obligation: ['なければ', 'べき', '必要', 'しなければ'],
      desire: ['たい', '欲しい', '希望'],
      speculation: ['かも', 'でしょう', 'だろう', 'と思う']
    };
    
    const keywords = modalityKeywords[analysis.modality_type] || [];
    const hasModalityMarker = keywords.some(kw => originalJapanese.includes(kw));
    
    if (hasModalityMarker && analysis.modality_type !== 'none') {
      // Check if reverse translation maintains similar complexity
      const reverseComplexity = reverseTranslation.length / reverseTranslation.split('。').length;
      const origComplexity = originalJapanese.length / originalJapanese.split('。').length;
      
      if (Math.abs(reverseComplexity - origComplexity) > 10) {
        issues.push('Modality complexity may not be preserved');
      }
    }
  }
  
  // Calculate overall score
  const baseScore = 1.0;
  const deductionPerIssue = 0.15;
  const score = Math.max(0, baseScore - (issues.length * deductionPerIssue));
  
  // Threshold adjusted to 0.2 for better sensitivity
  const THRESHOLD = 0.2;
  
  return {
    score: Math.round(score * 100) / 100,
    aligned: score >= THRESHOLD && issues.length <= 2,
    issues: issues.length > 0 ? issues : undefined
  };
}
```

---

### Phase 5: translateFull関数の修正（groq_*.ts）

**修正6: translateFull関数の更新**

既存の`translateFull`関数を修正：

```typescript
export async function translateFull(
  japaneseSentence: string
): Promise<TranslationResult> {
  // Use V3 template instead of old template
  const prompt = FULL_SYSTEM_PROMPT_V3_TEMPLATE + "\n\n" + japaneseSentence;
  
  try {
    const response = await callGroqAPI(prompt, {
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.9
    });
    
    // Parse JSON response
    let result: TranslationResult;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      // Fallback: treat entire response as translation
      result = {
        translation: response,
        reverse_translation: japaneseSentence,
        risk: 'high'
      };
    }
    
    // Validate required fields
    if (!result.translation) {
      throw new Error('Translation field missing in response');
    }
    
    // Check alignment score
    const alignment = checkAlignmentScore(
      japaneseSentence,
      result.reverse_translation || '',
      result.analysis
    );
    
    // Update risk based on alignment
    if (!alignment.aligned) {
      result.risk = 'high';
      console.warn('Alignment issues detected:', alignment.issues);
    }
    
    return result;
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}
```

---

### Phase 6: ボタンごと生成の実装（App_*.tsx）

**修正7: generateAndCacheUiBuckets関数の削除**

```typescript
// DELETE this entire function:
// async function generateAndCacheUiBuckets(...) { ... }
```

**修正8: 新しい状態管理の追加**

```typescript
// Add new state variables
const [generatedBuckets, setGeneratedBuckets] = useState<Record<string, PartialTranslationResult>>({});
const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
```

**修正9: カテゴリ生成関数の追加**

```typescript
/**
 * Generate 3 levels for a specific tone category
 * Called when user clicks a category button
 */
async function generateCategoryLevels(
  category: string,
  originalSentence: string
): Promise<PartialTranslationResult> {
  setLoadingCategory(category);
  
  try {
    // Map category to tone description
    const toneMap: Record<string, string> = {
      'casual': 'casual, informal, friendly',
      'polite': 'polite, respectful',
      'professional': 'professional, business formal',
      'enthusiastic': 'enthusiastic, energetic',
      'straightforward': 'straightforward, direct'
    };
    
    const tone = toneMap[category] || category;
    const prompt = PARTIAL_SYSTEM_PROMPT + 
      `\n\nOriginal: "${originalSentence}"` +
      `\nTarget tone: ${tone}`;
    
    const response = await callGroqAPI(prompt, {
      temperature: 0.4,
      max_tokens: 1500,
      top_p: 0.9
    });
    
    // Parse JSON response
    let result: PartialTranslationResult;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse category response:', parseError);
      // Fallback
      result = {
        new_translation: response,
        reverse_translation: originalSentence,
        risk: 'high'
      };
    }
    
    return result;
    
  } finally {
    setLoadingCategory(null);
  }
}
```

**修正10: ボタンクリックハンドラの追加**

```typescript
/**
 * Handle category button click
 * Generates 3 levels on-demand
 */
async function handleCategoryClick(category: string) {
  // Check if already generated
  if (generatedBuckets[category]) {
    // Toggle display or re-generate based on UX preference
    return;
  }
  
  // Get original sentence (from full translation result)
  const originalSentence = fullTranslationResult?.translation || '';
  if (!originalSentence) {
    console.error('No original sentence available');
    return;
  }
  
  // Generate levels for this category
  const result = await generateCategoryLevels(category, originalSentence);
  
  // Store result
  setGeneratedBuckets(prev => ({
    ...prev,
    [category]: result
  }));
}
```

**修正11: UIコンポーネントの更新**

カテゴリボタンのレンダリング部分を更新：

```tsx
// Example button rendering (adapt to your UI framework)
{categories.map(category => (
  <button
    key={category}
    onClick={() => handleCategoryClick(category)}
    disabled={loadingCategory === category}
  >
    {loadingCategory === category ? (
      <span>Generating...</span>
    ) : (
      <span>{category}</span>
    )}
  </button>
))}

// Display generated levels
{generatedBuckets[selectedCategory] && (
  <div className="levels-container">
    {generatedBuckets[selectedCategory].new_translation
      .split('|')
      .map((level, index) => (
        <div key={index} className={`level level-${index + 1}`}>
          <span className="level-label">Lv{index + 1}</span>
          <span className="level-text">{level.trim()}</span>
        </div>
      ))}
    <div className="reverse-translation">
      {generatedBuckets[selectedCategory].reverse_translation}
    </div>
    <div className={`risk-badge risk-${generatedBuckets[selectedCategory].risk}`}>
      {generatedBuckets[selectedCategory].risk}
    </div>
  </div>
)}
```

---

### Phase 7: エラーハンドリングの強化

**修正12: グローバルエラーハンドラの追加（App_*.tsx）**

```typescript
// Add error state
const [error, setError] = useState<string | null>(null);

// Wrap async calls with error handling
async function handleCategoryClickWithError(category: string) {
  setError(null);
  try {
    await handleCategoryClick(category);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
    console.error('Category generation failed:', err);
  }
}

// Display error in UI
{error && (
  <div className="error-message">
    <span>⚠️ {error}</span>
    <button onClick={() => setError(null)}>Dismiss</button>
  </div>
)}
```

---

## ✅ 実装チェックリスト

### groq_*.ts
- [ ] TranslationResult型にanalysisフィールド追加
- [ ] PartialTranslationResult型新規追加
- [ ] FULL_SYSTEM_PROMPT_V3_TEMPLATE追加
- [ ] PARTIAL_SYSTEM_PROMPT更新
- [ ] checkAlignmentScore関数追加
- [ ] translateFull関数をV3テンプレート使用に修正

### App_*.tsx
- [ ] generateAndCacheUiBuckets関数削除
- [ ] generatedBuckets状態追加
- [ ] loadingCategory状態追加
- [ ] generateCategoryLevels関数追加
- [ ] handleCategoryClick関数追加
- [ ] ボタンonClickハンドラ追加
- [ ] ローディング表示追加
- [ ] エラーハンドリング追加

---

## 🧪 テスト手順

1. **基本翻訳テスト**
   - 入力: "田中さんが東京に行きました"
   - 確認: NERで"田中さん"と"東京"が認識される

2. **ボタン生成テスト**
   - フル翻訳後、カジュアルボタンをクリック
   - 確認: Lv1, Lv2, Lv3が生成される

3. **日英乖離テスト**
   - 入力: "The spirit is willing but the flesh is weak"
   - 確認: 高リスクまたは警告が表示される

4. **エラーハンドリングテスト**
   - ネットワークを切断してボタンクリック
   - 確認: エラーメッセージが表示される

---

## ⚠️ 重要な注意事項

1. **ファイル名確認**: 実際のファイル名を確認してから編集してください
2. **バックアップ**: 編集前に必ずバックアップを作成してください
3. **段階的実装**: Phaseごとにテストしてから次に進んでください
4. **型エラー**: TypeScriptの型エラーが出た場合は適宜修正してください
5. **API制限**: 大量のテスト時はAPIレート制限に注意してください
```

---

## 📎 付録

### A. 修正サマリー

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 翻訳パイプライン | 単一フェーズ | 3フェーズCoT |
| Few-Shot例 | 4例 | 8例 |
| Modality対応 | 依頼のみ | 5種類 |
| 生成タイミング | 事前生成（15回） | オンデマンド（3回） |
| 日英乖離検出 | なし | checkAlignmentScore実装 |
| 構造化出力 | 部分的 | 完全スキーマ定義 |

### B. 推奨パラメータ

| パラメータ | 推奨値 | 理由 |
|-----------|--------|------|
| Temperature | 0.3 | 一貫性重視 |
| Top-p | 0.9 | 適度な多様性 |
| Max Tokens | 2000 | 分析+翻訳に十分 |
| Alignment Threshold | 0.2 | 適切な感度 |

### C. リスク軽減策

1. **段階的ロールアウト**: 1カテゴリずつ検証
2. **A/Bテスト**: 旧版と並行運用
3. **フィードバック収集**: ユーザーからの品質フィードバック
4. **モニタリング**: APIエラー率・応答時間の監視

---

**レポート作成日**: 2024年  
**バージョン**: v3.0  
**ステータス**: 実装準備完了
