# 🔧 NijiLingo 改善版v3 実装プロンプト（最終版）

> 作成日: 2025-01-30
> クロちゃん（Claude Code）用

## 🎯 目的

NijiLingoの翻訳システムを改善し、以下の3大バグを解決する：
- **BUG-001**: 日英乖離問題 → checkAlignmentScore で検出
- **BUG-002**: 操作しないと変わらない → ボタンごと生成で根本解決
- **BUG-003**: 名詞認識エラー → NER + Few-Shot強化

## 📁 対象ファイル

```
~/Desktop/NijiLingo/groq_日本語ベース.ts  ← プロンプト・ロジック変更
~/Desktop/NijiLingo/App_日本語ベース.tsx  ← UI・生成フロー変更
```

⚠️ **実装前に必ず実際の行数を確認してください**

---

## 📝 実装手順

### Phase 1: 型定義の拡張（groq_日本語ベース.ts）

既存の `TranslationResult` を以下に置き換え：

```typescript
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
  confidence?: number;
}
```

---

### Phase 2: FULL_SYSTEM_PROMPT_V3_TEMPLATE 追加（groq_日本語ベース.ts）

`TONE_AND_EVALUATION_RULES` の後に追加。

**主な特徴：**
- 3フェーズCoT（NER → ゼロ照応 → Modality）
- 8例のFew-Shot
- 5種類のModality対応（依頼・許可・義務・願望・推量）

（プロンプト全文は `nijilingo_final_report.md` のPhase 2を参照）

---

### Phase 3: PARTIAL_SYSTEM_PROMPT 差し替え（groq_日本語ベース.ts）

3レベル生成対応の新プロンプトに差し替え。

**出力形式：**
```
"Lv1 translation | Lv2 translation | Lv3 translation"
```

（プロンプト全文は `nijilingo_final_report.md` のPhase 3を参照）

---

### Phase 4: checkAlignmentScore 関数追加（groq_日本語ベース.ts）

```typescript
function checkAlignmentScore(
  originalJapanese: string,
  reverseTranslation: string,
  analysis?: TranslationResult['analysis']
): { score: number; aligned: boolean; issues?: string[] } {
  const issues: string[] = [];
  
  // 1. 長さチェック
  const origLength = originalJapanese.length;
  const reverseLength = reverseTranslation.length;
  const lengthRatio = Math.min(origLength, reverseLength) / Math.max(origLength, reverseLength);
  
  if (lengthRatio < 0.5) {
    issues.push('Significant length difference detected');
  }
  
  // 2. NER一致チェック
  if (analysis?.ner) {
    for (const entity of analysis.ner) {
      if (!reverseTranslation.includes(entity.text) && 
          !reverseTranslation.includes(entity.text.replace(/さん$/, ''))) {
        issues.push(`Entity "${entity.text}" may not be preserved`);
      }
    }
  }
  
  // スコア計算
  const baseScore = 1.0;
  const deductionPerIssue = 0.15;
  const score = Math.max(0, baseScore - (issues.length * deductionPerIssue));
  
  // 閾値 0.2
  const THRESHOLD = 0.2;
  
  return {
    score: Math.round(score * 100) / 100,
    aligned: score >= THRESHOLD && issues.length <= 2,
    issues: issues.length > 0 ? issues : undefined
  };
}
```

---

### Phase 5: translateFull 関数修正（groq_日本語ベース.ts）

V3テンプレートを使用し、checkAlignmentScoreを呼び出すように修正。

```typescript
// V3テンプレート使用
const prompt = FULL_SYSTEM_PROMPT_V3_TEMPLATE + "\n\n" + japaneseSentence;

// パラメータ
const response = await callGeminiAPI(prompt, {
  temperature: 0.3,
  max_tokens: 2000,
  top_p: 0.9
});

// 乖離チェック追加
const alignment = checkAlignmentScore(
  japaneseSentence,
  result.reverse_translation || '',
  result.analysis
);

if (!alignment.aligned) {
  result.risk = 'high';
  console.warn('Alignment issues:', alignment.issues);
}
```

---

### Phase 6: ボタンごと生成の実装（App_日本語ベース.tsx）

#### 6-1: generateAndCacheUiBuckets 削除

事前15種類生成のロジックを削除。

#### 6-2: 新しい状態追加

```typescript
const [generatedBuckets, setGeneratedBuckets] = useState<Record<string, PartialTranslationResult>>({});
const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
```

#### 6-3: カテゴリ生成関数追加

```typescript
async function generateCategoryLevels(
  category: string,
  originalSentence: string
): Promise<PartialTranslationResult> {
  setLoadingCategory(category);
  
  try {
    const prompt = PARTIAL_SYSTEM_PROMPT + 
      `\n\nOriginal: "${originalSentence}"` +
      `\nTarget tone: ${category}`;
    
    const response = await callGeminiAPI(prompt, {
      temperature: 0.4,
      max_tokens: 1500,
      top_p: 0.9
    });
    
    return JSON.parse(response);
  } finally {
    setLoadingCategory(null);
  }
}
```

#### 6-4: ボタンクリックハンドラ

```typescript
async function handleCategoryClick(category: string) {
  const originalSentence = fullTranslationResult?.translation || '';
  if (!originalSentence) return;
  
  const result = await generateCategoryLevels(category, originalSentence);
  
  setGeneratedBuckets(prev => ({
    ...prev,
    [category]: result
  }));
}
```

#### 6-5: UI更新

```tsx
<button
  onClick={() => handleCategoryClick(category)}
  disabled={loadingCategory === category}
>
  {loadingCategory === category ? 'Generating...' : category}
</button>

{/* 3レベル表示 */}
{generatedBuckets[category]?.new_translation
  .split('|')
  .map((level, i) => (
    <div key={i}>Lv{i+1}: {level.trim()}</div>
  ))}
```

---

## ✅ テスト項目

| # | テスト | 期待結果 |
|---|--------|---------|
| 1 | 「おうたが寝てから向かいます」 | "Outa"と認識される |
| 2 | 「資料を送ってもらえる？」 | "Can you..."で始まる |
| 3 | カジュアルボタン押下 | Lv1, Lv2, Lv3の3つ生成 |
| 4 | スライダー操作後ボタン押下 | 新しい値で生成される |

---

## ⚠️ 注意事項

1. **行数確認必須** - 実装前に実際のファイルを確認
2. **バックアップ** - 編集前に必ず保存
3. **段階的実装** - Phase毎にテスト
4. **既存互換性** - analysis, modality_checkはoptional
5. **手順も省略せず全部書くこと**
