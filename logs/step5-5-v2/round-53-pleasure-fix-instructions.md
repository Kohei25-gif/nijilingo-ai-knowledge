# 修正指示: pleasure_polarity_flip パターン修正 v2

## 目的
positive報告文で polite/business トーン時に `pleasure/delight/honor` が挿入される問題を修正する。

## 実施内容（ユーザー指定）
1. `src/services/prompts.ts` `structureToPromptText` の英語禁止パターンを拡張
- 既存の `negative / neutral` 制約に加え、`モダリティ=報告`（感情極性に関係なく）でも
  `"pleasure", "delight", "honored", "It is with great"` を禁止。

2. `src/services/prompts.ts` `getToneStyleInstruction` business 100% の例文修正
- `"It is my pleasure to inform you that..."` を削除し
- `"I wish to inform you that..."` に置換。

3. `src/services/prompts.ts` `PARTIAL_SYSTEM_PROMPT` Rule 12 を補強
- emotional ceremony 例を
  `"It is my pleasure...", "I was delighted to...", "I am honored to..."` に更新。
- 「感情極性が positive でも、報告文に pleasure/delight/honor を追加してよい理由にはならない」旨を明記。

## 生成タスク
- 文182/192を対象に、以下キーのみ生成:
  - `casual_50`
  - `polite_25`, `polite_50`, `polite_75`, `polite_100`
  - `business_50`, `business_75`, `business_100`
- 出力先:
  - `logs/step5-5-v2/round-53-pleasure-fix-outputs.json`
