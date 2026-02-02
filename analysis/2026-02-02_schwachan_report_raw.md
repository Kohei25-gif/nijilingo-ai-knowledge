# シュワちゃん分析レポート（原文）
**日付:** 2026-02-02

---

## NijiLingo コード品質・全体レビュー 統合レポート

レビュー日: 2026年2月2日
対象リポジトリ: https://github.com/Kohei25-gif/nijilingo-ai-knowledge
対象ファイル:
- src/current/App.tsx (3,435行)
- src/current/groq.ts (1,963行)

### エグゼクティブサマリー

NijiLingoは多言語翻訳アプリとして優れた機能を持っていますが、iOSアプリ化に向けて以下の重要な課題があります：

| カテゴリ | 緊急 | 重要 | 改善 | 合計 |
|---------|------|------|------|------|
| フロントエンドエラー | 5 | 5 | 4 | 14 |
| UX/UI | 5 | 6 | 6 | 17 |
| iOS互換性 | 6 | 6 | 4 | 16 |
| セキュリティ | 3 | 4 | 2 | 9 |
| パフォーマンス | 4 | 3 | 3 | 10 |
| 合計 | 23 | 24 | 19 | 66 |

---

## 🔴 緊急: 今すぐ対応すべき（エラー・セキュリティ）

### 1. JSONパース例外ハンドリング漏れ [フロントエンド]

**ファイル:** groq.ts:parseJsonResponse関数

```typescript
function parseJsonResponse<T>(text: string): T {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return JSON.parse(cleaned); // ← try-catchなし！
}
```

**影響:** AIレスポンスの形式が予期せず変わった場合、アプリがフリーズまたはクラッシュ

**対策:**
```typescript
function parseJsonResponse<T>(text: string): T {
  try {
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error('Failed to parse API response: ' + (error as Error).message);
  }
}
```

### 2. awaitなしの非同期関数呼び出し [フロントエンド]

**ファイル:** App.tsx（カスタムトーンのプリセットボタン）

```typescript
onClick={() => {
  setCustomTone(preset)
  if (showPreview && preview.translation) {
    fetchAllBucketsForTone('custom', isNative, preset, targetLang, sourceLang) // ← awaitしていない！
  }
}}
```

**影響:** 翻訳処理が失敗してもユーザーに通知されず、UIが「翻訳中」のままになる

**対策:**
```typescript
onClick={async () => {
  setCustomTone(preset)
  if (showPreview && preview.translation) {
    try {
      await fetchAllBucketsForTone('custom', isNative, preset, targetLang, sourceLang)
    } catch (error) {
      setTranslationError('トーン適用に失敗しました')
    }
  }
}}
```

### 3. FileReaderのエラーハンドリング漏れ [フロントエンド]

**ファイル:** App.tsx:handleImageUpload関数

```typescript
const reader = new FileReader()
reader.onloadend = () => { ... } // ← onerrorがない！
reader.readAsDataURL(file)
```

**影響:** 大きすぎる画像や破損した画像をアップロードした場合、何のフィードバックもなく失敗する

**対策:**
```typescript
reader.onerror = () => {
  setError('画像の読み込みに失敗しました。別の画像をお試しください。')
}
```

### 4. APIキーのクライアントサイド露出リスク [セキュリティ]

**ファイル:** groq.ts

**問題:** 外部API（Groq/OpenAI）のキー管理方法が不明確。API_BASE_URL がクライアントから直接アクセス可能な場合、APIキーがブラウザに露出する可能性

**対策:**
- サーバーサイドプロキシ（Next.js API Routes等）を使用
- APIキーは環境変数で管理し、クライアントに露出しない

```typescript
// 推奨: サーバーサイドプロキシ経由
const response = await fetch('/api/translate', {
  method: 'POST',
  body: JSON.stringify({ text, targetLang })
})
```

### 5. XSS（クロスサイトスクリプティング）脆弱性 [セキュリティ]

**ファイル:** App.tsx（ユーザー入力の表示・保存）

**問題:** originalText などが検証なしでlocalStorageに保存され、他のユーザーが閲覧時にスクリプト実行の可能性

