# toneStyle・toneInstruction 源流修正

- groq.ts: translatePartial toneStyle の文言を語彙格式中心に修正
- prompts.ts: getToneInstruction の casual/business/formal 各文言を修正
- prompts.ts: PARTIAL_SYSTEM_PROMPT から `All structural-field constraints...` 行を削除
- テスト: Batch2 5文 × 3トーン × 4レベル（60件）
- 出力: batch2-75-output-r65-tone-sourcefix.json
