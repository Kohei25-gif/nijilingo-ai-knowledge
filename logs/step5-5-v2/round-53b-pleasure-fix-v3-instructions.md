# pleasure_polarity_flip 修正指示 v3

- 対象: `src/services/prompts.ts`
- 修正箇所: 3箇所

1. `structureToPromptText` の禁止パターン拡張
- `モダリティが 報告`（感情極性に関係なく）で
  `"pleasure", "delight", "honored", "It is with great"` を禁止。

2. `getToneStyleInstruction` business 100% 例文差し替え
- `"It is my pleasure to inform you that..."` -> `"I wish to inform you that..."`

3. `PARTIAL_SYSTEM_PROMPT` Rule 12 補強
- positive感情でも報告文に pleasure/delight/honor を挿入しない旨を明記。

実施後の確認手順:
- `git diff src/services/prompts.ts`
- `git add` / `git commit` / `git push`
- raw URL確認後に文182/192で再検証
