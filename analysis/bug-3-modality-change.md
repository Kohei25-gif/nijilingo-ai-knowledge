# バグ3: modality_class変更問題

## 問題
カジュアルLv3で依頼（Can you...）が確認（Are you...）に変わる

例：
- 入力: 「明日の会議の資料を送ってもらえる？」
- 期待: 「資料送って〜」（依頼のまま）
- 実際: 「資料送ってるね？」（確認に変化）

## 原因
1. `PARTIAL_SYSTEM_PROMPT`のmodality指示が弱い
2. ガード関数（`shouldFallbackToFull`）にmodalityチェックがない
3. PARTIAL編集の「差分必須ルール」がmodality_class保持を上書き

## 問題箇所
`groq_日本語ベース.ts` - PARTIAL_SYSTEM_PROMPT + shouldFallbackToFull

## 修正案

### 1. PARTIAL_SYSTEM_PROMPT強化
```javascript
【絶対不変条件 - 変更禁止】
4.  modality_class - 依頼/義務/提案/確認のクラスは絶対に変更禁止（最重要）
    •  依頼（Can you.../Could you.../Please...）→ 依頼のまま
    •  確認（Are you.../Do you.../Is it...）→ 確認のまま
    •  提案（Shall we.../How about...）→ 提案のまま
    •  義務（You must.../You should...）→ 義務のまま

【絶対禁止】
•  文の目的（依頼→確認等）を変えること
•  動詞を変えること（can→are等）
```

### 2. extractModalityClass関数追加
```javascript
function extractModalityClass(text: string): 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'unknown' {
  const lower = text.toLowerCase()
  if (/\b(can you|could you|would you|please|will you)\b/i.test(lower)) return 'request'
  if (/\b(are you|do you|is it|did you|have you)\b/i.test(lower)) return 'confirmation'
  if (/\b(shall we|how about|what about|why don't we)\b/i.test(lower)) return 'suggestion'
  if (/\b(you must|you should|you have to|you need to)\b/i.test(lower)) return 'obligation'
  return 'unknown'
}
```

### 3. shouldFallbackToFullにmodalityチェック追加
```javascript
// 9. modality_classチェック
const originalModality = extractModalityClass(originalText)
const translatedModality = extractModalityClass(result.translation)
if (originalModality !== 'unknown' && originalModality !== translatedModality) {
  return { shouldFallback: true, reason: `modality_class_changed: ${originalModality} -> ${translatedModality}` }
}
```

## ステータス
- [x] 分析完了
- [ ] 修正実装中（Claude Code）
- [ ] 検証待ち
