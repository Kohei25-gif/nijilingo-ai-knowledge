# キャッシュキー問題 - シュワちゃんへの質問

## 問題の概要

NijiLingoアプリで、トーンボタン（友達/仕事/丁寧に）を押すと、既に生成済みの0%翻訳が英語になることがある。

## 症状

1. **翻訳ボタンで翻訳** → チェコ語でちゃんと出る ✅
2. **トーンボタンを押す** → 0%の翻訳が英語になる ❌

本来、0%の翻訳結果はトーンに関係なく同じはずなのに、トーンを変えると再生成されて英語になる。

## 原因（調査済み）

キャッシュキーに`tone`が含まれているため、トーンごとに別のキャッシュになっている。

### キャッシュキーの構成
```typescript
const getCacheKey = (tone, toneBucket, sourceText, customTone, sourceLang, targetLang, isNative) => {
  return `${PROMPT_VERSION}|${sourceLang}->${targetLang}|${sourceText}|${tone}_${toneBucket}...`
}
```

### 問題のフロー

**最初の翻訳（トーン未選択）：**
```
tone = 'casual' (デフォルト)
キャッシュキー: "v1|日本語->チェコ語|おうたが寝てから|casual_0"
→ チェコ語で保存 ✅
```

**トーン選択時（例：business）：**
```
tone = 'business'
キャッシュキー: "v1|日本語->チェコ語|おうたが寝てから|business_0"
→ キャッシュミス！（casualで保存されてるから）
→ 新しく生成 → 英語になることがある ❌
```

## 質問

1. **0%の翻訳結果はトーンごとに別にする必要があるのか？**
   - 0%は「原文のまま」だからトーンに関係なく同じはず？
   - それともトーンによって0%も変わる設計？

2. **もし0%はトーン共通でいいなら、どう修正すべきか？**
   - キャッシュキーから`tone`を外す？
   - 0%だけ別のキャッシュキーを使う？
   - 他のアプローチ？

3. **新しく生成すると英語になる問題**
   - translateFullが呼ばれて英語になるのはなぜ？
   - プロンプトの問題？モデル（Llama 4 Scout）の問題？

## 関連コード

### App.tsx - getCacheKey（507行目）
```typescript
const getCacheKey = (
  tone: string | null,
  toneBucket: number,
  sourceText: string,
  customToneText?: string,
  sourceLang?: string,
  targetLang?: string,
  isNativeFlag?: boolean
): string => {
  const customPart = tone === 'custom' && customToneText ? `_${customToneText}` : ''
  const langPart = `${sourceLang || 'auto'}->${targetLang || 'unknown'}`
  const nativePart = isNativeFlag ? '_native' : ''
  return `${PROMPT_VERSION}|${langPart}|${sourceText}|${tone || 'none'}_${toneBucket}${customPart}${nativePart}`
}
```

### App.tsx - handleTranslateConvert（トーン未選択時、1934行目付近）
```typescript
// ★ トーン未選択 → 0%だけ生成（基本翻訳のみ）
const result = await translateFull({
  sourceText,
  sourceLang,
  targetLang,
  isNative,
  tone: 'casual',  // ← デフォルトで'casual'
  toneLevel: 0,
  customTone: undefined,
  structure: structureForTranslate
})
// 0%のキャッシュに保存
const cacheKey0 = getCacheKey('casual', 0, sourceText, undefined, sourceLang, targetLang, isNative)
```

### App.tsx - handleToneSelect（1286行目付近）
```typescript
await generateAndCacheUiBuckets({
  tone: toneId,  // ← 選択されたトーン（'business'等）
  isNative,
  sourceText: previewSourceText,
  currentUiBucket: initialLevel,
  ...
})
```

## リポジトリ

- **NijiChat（プライベート）:** https://github.com/Kohei25-gif/NijiChat
- **このドキュメント:** https://github.com/Kohei25-gif/nijilingo-ai-knowledge
