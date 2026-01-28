# バグ1: 敬語レベル不整合

## 問題
超丁寧モードでLv2（UI 50%）がLv1（UI 0%）より敬語弱くなる

## 原因
`generateAndCacheUiBuckets`のLazy生成で、探査順が`[25, 50, 75]`となっており、
25%の軽い敬語が「違う」と判定されてUI 50%として採用される

## 問題箇所
`App_日本語ベース.tsx` 1268-1305行目

```javascript
// 問題のコード
for (const level of [25, 50, 75]) {  // ← 25%から探す = 問題！
  await generateLevel(level)
  // ...「違えばOK」で25%が採用される
}
```

## 修正案
```javascript
// 1. 探査順を変更
for (const level of [50, 75, 100]) {  // ← 25%を除外

// 2. 敬語レベル比較関数を追加
function checkIsMorePolite(base: string, candidate: string, tone: string): boolean {
  if (tone !== 'business' && tone !== 'formal') return true
  const politenessLevels = [
    { pattern: /です[。！]?$/, level: 1 },
    { pattern: /ます[。！]?$/, level: 1 },
    { pattern: /ございます/, level: 2 },
    { pattern: /でございます/, level: 3 },
    { pattern: /いただ/, level: 3 },
    { pattern: /申し上げ/, level: 4 },
    { pattern: /賜り/, level: 4 },
  ]
  // ... baseとcandidateのレベル比較
  return candidateLevel >= baseLevel
}
```

## ステータス
- [x] 分析完了
- [ ] 修正実装中（Claude Code）
- [ ] 検証待ち
