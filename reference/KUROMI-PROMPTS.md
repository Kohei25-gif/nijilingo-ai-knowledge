# くろみちゃん（Claude Code）用プロンプト集

作成: クロちゃん（claude.ai Opus）
日付: 2026/02/06

---

## 共通ルール（全プロンプトの冒頭にコピペ）

```
【共通ルール - 全作業で守ること】

■ リポジトリ
- アプリ本体: ~/NijiChat
- ログ・設計: ~/nijilingo-ai-knowledge（または ~/clawd/nijilingo-ai-knowledge）

■ ログ保存ルール
作業ログは必ず nijilingo-ai-knowledge に保存すること：
- 分析結果: nijilingo-ai-knowledge/analysis/
- 設計ドキュメント: nijilingo-ai-knowledge/reference/
- 検証ログ: nijilingo-ai-knowledge/logs/

■ Git pushルール
作業が終わったら必ず：
1. nijilingo-ai-knowledge に変更をcommit & push
2. NijiChat に変更があればそちらもcommit & push

■ 前提条件（絶対変えないこと）
現在のアーキテクチャを維持する：
1. 構造抽出（extractStructure）→ 主語、意図、確信度、固有名詞を抽出
2. 0%翻訳（translateFull）→ 構造情報を使って英語に翻訳
3. トーン調整（translatePartial）→ 0%の英語をトーン別に調整
4. 逆翻訳 → 調整後の英語を元言語に戻す
この流れは変えない。

■ 現在のモデル設定
FULL: 'meta-llama/llama-4-scout-17b-16e-instruct'
PARTIAL: 'meta-llama/llama-4-scout-17b-16e-instruct'
JAPANESE_EDIT: 'gpt-4.1-nano'

■ ビルド確認
変更後は必ず npm run build が通ることを確認する。
```

---

## Step 2: 現行プロンプトのバックアップ

```
【共通ルール】（上記をコピペ）

【タスク: Step 2 - 現行プロンプトのバックアップ】

■ 目的
プロンプト改善前の現状を完全に保存する。
後でいつでも戻れるようにする。

■ 作業内容

1. NijiChat でバックアップコミットを作る
cd ~/NijiChat
git add -A
git commit -m "QA改善前のバックアップ（Step 2）"
git push

2. 現行プロンプトをテキストファイルとして抽出・保存する
cd ~/nijilingo-ai-knowledge
mkdir -p reference/prompts-backup-20260206

以下をgroq.tsから抽出して個別ファイルに保存：
- reference/prompts-backup-20260206/EXPANDED_STRUCTURE_PROMPT.txt
  （構造抽出プロンプト全文）
- reference/prompts-backup-20260206/PARTIAL_SYSTEM_PROMPT.txt
  （PARTIALモードシステムプロンプト全文）
- reference/prompts-backup-20260206/INVARIANT_RULES.txt
  （不変条件ルール全文）
- reference/prompts-backup-20260206/TONE_AND_EVALUATION_RULES.txt
  （トーン評価ルール全文）
- reference/prompts-backup-20260206/getLanguageSpecificRules.txt
  （全10言語分のルール生成関数の出力例）
- reference/prompts-backup-20260206/getToneStyleInstruction.txt
  （全トーン×全レベルのスタイル指示）
- reference/prompts-backup-20260206/getReverseTranslationInstruction.txt
  （逆翻訳指示全文）
- reference/prompts-backup-20260206/structureToPromptText.txt
  （構造→プロンプト変換の出力例。代表3パターン）
- reference/prompts-backup-20260206/custom-tones.txt
  （オジサン構文・限界オタク・赤ちゃん言葉・ギャル等の全プリセット）

3. 現行のガード関数一覧も保存
- reference/prompts-backup-20260206/guard-functions-list.txt
  各ガード関数の名前・入力・出力・判定ロジックの概要を一覧化

4. コミット & push
cd ~/nijilingo-ai-knowledge
git add -A
git commit -m "Step 2: 現行プロンプト・ガード関数のバックアップ"
git push

■ 完了確認
- [ ] NijiChatのコミット履歴にバックアップがある
- [ ] nijilingo-ai-knowledge/reference/prompts-backup-20260206/ にファイルがある
- [ ] 各ファイルが空でない（中身を確認）
- [ ] git push 完了

■ 完了したら報告
「Step 2 完了。バックアップしたファイル一覧：（リスト）」と報告して。
```

