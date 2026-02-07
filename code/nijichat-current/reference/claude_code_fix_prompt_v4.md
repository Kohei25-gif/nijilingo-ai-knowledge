# NijiLingo 修正依頼 v4

**作成日:** 2026-01-29
**検証:** BUGPAK-VERIFY v1.7 ✅収束

## 📁 対象ファイル
- `App_日本語ベース.tsx`

## 🎯 修正内容（4つ）

---

### 修正1: 事前生成useEffectを削除

**箇所:** 920-1030行目付近

以下の2つのuseEffectを削除：

1. ChatScreen用（920-960行目付近）:
```javascript
// ChatScreen: 入力が止まって500ms後に事前生成開始（Nani方式）
useEffect(() => {
  if (currentScreen !== 'chat') return
  if (!inputText.trim() || !currentPartner) {
    setPrefetchStatus('idle')
    return
  }
  // ... 全部削除
}, [inputText, currentPartner, currentScreen, lockedTone, selectedTone, isNative, customTone])
```

2. TranslateScreen用（970-1030行目付近）:
```javascript
// TranslateScreen: 「あなたが送りたい文章」の入力が止まって500ms後に事前生成開始
useEffect(() => {
  if (currentScreen !== 'translate') return
  if (!translateSelfText.trim()) {
    setPrefetchStatus('idle')
    return
  }
  // ... 全部削除
}, [translateSelfText, currentScreen, lockedTone, selectedTone, isNative, customTone, detectedSelfLang, translateSelfTargetLang])
```

**理由:** ボタンごと生成の設計に反している。入力時に事前生成は不要。

---

### 修正2: prefetchStatus関連のUI表示を削除

**箇所:** 3004-3010行目、3524-3530行目付近

TranslateScreen（3004-3010行目付近）:
```jsx
{prefetchStatus === 'loading' && translateSelfText.trim() && (
  // この部分を削除
)}
{prefetchStatus === 'done' && translateSelfText.trim() && !showPreview && (
  // この部分を削除
)}
```

ChatScreen（3524-3530行目付近）も同様に削除。

**理由:** 事前生成を削除したので、このステータス表示も不要。

---

### 修正3: 他トーンのバックグラウンド生成を削除

**箇所:** handleToneSelect内、1608-1618行目付近

以下を削除：
```javascript
// ★ 他のトーンはバックグラウンドで遅延生成（3秒後に開始）
// ※ API詰まり防止のため、選択トーンの生成完了後に開始
const otherTones = ['casual', 'business', 'formal'].filter(t => t !== toneId)
setTimeout(async () => {
  for (const tone of otherTones) {
    // キャンセルされた or 選択中トーンが変わったら中止
    if (backgroundController.signal.aborted || selectedToneRef.current !== toneId) {
      console.log('[handleToneSelect] Background fetch cancelled')
      return
    }
    await fetchAllBucketsForTone(tone, isNative, undefined, targetLang, sourceLang).catch(console.error)
  }
}, 3000)  // 3秒後に開始（選択トーンの生成完了を待つ）
```

また、backgroundAbortRef関連も削除：
- 630行目: `const backgroundAbortRef = useRef<AbortController | null>(null)` 削除
- 1519-1521行目: `if (backgroundAbortRef.current) { ... }` 削除
- 1533-1539行目: `if (backgroundAbortRef.current) { ... }` と `backgroundAbortRef.current = new AbortController()` と `const backgroundController = backgroundAbortRef.current` 削除

**理由:** カジュアル押したらカジュアルだけ生成すればいい。他のトーンは不要。

---

### 修正4: 日本語→英語の生成順序を変更

**箇所:** generateAndCacheUiBuckets内、日本語ベース方式（1180-1350行目付近）

**現状（順次処理）:**
1セットずつ作って、OKが出たらbreak

**修正後（日本語を先に3パターン確定）:**

現在の日本語ベース方式のコード（`if (effectiveSourceLang === '日本語') { ... }`の中身）を以下に置き換え：