**対策:**
```typescript
import DOMPurify from 'dompurify'

// 保存時
const sanitizedText = DOMPurify.sanitize(userInput)
localStorage.setItem('text', sanitizedText)

// 表示時（dangerouslySetInnerHTMLを使用する場合）
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

### 6. Capacitor未導入 [iOS互換性]

**問題:** 現在純粋なWebアプリ。Xcodeビルド不可能

**影響:**
- Camera、Clipboard、Haptics等のネイティブ機能が動作しない
- iOSアプリ化が不可能

**対策:**
```bash
npm install @capacitor/core @capacitor/ios
npx cap init
npx cap add ios
```

### 7. Speech RecognitionのiOS制限 [iOS互換性]

**ファイル:** App.tsx（対面モードの音声入力）

**問題:** webkitSpeechRecognitionはiOS WebViewで動作しない

**対策:**
```bash
npm install @capacitor-community/speech-recognition
```

```typescript
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

// iOS対応
const startListening = async () => {
  await SpeechRecognition.requestPermissions()
  await SpeechRecognition.start({ language: 'ja-JP', maxResults: 1 })
}
```

### 8. Clipboard APIのiOS問題 [iOS互換性]

**ファイル:** App.tsx:1243

**問題:** navigator.clipboard.writeText()はiOS WebViewで制限される

**対策:**
```bash
npm install @capacitor/clipboard
```

```typescript
import { Clipboard } from '@capacitor/clipboard'

const copyToClipboard = async (text: string) => {
  await Clipboard.write({ string: text })
}
```

### 9. localStorageの容量制限 [iOS互換性]

**問題:** iOS WebViewは約5MB制限。パートナー・メッセージデータが消去される可能性

**対策:**
```bash
npm install @capacitor/preferences
```

```typescript
import { Preferences } from '@capacitor/preferences'

const saveData = async (key: string, value: string) => {
  await Preferences.set({ key, value })
}
```

### 10. useStateの過剰使用による再レンダリング問題 [パフォーマンス]

**ファイル:** App.tsx（50個以上のuseState）

**問題:** 1つの状態変更が大量の再レンダリングを引き起こす

**対策:**
```typescript
// useReducerによる状態グループ化
interface AppState {
  ui: { currentScreen: ScreenType; showSettings: boolean }
  translation: { inputText: string; selectedTone: string | null }
}