---

## Step 3: ファイル分割（groq.tsリファクタリング）

```
【共通ルール】（上記をコピペ）

【タスク: Step 3 - groq.tsファイル分割】

■ 目的
groq.ts（約2,000行）を複数ファイルに分割して保守性を上げる。
翻訳ロジック・プロンプト文は一切変更しない。ファイルを分けてimport/exportを繋ぐだけ。

■ 手順

1. ブランチを切る
cd ~/NijiChat
git checkout -b refactor/split-groq-ts

2. 以下のファイルを作成してコードを移動する

| 新ファイル | 移動する内容 |
|-----------|------------|
| src/types.ts | 全ての型定義（IntentType, CertaintyLevel, EntityType, NamedEntity, ExpandedStructure, TranslationResult, PartialTranslationResult, GuardedTranslationResult, ExplanationResult, TranslateOptions, InvariantCheckResult, ModalityClass, FallbackDecision 等） |
| src/guards.ts | 全てのガード関数（calculateEditDistance, normalizeForCompare, isTooSimilarText, extractEntities, extractPolarityMarkers, isQuestion, extractConditionMarkers, hasJapaneseCharacters, checkInvariantConditions, extractModalityClass, checkAlignmentScore, checkModalityConsistency, checkPolitenessGuard, shouldFallbackToFull, applyEvaluationWordGuard, fixDoubleEnding, applyReverseTranslationGuard, applyTranslationLanguageGuard）+ _internal エクスポート |
| src/prompts.ts | 全てのプロンプト定数・ルール生成関数（INVARIANT_RULES, TONE_AND_EVALUATION_RULES, PARTIAL_SYSTEM_PROMPT, JAPANESE_EDIT_SYSTEM_PROMPT, EXPANDED_STRUCTURE_PROMPT, getLanguageSpecificRules, getToneStyleInstruction, getFullDifferenceInstruction, getToneInstruction, getReverseTranslationInstruction, getToneStyleForJapanese, structureToPromptText） |
| src/i18n.ts | 全ての多言語テキスト関数（getDifferenceFromText, getNotYetGeneratedText, getFailedToGenerateText, getNoChangeText, getLangCodeFromName, getLangNameFromCode） |
| src/api.ts | API呼び出し・パース関連（MODELS定数, callGeminiAPI, parseJsonResponse, OpenAIApiError, getOpenAIErrorMessage, API_BASE_URL, EDIT_DISTANCE_THRESHOLD等の定数） |
| src/groq.ts | 上記をimportして翻訳フローを組み立てるだけ（translateFull, translatePartial, translateWithGuard, extractStructure, generateExplanation, generateToneDifferenceExplanation, translatePartnerMessage, editJapaneseForTone, structureCache） |

3. import/exportの整合性を確認
- App.tsx からの import パスを更新
- 各ファイル間の依存関係が循環しないことを確認
- types.ts は他のどのファイルからも依存されない純粋な型定義のみ

4. ビルド確認
npm run build → エラーが出たら修正

5. コミット
cd ~/NijiChat
git add -A
git commit -m "Step 3: groq.tsをtypes/guards/prompts/i18n/apiに分割"
まだmainにマージしない（テストで確認してから）

6. 分割結果のログを保存
cd ~/nijilingo-ai-knowledge
mkdir -p logs/step3-split
以下を記録：
- logs/step3-split/file-map.md（各ファイルに何を移動したかの一覧）
- logs/step3-split/import-graph.md（ファイル間のimport依存関係図）
- logs/step3-split/build-result.txt（npm run buildの出力）

git add -A
git commit -m "Step 3ログ: groq.ts分割の記録"
git push

■ 絶対ルール
- 関数の中身を変えない（移動するだけ）
- プロンプト文を変えない
- 変数名を変えない
- export名を変えない（App.tsxからの呼び出しが壊れるため）
- _internal エクスポートも維持する（テストで使うため）

■ 完了確認
- [ ] npm run build が通る
- [ ] App.tsx からの import が全て解決している
- [ ] groq.ts が大幅に短くなっている（翻訳フロー関数のみ残っている）
- [ ] nijilingo-ai-knowledge にログが保存されている
- [ ] git push 完了（両リポジトリ）

■ うまくいかなかった場合
git checkout main でブランチを捨てて元に戻る。
何が失敗したかを logs/step3-split/failure-report.md に記録してpush。

■ 完了したら報告
「Step 3 完了。分割結果：（ファイル一覧と行数）。ビルド結果：（成功/失敗）」と報告して。
```

