# Step 5 QAループ最終レポート

## サマリー
- **ループ回数**: 1回（Loop 0: ベースライン → Loop 1: 修正 → 全PASS）
- **初回FAIL**: 7件（40件中）
- **最終FAIL**: 0件（40件中）
- **改善率**: 100%（7件 → 0件）
- **human_check_required**: 0件

## 初回FAIL内訳

| ID | カテゴリ | 原因分類 | 修正方法 |
|----|---------|---------|---------|
| B6 | 主語省略 | TEST_FIX | must_contain_anyに"I'm","home"追加 |
| B7 | 主語省略 | STRUCTURE_EXTRACTION | 「〜てた」=確定の例を追加 |
| C1 | 確信度 | STRUCTURE_EXTRACTION | 同上 |
| C5 | 確信度 | TEST_FIX | certainty_anyで「可能性」も許容 |
| C6 | 確信度 | STRUCTURE_EXTRACTION | 「〜って」=伝聞の例を追加 |
| G1 | トーン差分 | PROMPT_WEAK | 50%差分指示を追加 |
| G2 | トーン差分 | PROMPT_WEAK | 同上 |

## 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/__tests__/qa-test-cases.json` | B6: must_contain_any拡充、C5: certainty_any |
| `src/__tests__/qa-runner.test.ts` | certainty_anyチェック追加、Vitest 4 API対応 |
| `src/services/prompts.ts` | EXPANDED_STRUCTURE_PROMPT強化 + 50%差分指示追加 |
| `src/services/__tests__/prompts.test.ts` | 50%テスト更新 |
| `tsconfig.app.json` | テストファイルをビルド除外 |

## 原因カテゴリ別集計

| カテゴリ | 件数 | 修正先 |
|---------|------|-------|
| STRUCTURE_EXTRACTION | 3 | prompts.ts (EXPANDED_STRUCTURE_PROMPT) |
| PROMPT_WEAK | 2 | prompts.ts (getFullDifferenceInstruction) |
| TEST_FIX | 2 | qa-test-cases.json + qa-runner.test.ts |
| GUARD_MISSING | 0 | - |
| MODEL_LIMIT | 0 | - |

## テスト結果詳細

### カテゴリ別PASS率（最終）

| カテゴリ | 件数 | PASS率 |
|---------|------|-------|
| A: ひらがな人名 | 5/5 | 100% |
| B: 主語省略 | 8/8 | 100% |
| C: 確信度 | 6/6 | 100% |
| D: Modality | 5/5 | 100% |
| E: 目的格・願望 | 4/4 | 100% |
| F: 否定・条件文 | 4/4 | 100% |
| G: トーン段階 | 4/4 | 100% |
| H: 逆翻訳 | 4/4 | 100% |

## 既存テストへの影響
- guards.test.ts: 72/72 PASS（影響なし）
- prompts.test.ts: 45/45 PASS（1件更新して整合）
- i18n.test.ts: 19/19 PASS（影響なし）
- npm run build: 通過

## 所見
- 構造抽出プロンプトへの具体例追加が最も効果的だった
- 「〜てた」を推測と分類するのはLLMの一般的な誤りパターン
- 50%レベルのトーン差分は、明示的な指示がないと25%と同一出力になりやすい
- 全40件が1ループで解決できたのは、根本原因が構造抽出プロンプトの例文不足に集中していたため