const [state, dispatch] = useReducer(appReducer, initialState)
```

### 11. useEffect依存配列の問題 [パフォーマンス]

**ファイル:** App.tsx:400-420

**問題:** キャッシュ更新用のuseEffectで依存配列が不適切。無限ループの可能性

**対策:**
```typescript
useEffect(() => {
  if (!selectedTone || !previewSourceText.trim()) return
  // 最小限の依存のみ
}, [selectedTone, activeToneBucket, previewSourceText])
```

### 12. API呼び出しの重複 [パフォーマンス]

**ファイル:** groq.ts

**問題:** ユーザーが素早くタイプすると複数の翻訳リクエストが並行実行

**対策:**
```typescript
const translateWithDebounce = useCallback(
  debounce(async (params) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    // API呼び出し
  }, 300),
  []
)
```

### 13. 翻訳エラー時のリトライ機能がない [UX/UI]

**ファイル:** App.tsx:1102-1107

**問題:** setTranslationError('翻訳中にエラーが発生しました') のみで、リトライボタンや自動再試行がない

**対策:**
```typescript
const handleTranslationError = (error: Error) => {
  setError({
    message: '翻訳中にエラーが発生しました',
    retry: () => fetchTranslation() // リトライ関数
  })
}
```

### 14. ローディング表示が不十分 [UX/UI]

**ファイル:** App.tsx:2643, 3147

**問題:** スケルトンスクリーンやプログレスインジケータがない

**対策:**
```tsx
{isTranslating && (
  <div className="progress-bar">
    <div className="progress" style={{ width: `${progress}%` }} />
  </div>
)}
```

---

## 🟡 重要: 近いうちに対応すべき（UX・パフォーマンス）

### UX/UI改善項目

1. **多言語UIでのテキスト切り詰め問題** - UIラベルは日本語固定。i18n対応で各言語の自己言語名を表示
2. **対面モードの言語切り替えUIが分かりにくい** - 国旗アイコン付きのカスタムドロップダウンを実装
3. **カスタムトーン入力のプレースホルダーが不親切** - 多様な例を表示。入力ヒントボタンを追加
4. **相手一覧の検索機能が未実装** - 名前・タグ・言語でフィルタリング可能にする
5. **解説展開時のスクロール挙動が不安定** - requestAnimationFrameを使用して自動スクロールを最適化
6. **トーンロック機能の視覚的フィードバックが弱い** - ロック中のトーンボタンを強調表示

### iOS互換性改善項目

1. **Service Worker未実装** - Workboxを使用したService Worker実装
2. **API Base URLのハードコード問題** - CapacitorのConfig APIで環境変数管理
3. **console.logの過剰出力** - 本番ビルド時にconsole.logを無効化
4. **Touchイベントの300ms遅延** - touch-action: manipulation CSS適用
5. **キーボード表示時のレイアウト問題** - env(keyboard-inset-height)適用
6. **長押しタイマーのクリーンアップ不足** - longPressTimerのクリーンアップを強化

### セキュリティ改善項目

1. **APIレスポンスの検証不足** - Zodなどのスキーマ検証ライブラリを使用
2. **localStorageデータの信頼性問題** - データ読み込み時に検証を強化
3. **タイムアウト処理の欠如** - 外部API呼び出しにデフォルトのタイムアウトを設定
4. **入力長の制限なし** - ユーザー入力に長さ制限を設ける

### パフォーマンス改善項目

1. **useCallback/useMemoの不足** - 関数と計算値のメモ化
2. **翻訳キャッシュの最適化** - LRUキャッシュ実装、sessionStorage活用
3. **groq.tsのバンドルサイズ最適化** - プロンプトを別ファイルに分割（動的インポート）

---

## 🟢 改善: 余裕がある時に対応（最適化・リファクタリング）

### フロントエンド

1. **型アサーションの多用** - reader.result as stringなどを適切な型チェックに置き換え
2. **confirm()の使用** - モダンUI/UX観点からカスタムダイアログに置き換え
3. **console.logの多用** - 本番環境でのパフォーマンス影響を考慮
4. **正規表現のグローバルフラグ** - lastIndexリセット問題に注意

### UX/UI

1. **スプラッシュ画面のスキップ機能** - タップでスキップ可能にする
2. **メッセージ履歴の日付グルーピング** - 日付区切り（今日/昨日/日付）を追加
3. **言語自動認識の精度表示** - 認識確信度を表示
4. **カスタムトーンのプリセット保存機能** - ユーザーがよく使うトーンを保存・編集可能に
5. **対面モードの音声波形ビジュアライザ** - 音声レベルを視覚的に表示
6. **設定画面のアバター選択拡張** - 絵文字ピッカーを拡張

### iOS互換性

1. **CSSのベンダープレフィックス不足** - 古いiOS対応
2. **Status Bar/Safe Area未対応** - ノッチ機種対応
3. **ダークモード未対応** - システム設定に連動
4. **画像アセットのサイズ最適化** - アプリサイズ肥大化防止

### パフォーマンス

1. **画像アセットの最適化** - 遅延ロード（Intersection Observer）
2. **React.memoの適用機会** - 子コンポーネントのメモ化
3. **開発時のパフォーマンス監視** - React DevTools Profilerの活用

---

## iOS化に向けたロードマップ

### フェーズ1: Capacitor導入（1-2週間）
- [ ] Capacitorコア・iOSプラットフォーム導入
- [ ] 必要なプラグインインストール
- [ ] iOSプロジェクト生成・ビルド確認

### フェーズ2: ネイティブ機能移行（2-3週間）
- [ ] Clipboard → @capacitor/clipboard
- [ ] localStorage → @capacitor/preferences
- [ ] Vibration → @capacitor/haptics
- [ ] Speech Recognition → @capacitor-community/speech-recognition
- [ ] Camera → @capacitor/camera

### フェーズ3: iOS最適化（1-2週間）
- [ ] Safe Area対応
- [ ] キーボードレイアウト調整
- [ ] ダークモード対応

### フェーズ4: オフライン対応（2週間）
- [ ] Service Worker実装
- [ ] IndexedDB導入

### フェーズ5: App Store申請準備（1週間）
- [ ] Info.plistに権限説明追加
  - NSMicrophoneUsageDescription
  - NSCameraUsageDescription
  - NSSpeechRecognitionUsageDescription
- [ ] アプリアイコン・スクリーンショット
- [ ] App Store Connect設定

**推定工数:**
- 最小限のiOS対応: 3-4週間
- 完全なiOS最適化: 6-8週間
- App Store公開まで: 8-10週間

---

## 参考文献・ベストプラクティス

### React大規模アプリ
- Building Scalable React Applications
- Zustand vs Redux Toolkit

### 翻訳アプリUX
- Real-time Speech Translation UX (DiVA論文)
- Multilingual UX in Mobile App Design

### PWA/ネイティブアプリ化
- Capacitor vs React Native (2025)
- App Store Review Guidelines

---

# NijiLingo 多言語対応バグ修正 統合レポート

## 📋 実行サマリー

| 項目 | 内容 |
|------|------|
| 分析日時 | 2026年2月2日 |
| 対象バグ | 多言語自動検出・逆翻訳問題 |
| 対応言語 | 日本語、英語、スペイン語、フランス語、中国語、韓国語、ドイツ語、イタリア語、ポルトガル語、チェコ語 |
| エージェント数 | 4名（コード分析官、多言語翻訳設計者、研究調査官、品質保証官） |

---

## 🔴 問題の根本原因

### バグ1: 自動言語検出の誤検出

**症状:** フランス語「Pourriez-vous m'envoyer les documents...」がチェコ語または英語と誤検出される

**根本原因:**
```
入力: "Pourriez-vous m'envoyer les documents"