---

## Step 4: テストスイート作成

```
【共通ルール】（上記をコピペ）

【タスク: Step 4 - テストスイート作成】

■ 目的
翻訳品質の自動テスト基盤を作る。2段階で作成する。

■ 前提
- Step 3（ファイル分割）が完了していること
- もし未完了ならgroq.tsのままでもOK（_internalエクスポートがあればテスト可能）

■ 手順

### Phase 4a: ガード関数の単体テスト（API呼び出しなし・コストゼロ）

1. ブランチを切る
cd ~/NijiChat
git checkout -b feature/add-tests

2. Vitest を導入する
npm install -D vitest

vitest.config.ts を作成：
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // API呼び出しテスト用に長めに
  }
})
```

package.json に追加：
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

3. src/__tests__/guards.test.ts を作成する

テスト対象（_internal エクスポートから取得）：

a. calculateEditDistance
   - "kitten" と "sitting" → 3
   - 同一文字列 → 0
   - 空文字列 → 相手の長さ
   - 日本語文字列ペア 2件以上

b. extractEntities
   - "3歳です" → 数字3が抽出される
   - "2024年1月15日" → 日付が抽出される
   - "1000円" → 金額が抽出される
   - "エンティティなし" → 空配列

c. extractPolarityMarkers
   - "行かない" → 否定検出
   - "行く" → 否定なし
   - "できない" → 否定検出
   - "not going" → 否定検出

d. isQuestion
   - "ご飯食べた？" → true
   - "送ってもらえる？" → true
   - "向かいます" → false
   - "Do you...?" → true

e. checkInvariantConditions
   - 数字保持テスト: 原文に"3"、翻訳に"3" → passed
   - 数字消失テスト: 原文に"3"、翻訳に数字なし → violations
   - 否定反転テスト: 原文"行かない"、翻訳"I will go" → violations
   - 疑問文変化テスト: 原文"食べた？"、翻訳"I ate." → violations

f. fixDoubleEnding
   - groq.ts内の全パターンに対応するテスト
   - "ですねね" → "ですね"
   - "ますよよ" → "ますよ"
   - 正常な文はそのまま返る

g. checkPolitenessGuard
   - tone="business", 逆翻訳="まじで" → NG
   - tone="business", 逆翻訳="ございます" → OK
   - tone="formal", 逆翻訳="やばい" → NG
   - tone="casual", 逆翻訳="やばい" → OK（casualはチェックしない）

h. extractModalityClass
   - "送ってもらえる？" → "request"
   - "送ってる？" → "question"
   - "送ってください" → "request"
   - "明日行く" → "statement"

テストケースはgroq.ts内のプロンプト（禁止例・正解例）と
ガード関数の正規表現パターンからも自動抽出する。

**最低50件のテストケースを目標にする。**

4. テスト実行
npx vitest run src/__tests__/guards.test.ts
→ 全件PASSすることを確認

5. コミット
cd ~/NijiChat
git add -A
git commit -m "Step 4a: ガード関数単体テスト追加（XX件）"


