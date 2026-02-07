# pleasure_polarity_flip 修正指示 Phase 1 (v4)

- 修正対象: `src/services/prompts.ts` のみ
- 変更方針:
  1. `getToneStyleInstruction` の business/formal 分岐から英語例文を撤去し、メタ記述化
  2. `structureToPromptText` の `モダリティ=報告` 条件を語彙列挙なしの抽象ルール化

## R54 テスト構成
- Part A（弱点文）
  - 文182, 文192
  - tone: polite/business
  - level: 25/50/75/100
  - 合計16件
- Part B（リグレッション）
  - 財布忘れた
  - 送ってもらえる？
  - ありがとう、助かった
  - 明日の会議は3時からです
  - お会いできて嬉しかったです
  - tone: polite/business
  - level: 100
  - 合計10件

出力先:
- `logs/step5-5-v2/round-54-ceremony-removal-outputs.json`
