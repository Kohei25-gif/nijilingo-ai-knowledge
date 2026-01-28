# バグ2: バックグラウンド競合（待つと結果が変わる）

## 問題
トーンボタン押した直後と、少し待った後で翻訳結果が変わる

## 原因
`handleToneSelect`内の`setTimeout(0)`でバックグラウンド処理が
選択中のトーンと競合し、キャッシュが上書きされる

## 問題箇所
`App_日本語ベース.tsx` 1481-1495行目

```javascript
// 問題のコード
setTimeout(async () => {
  for (const tone of otherTones) {
    await fetchAllBucketsForTone(tone, ...) // ← 選択中トーンと競合
  }
}, 0)
```

## 修正案
```javascript
// 1. バックグラウンド用AbortController分離
const backgroundAbortRef = useRef<AbortController | null>(null)

// 2. 前回のバックグラウンド処理をキャンセル
if (backgroundAbortRef.current) {
  backgroundAbortRef.current.abort()
}
backgroundAbortRef.current = new AbortController()

// 3. 選択中トーンが変わったら中止 + 100ms遅延
const currentToneAtStart = toneId
setTimeout(async () => {
  for (const tone of otherTones) {
    if (selectedTone !== currentToneAtStart || abortSignal.aborted) {
      return  // 中止
    }
    await fetchAllBucketsForTone(tone, ..., abortSignal)
  }
}, 100)  // ← 100ms遅延
```

## ステータス
- [x] 分析完了
- [ ] 修正実装中（Claude Code）
- [ ] 検証待ち