### Phase 4b: 翻訳統合テスト（API呼び出しあり）

6. テストケースJSONを作成
src/__tests__/qa-test-cases.json を作成する。

以下の40件のテストケースを含める：

【カテゴリA: ひらがな人名（5件）】
A1: "おうたが寝てから向かいます" → Outa=固有名詞、主語=I、singing/song禁止
A2: "ごんたにご飯あげて" → Gonta=固有名詞
A3: "ゆうたと遊んでくる" → Yuta=固有名詞、主語=I
A4: "おうたがごんたを叩いた" → Outa=主語、Gonta=目的語
A5: "ゆうたは3歳です" → Yuta=固有名詞、数字3保持

【カテゴリB: 主語省略（8件）】
B1: "財布忘れた" → 主語=I、You禁止
B2: "向かいます" → 主語=I、We禁止
B3: "ご飯食べた？" → 主語=You、I禁止
B4: "送ってもらえる？" → Can you/Could you（Are you禁止）
B5: "待ってて" → You（暗黙）
B6: "もう帰った" → 主語=I or He/She
B7: "遅れてごめん、電車が止まってた" → 主語=I、You禁止、推測語禁止
B8: "明日行く" → 主語=I、We禁止

【カテゴリC: 確信度（6件）】
C1: "電車が止まってた" → 確定。guess/maybe/probably/I think禁止
C2: "電車が止まってると思う" → 推測。think/believe等必須
C3: "電車が止まってるらしい" → 伝聞。apparently/heard等必須
C4: "財布忘れた" → 確定。I think/maybe/or something禁止
C5: "雨降るかも" → 推測。might/maybe等必須
C6: "明日は晴れるって" → 伝聞。said/heard等必須

【カテゴリD: Modality（5件）】
D1: "送ってもらえる？" → request。Can you/Could you
D2: "送ってる？" → question。Are you sending
D3: "明日の会議の資料を送ってもらえる？" → request
D4: "もう送った？" → question。Did you/Have you
D5: "送ってください" → request。Please send

【カテゴリE: 目的格・願望（4件）】
E1: "君を抱きたい" → 主語=I、目的語=You、入れ替え禁止
E2: "彼女に会いたい" → want to see/meet
E3: "君に伝えたいことがある" → want to tell
E4: "子供を起こさないで" → 否定保持、主語目的語入れ替え禁止

【カテゴリF: 否定・条件文（4件）】
F1: "行かない" → not/don't必須
F2: "できない" → can't/cannot/unable必須
F3: "もし明日晴れたら" → if必須
F4: "電車が止まってたら" → if必須

【カテゴリG: トーン段階（4件×複数レベル）】
G1: "遅れてごめん、電車が止まってた" → casual 25/50/75/100%で差が出ること
G2: "遅れてごめん、電車が止まってた" → business 25/50/75/100%で差が出ること
G3: "その服素敵だね" → casual 50/100%で差が出ること
G4: "その服素敵だね" → business 50/100%で差が出ること

【カテゴリH: 逆翻訳（4件）】
H1: "遅れてごめん、電車が止まってた" → 逆翻訳が日本語、意味が近い
H2: "君を抱きたい" → 逆翻訳で主語目的語反転なし
H3: "明日の会議の資料を送ってもらえる？" → 逆翻訳がrequest維持
H4: "財布忘れた" casual 50% vs 100% → 逆翻訳が異なること

7. テストランナーを作成
src/__tests__/qa-runner.test.ts を作成する。

テストランナーの仕様：
a. qa-test-cases.json を読み込む
b. 各テストケースについて：
   - extractStructure(input) で構造抽出
   - translateFull で翻訳
   - auto_checksを全て検証
   - tone_testsがあれば各レベルで翻訳→差異チェック
   - 逆翻訳チェック（日本語か、原文コピーでないか）
c. 結果をJSONで出力

注意：APIを叩くテストなので、環境変数にAPIキーが必要。
GROQ_API_KEY が設定されていない場合はスキップする。

