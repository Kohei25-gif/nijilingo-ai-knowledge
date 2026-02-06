# Step 4: テストスイート作成ログ
日時: 2026-02-06
ブランチ: `refactor/split-groq-ts`
コミット: `561e0c8`

## 概要
Vitestを導入し、分割した3ファイル（guards.ts, prompts.ts, i18n.ts）のユニットテストを作成。

## テスト内容

| テストファイル | テスト数 | 対象 |
|---------------|---------|------|
| `guards.test.ts` | 72 | 全18ガード関数（editDistance, polarity, modality, alignment等） |
| `prompts.test.ts` | 45 | プロンプト定数, 10言語ルール, トーンスタイル指示, 差分指示 |
| `i18n.test.ts` | 19 | 10言語テキスト関数, 言語コード変換 |
| **合計** | **136** | |

## セットアップ
- Vitest v4.0.18をdevDependenciesに追加
- `vite.config.ts`に`test`設定追加（`/// <reference types="vitest/config" />`）
- `package.json`に`test`/`test:watch`スクリプト追加

## テスト実行結果
```
Test Files  3 passed (3)
Tests       136 passed (136)
Duration    156ms
```

## 修正した問題
- normalizeForCompareの正規表現がストレート引用符のみ対応（スマート引用符非対応を確認）
- checkAlignmentScoreのキーワード抽出が日本語の連続文字を1キーワードとして扱う挙動を考慮
- shouldFallbackToFullのedit_distance閾値（0.95）による事前チェック順序を考慮
- TranslateOptions型の必須フィールド（sourceText, sourceLang, targetLang, isNative）をテストに追加