```javascript
// ========================================
// 日本語ベース方式（日本語→外国語の場合）- 日本語先確定版
// ========================================
if (effectiveSourceLang === '日本語') {
  
  // ★ Step 1: 日本語を3パターン先に確定
  const confirmedJa: Record<number, string> = { 0: sourceText }
  
  // 日本語品質チェック関数（既存のものを使用）
  const isJapaneseValid = (original: string, edited: string, tone?: string): boolean => {
    // ... 既存の実装をそのまま使用
  }
  
  // 敬語レベル一貫性チェック（既存のものを使用）
  const checkIsMorePolite = (prev: string, current: string, tone: string): boolean => {
    // ... 既存の実装をそのまま使用
  }
  
  // 50%用の日本語を探す
  for (const level of [50, 75, 100]) {
    const editedJa = await editJapaneseForTone(sourceText, tone, level, customToneValue, signal)
    
    // 品質チェック
    if (!isJapaneseValid(sourceText, editedJa, tone)) continue
    // 元と違うかチェック
    if (isTooSimilar(editedJa, sourceText)) continue
    // 敬語レベル一貫性チェック
    if (!checkIsMorePolite(sourceText, editedJa, tone)) continue
    
    confirmedJa[50] = editedJa
    break
  }
  // フォールバック
  if (!confirmedJa[50]) confirmedJa[50] = sourceText
  
  // 100%用の日本語を探す（50%と違うものを探す）
  for (const level of [75, 100]) {
    const editedJa = await editJapaneseForTone(sourceText, tone, level, customToneValue, signal)
    
    // 品質チェック
    if (!isJapaneseValid(sourceText, editedJa, tone)) continue
    // 50%と違うかチェック
    if (isTooSimilar(editedJa, confirmedJa[50])) continue
    // 敬語レベル一貫性チェック（50%より敬語が弱くなっていないか）
    if (!checkIsMorePolite(confirmedJa[50], editedJa, tone)) continue
    
    confirmedJa[100] = editedJa
    break
  }
  // フォールバック
  if (!confirmedJa[100]) confirmedJa[100] = confirmedJa[50]
  
  // ★ Step 2: 確定した日本語それぞれを英語に翻訳
  for (const uiLevel of [0, 50, 100]) {
    const ja = confirmedJa[uiLevel]
    const result = await translateFull(buildOptions(0, ja))
    cacheBucket(uiLevel, {
      translation: result.translation,
      reverse_translation: ja,  // 逆翻訳は編集後の日本語
      risk: result.risk
    })
  }
  
  console.log('[JaBase] 日本語確定:', confirmedJa)
  return
}
```

**理由:** 
- 日本語の差分を先に確定させる
- 日英乖離を防ぐ（日本語が3パターン確定してから英語を作る）

---

## ⚠️ 変更しないもの

- `groq_日本語ベース.ts`（翻訳ロジック本体）
- 対面モード関連のコード
- カスタムトーン処理（`tone === 'custom'`の分岐）
- 外国語→日本語の従来方式
- UI/CSSの変更

---

## 📝 テスト項目

| # | テストケース | 期待する動作 |
|---|-------------|-------------|
| 1 | カジュアルボタン押下 | 3レベル生成、プレビュー表示 |
| 2 | ビジネスボタン押下 | 3レベル生成、プレビュー表示 |
| 3 | 入力だけ（ボタン押さない） | 何も生成しない |
| 4 | 連打（カジュアル→ビジネス） | 前の生成キャンセル、ビジネスのみ |
| 5 | スライダー操作 | キャッシュから即表示 |
| 6 | API失敗 | エラーメッセージ表示 |
| 7 | カスタムトーン | 100%固定で生成 |
| 8 | 日本語編集が元と同じ | フォールバック（元の日本語使用） |
| 9 | 50%と100%が同じ日本語 | 100%は50%と同じ結果 |
| 10 | 外国語→日本語 | 従来方式で動作 |

---

## 🔍 v1.7検証結果

| 項目 | 結果 |
|-----|------|
| ❌ 確定で壊れる | 0件 |
| ⚠️ 高リスク | 0件（対策済み） |
| ？ 未確認 | 0件（確認済み） |

**✅ 収束**