8. テスト実行
npx vitest run
→ guards.test.ts は全件PASS
→ qa-runner.test.ts は結果を記録（FAILがあっても現時点ではOK）

9. テスト結果をログに保存
cd ~/nijilingo-ai-knowledge
mkdir -p logs/step4-tests
以下を保存：
- logs/step4-tests/guards-test-result.txt（単体テスト結果）
- logs/step4-tests/qa-runner-result.json（統合テスト結果）
- logs/step4-tests/fail-summary.md（FAILしたテストの一覧と原因分析）

git add -A
git commit -m "Step 4ログ: テスト結果の記録"
git push

10. NijiChatもコミット
cd ~/NijiChat
git add -A
git commit -m "Step 4: テストスイート追加（単体XX件 + 統合40件）"
git push

■ CI導入（GitHub Actions）

.github/workflows/test.yml を作成：
```yaml
name: Test

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx vitest run src/__tests__/guards.test.ts
```

注意: qa-runner.test.ts はAPIキーが必要なのでCIには含めない。
CIではガード関数の単体テストのみ実行する。

■ 完了確認
- [ ] guards.test.ts が全件PASS
- [ ] qa-runner.test.ts が実行できる（FAILがあってもOK）
- [ ] qa-test-cases.json に40件のテストケースがある
- [ ] CI設定ファイルがある
- [ ] nijilingo-ai-knowledge にログが保存されている
- [ ] 両リポジトリ git push 完了

■ 完了したら報告
「Step 4 完了。単体テスト：XX件中YY件PASS。統合テスト：40件中ZZ件PASS、WW件FAIL。FAIL内訳：（カテゴリ別）」と報告して。
```

---

## Step 5: Opus QAループ（自動テスト→修正）

```
【共通ルール】（上記をコピペ）

【タスク: Step 5 - Opus QAループ】

■ 目的
Step 4で作成したテストを実行し、FAILしたテストケースを分析して、
プロンプトまたはガード関数を修正する。修正→再テスト→修正のループを
品質が安定するまで繰り返す。

■ 前提
- Step 4（テストスイート作成）が完了していること
- qa-runner.test.ts が実行できること
- GROQ_API_KEY が環境変数に設定されていること

■ 手順

1. ブランチを切る
cd ~/NijiChat
git checkout -b improve/qa-loop-$(date +%Y%m%d)

2. 現在のFAIL状況を確認
npx vitest run src/__tests__/qa-runner.test.ts 2>&1 | tee /tmp/qa-result-0.txt
FAILしたテストを一覧化する。

3. FAIL分析
各FAILについて以下を特定：

a. auto_checksのどの項目がFAILしたか
   - must_contain_any: 期待語が1つも含まれていない
   - must_not_contain: 禁止語が含まれている
   - subject: 期待主語と異なる
   - modality: request/questionが変わっている
   等

b. 原因カテゴリ
   - PROMPT_WEAK: プロンプトのルールが弱い/足りない
   - GUARD_MISSING: ガード関数にこのパターンがない
   - MODEL_LIMIT: モデル（Scout）の能力の限界
   - STRUCTURE_EXTRACTION: 構造抽出が不正確

c. 修正案
   - PROMPT_WEAK → prompts.ts のどの関数を修正するか
   - GUARD_MISSING → guards.ts にどのパターンを追加するか
   - MODEL_LIMIT → human_check_required としてマーク
   - STRUCTURE_EXTRACTION → EXPANDED_STRUCTURE_PROMPT の修正

4. 修正を適用
修正ルール：
- 1回のループで変更するファイルは最大2つ
- 修正前に git commit でセーブポイントを作る
- 修正理由をコードのコメントに残す
- 既存のガード関数単体テスト（guards.test.ts）が壊れないこと

5. 再テスト
npx vitest run src/__tests__/guards.test.ts
→ 単体テストが全件PASS確認

npx vitest run src/__tests__/qa-runner.test.ts 2>&1 | tee /tmp/qa-result-N.txt
→ FAILが減ったか確認