文字分解:
├── P, o, u, r, r, i, e, z → ラテン文字基本（英語と同じ）
├── -, v, o, u, s → ラテン文字基本
├── m, ', e, n, v, o, y, e, r → ラテン文字基本
├── l, e, s → ラテン文字基本
└── d, o, c, u, m, e, n, t, s → ラテン文字基本

結果: 固有文字（é, è, ê, à等）が含まれていないため「英語」と判定
```

**ラテン文字系言語の問題:**

| 言語 | 固有文字 | 共有文字 | 問題 |
|------|----------|----------|------|
| フランス語 | œ, æ, Œ, Æ | é, è, à, ç | 一般的な単語に固有文字がない |
| スペイン語 | ¿, ¡, ñ | á, é, í, ó, ú | 文頭・文末記号がないと区別困難 |
| ドイツ語 | ß | ä, ö, ü | 大文字のみのテキストは区別困難 |
| イタリア語 | - | à, è, é, ì, ò, ù | 固有文字が少ない |
| ポルトガル語 | ã, õ | á, é, í, ó, ú, â, ê, ô | スペイン語と区別困難 |
| チェコ語 | ě, š, č, ř, ž, ý, ů, ň, ť, ď | - | 比較的固有文字が多い |

### バグ2: 逆翻訳の言語不整合

**症状:** 他言語→英語の翻訳で、逆翻訳が原文言語ではなく英語のまま表示される

**根本原因:**
```typescript
// 現在の実装（問題あり）
if (sourceLang !== '日本語') {
  return `【逆翻訳ルール】⚠️ reverse_translation は 100% ${sourceLang}のみ`;
}
// 日本語→英語の場合はelse分岐へ（言語指定なし）
```

**条件評価表:**

| ケース | sourceLang | 条件評価 | 結果 |
|--------|------------|----------|------|
| 英語→日本語 | '英語' | '英語' !== '日本語' → true | 英語で逆翻訳 |
| フランス語→日本語 | 'フランス語' | 'フランス語' !== '日本語' → true | フランス語で逆翻訳 |
| 日本語→英語 | '日本語' | '日本語' !== '日本語' → false | else分岐へ |

---

## 🔧 修正方針

### 1. detectLanguage関数の改善

**改善後（スコアリング方式）**
```typescript
const detectLanguage = (text: string): string => {
  if (!text.trim()) return '';

  const textLower = text.toLowerCase();

  // === ステージ1: 固有文字による確実な判定 ===

  // 優先順位1-3: CJK言語（Unicode範囲が完全に独立）
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return '日本語';
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return '韓国語';
  if (/[\u4E00-\u9FFF]/.test(text)) return '中国語';

  // 優先順位4-9: ラテン言語（固有文字による判定）
  if (/[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/.test(text)) return 'チェコ語';
  if (/[ßöÖ]/.test(text)) return 'ドイツ語';
  if (/[¿¡ñÑ]/.test(text)) return 'スペイン語';
  if (/[ãõÃÕ]/.test(text)) return 'ポルトガル語';
  if (/[œæŒÆëïÿËÏŸ]/.test(text)) return 'フランス語';
  if (/[ìòÌÒ]/.test(text)) return 'イタリア語';

  // === ステージ2: スコアリングによる判定 ===

  const scores: Record<string, number> = {
    'フランス語': 0, 'スペイン語': 0, 'ドイツ語': 0,
    'イタリア語': 0, 'ポルトガル語': 0, 'チェコ語': 0, '英語': 0,
  };

  // パターンマッチングでスコアリング
  if (/ez-vous/i.test(textLower)) scores['フランス語'] += 5;
  if (/ción|sión/i.test(textLower)) scores['スペイン語'] += 4;
  if (/ção|são/i.test(textLower)) scores['ポルトガル語'] += 4;
  if (/zione/i.test(textLower)) scores['イタリア語'] += 4;
  if (/sch|ung\s|heit\s/i.test(textLower)) scores['ドイツ語'] += 3;
  if (/ství|nost/i.test(textLower)) scores['チェコ語'] += 3;

  // 共有アクセント記号の配点
  if (/[èêâû]/.test(text)) scores['フランス語'] += 1;
  if (/[áó]/.test(text)) scores['スペイン語'] += 0.5;

  // 最高スコアの言語を返す（閾値: 2点以上）
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore >= 2) {
    return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] ?? '英語';
  }

  return '英語';
};
```

### 2. getReverseTranslationInstruction関数の改善

**修正後（統一方式）**
```typescript
function getReverseTranslationInstruction(
  sourceLang: string,
  targetLang: string,
  toneLevel: number,
  tone?: string,
  customTone?: string
): string {
  // 全ケースで統一したルール
  const reverseLang = sourceLang === '日本語' ? '日本語' : sourceLang;

  return `【逆翻訳ルール - 最重要】
⚠️ reverse_translation は 100% ${reverseLang}のみ で出力すること ⚠️
- 翻訳結果を元の${reverseLang}に戻した表現にする
- 他の言語は絶対に含めない

【口調設定】
${getToneDescription(tone, customTone)}

【レベル設定】
${getLevelInstruction(tone, toneLevel)}`;
}
```

---

## 📊 検出優先順位（根拠付き）

```
優先度1: 日本語 → Unicode範囲が完全に独立（ひらがな・カタカナ）
優先度2: 韓国語 → Unicode範囲が完全に独立（ハングル）
優先度3: 中国語 → 漢字（日本語判定後の残り）
優先度4: チェコ語 → カロン付き文字が最も特徴的（ěščřžůťďň）
優先度5: ドイツ語 → ßはドイツ語固有
優先度6: スペイン語 → ¿¡はスペイン語特有の句読点
優先度7: ポルトガル語 → 鼻母音ãõが特徴的
優先度8: フランス語 → 連字œæが特徴的
優先度9: イタリア語 → ìòが比較的特徴的
優先度10: 英語 → デフォルト
```

---

## 🧪 テストケース

### 日本語↔英語既存機能保護テスト（8ケース）

| ID | テスト名 | 入力 | 期待される出力 |
|----|----------|------|----------------|
| J-001 | 日本語→英語翻訳（基本） | "こんにちは" | translation: "Hello" |
| J-002 | 日本語→英語翻訳（ビジネス） | "よろしくお願いします" | translation: "Nice to meet you" |
| J-003 | 日本語→英語翻訳（長文） | "明日の会議について確認です" | translation: "About tomorrow's meeting" |
| J-004 | 英語→日本語翻訳（基本） | "Hello" | translation: "こんにちは" |
| J-005 | 英語→日本語翻訳（ビジネス） | "Could you help me?" | translation: "手伝っていただけますか" |
| J-006 | 特殊文字（敬語） | "ありがとうございます" | 正しく検出・翻訳 |
| J-007 | 特殊文字（カタカナ） | "コーヒー" | 正しく検出・翻訳 |
| J-008 | 混在（漢字+ひらがな） | "美味しい料理" | 正しく検出・翻訳 |

### 多言語バグ修正テスト（10ケース）

| ID | テスト名 | 入力 | 期待される出力 |
|----|----------|------|----------------|
| L-001 | フランス語自動検出 | "Pourriez-vous m'envoyer" | detected: "フランス語" |
| L-002 | フランス語逆翻訳 | "Bonjour" | reverse_translation: "Bonjour" |
| L-003 | スペイン語→英語 | "¿Cómo estás?" | translation: "How are you?" |
| L-004 | 中国語→英語 | "你好" | translation: "Hello" |
| L-005 | 韓国語→英語 | "안녕하세요" | translation: "Hello" |
| L-006 | ドイツ語→英語 | "Guten Tag" | translation: "Good day" |
| L-007 | イタリア語→英語 | "Buongiorno" | translation: "Good morning" |
| L-008 | ポルトガル語→英語 | "Bom dia" | translation: "Good morning" |
| L-009 | チェコ語→英語 | "Dobrý den" | translation: "Good day" |
| L-010 | フランス語→英語 | "Bonjour" | translation: "Hello" |

### エッジケース（12ケース）

| ID | テスト名 | 入力 | 期待される出力 |
|----|----------|------|----------------|
| E-001 | 複数言語混在（日+英） | "Hello こんにちは" | detected: "日本語" |
| E-002 | 複数言語混在（仏+英） | "Bonjour hello" | detected: "フランス語" |
| E-003 | 記号のみ | "!!!???" | detected: "英語" |
| E-004 | 数字のみ | "12345" | detected: "英語" |
| E-005 | 絵文字含む | "Hello 😊" | detected: "英語" |
| E-006 | 長文（500文字） | [長文] | 正しく検出・翻訳 |
| E-007 | 空文字 | "" | detected: "" |
| E-008 | 空白のみ | " " | detected: "" |
| E-009 | フランス語vsチェコ語 | "Pourriez-vous" | detected: "フランス語" |
| E-010 | 方言（カナダ仏語） | "allo" | detected: "フランス語" |
| E-011 | HTMLタグ含む | "<p>" | detected: "英語" |
| E-012 | URL含む | "Check https://example.com" | detected: "英語" |

---

## ⚠️ 副作用・影響範囲の詳細チェック

### 高リスク項目

| リスク | 内容 | 対策 |
|--------|------|------|
| 言語検出モデル変更 | 既存の検出ロジックを変更 | コードパス分離（日本語用・多言語用） |
| 逆翻訳ロジック変更 | プロンプト生成を変更 | 言語別分離 |

### 影響範囲マトリックス

| 機能 | 影響度 | 理由 |
|------|--------|------|
| 日本語↔英語翻訳 | なし | コードパス分離で保護 |
| 日本語→他言語翻訳 | なし | コードパス分離で保護 |
| 他言語→日本語翻訳 | 中 | 検出精度向上の影響 |
| 他言語→英語翻訳 | 高 | 逆翻訳ロジック変更 |
| 自動言語検出 | 高 | スコアリング方式導入 |

### 保護措置

1. **コードパス分離**
   - 日本語↔英語: 既存コードパスを維持
   - 他言語: 新規コードパスを作成

2. **機能フラグ**
   - 新しい検出ロジックはフラグで制御
   - 問題発生時は即座に旧ロジックにフォールバック

3. **段階的ロールアウト**
   - Phase 1: 内部テスト
   - Phase 2: ベータユーザー
   - Phase 3: 全ユーザー

---

## 📚 参考文献

1. Cavnar, W. B., & Trenkle, J. M. (1994). N-Gram Based Text Categorization
2. Joulin, A., et al. (2016). Bag of Tricks for Efficient Text Classification (FastText)
3. Tanwar, S., et al. (2023). Multilingual Prompt Engineering (X-InSTA)
4. Lu, Y., et al. (2023). Chain-of-Dictionary Prompting (CoD)
5. Jiao, W., et al. (2024). Translation Prompt Taxonomy (T3S)
6. Dunn, J. (2024). Geographically-Informed Language Identification
7. Mistral AI (2025). Multilingual Prompt Engineering in LLMs (arXiv:2505.11665)
