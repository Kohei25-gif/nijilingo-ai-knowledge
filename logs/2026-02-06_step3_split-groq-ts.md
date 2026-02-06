# Step 3: groq.ts ファイル分割ログ
日時: 2026-02-06
ブランチ: `refactor/split-groq-ts`
コミット: `0379708`

## 概要
`src/services/groq.ts`（2,749行）を6つのモジュールに分割。

## 作成ファイル

| ファイル | 行数 | 内容 |
|---------|------|------|
| `types.ts` | 116 | 型定義（IntentType, ExpandedStructure, TranslationResult 等） |
| `api.ts` | 93 | MODELS定数, callGeminiAPI, parseJsonResponse, OpenAIApiError |
| `guards.ts` | 683 | 全18ガード関数 + `_internal`エクスポート |
| `prompts.ts` | 844 | プロンプト定数・ルール生成関数 |
| `i18n.ts` | 119 | 多言語テキスト関数（10言語対応） |
| `groq.ts` | 534 | 翻訳フロー関数のみ + 後方互換re-export |

## 後方互換性
- `App.tsx`のimport文は変更なし
- `groq.ts`が全てre-exportするため既存コードに影響なし
- `_internal`エクスポートもguards.tsから維持

## ビルド結果
- `tsc -b`: エラーなし
- `vite build`: 成功（318.46 kB JS, 42.92 kB CSS）

## 修正した問題
- 未使用import(`checkAlignmentScore`, `checkPolitenessGuard`, `getNotYetGeneratedText`)を削除
- re-exportの`Impl`エイリアス問題を修正（直接re-exportに変更）