6. ループ判定
- FAIL件数が前回より減った → 次のループへ（Step 3に戻る）
- FAIL件数が変わらない → 2回連続なら停止
- 全件PASS → 完了
- ループ10回到達 → 停止

7. 各ループのログを保存
cd ~/nijilingo-ai-knowledge
mkdir -p logs/step5-qa-loop
各ループごとに：
- logs/step5-qa-loop/loop-N-result.json（テスト結果）
- logs/step5-qa-loop/loop-N-changes.md（変更内容と理由）

8. 完了時
cd ~/NijiChat
git add -A
git commit -m "Step 5: QAループ完了（XX件中YY件改善、ZZ件残り）"
git push

cd ~/nijilingo-ai-knowledge
最終レポートを作成：
logs/step5-qa-loop/final-report.md に以下を記載：
- 実行したループ回数
- 初回FAIL件数 → 最終FAIL件数
- 修正した内容の一覧
- 残ったFAILの一覧と理由
- human_check_required の項目（高木さんに判断してもらうもの）

git add -A
git commit -m "Step 5ログ: QAループ最終レポート"
git push

■ 修正の優先順位
1. ガード関数への追加（guards.ts）→ 最も安全、副作用少ない
2. プロンプトのルール強化（prompts.ts）→ 翻訳品質に影響あり、慎重に
3. 構造抽出プロンプト修正（prompts.ts内のEXPANDED_STRUCTURE_PROMPT）→ 最も影響大

■ 絶対ルール
- ループ上限は10回（無限ループ禁止）
- guards.test.ts を壊さない
- npm run build が常に通ること
- 修正前に必ず git commit
- 判断できないもの（スラングの許容範囲等）は human_check_required
- アーキテクチャ（構造抽出→翻訳→トーン調整→逆翻訳）を変えない

■ 完了したら報告
「Step 5 完了。
- ループ回数: N回
- 初回FAIL: XX件 → 最終FAIL: YY件
- 改善率: ZZ%
- human_check_required: WW件（内容: ...）
- 詳細は logs/step5-qa-loop/final-report.md を参照」
と報告して。
```

---

## Step 6: 新機能実装（Phase 3）

```
【共通ルール】（上記をコピペ）

【タスク: Step 6 - 新機能実装】

■ 注意
Step 5完了後、高木さんの最終確認を経てから実行する。
高木さんの確認なしに着手しない。

■ 実装する機能（優先順）

1. プロンプトの動的化（トークン削減）
   - 構造抽出の結果に応じて、翻訳プロンプトに含めるルールを出し分ける
   - 目的格なし → 目的格ルール省略
   - 願望なし → 願望ルール省略
   - 固有名詞なし → 固有名詞ルール省略
   - 期待効果: 入力トークン30-40%削減

2. NERモジュール（固有名詞認識の強化）
   - ルールベースの前処理で人名パターンを検出
   - ひらがな名前辞書（おうた、ごんた、ゆうた等）
   - LLM呼び出し前に固有名詞をマークする

3. ゼロ照応解決モジュール
   - 主語省略パターンの自動補完
   - 動詞の形態で意図を推定（報告/質問/依頼/命令）

■ 各機能ごとにブランチを切ること
- feature/dynamic-prompt
- feature/ner-module
- feature/zero-anaphora

■ テストが通ることを確認してからmainにマージ

■ ログ保存
各機能の実装ログを nijilingo-ai-knowledge/logs/step6-features/ に保存

■ 完了したら報告
機能ごとに完了報告。テスト結果（改善前→改善後のFAIL件数）を含める。
```

---

## プロンプトの使い方（高木さん向けメモ）

```
1. 共通ルールをコピー
2. 該当Stepのプロンプトをコピー
3. くろみちゃん（Claude Code）に貼り付けて実行
4. 完了報告を確認
5. 次のStepへ
```

各Stepは独立しているので、途中で止めても問題ない。
ブランチを切っているので、失敗したら `git checkout main` で戻れる。
