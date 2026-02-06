# Ablation Round 33 (old prompts + gpt-oss-120b) - C Judgment

- 条件: `src/services/prompts.ts` を `fb53450`、`MODELS.FULL/PARTIAL = openai/gpt-oss-120b` で実行
- 対象: 141-145
- 判定観点: `over_formal_overreach` の有無（ケース単位）

## 141
- over_formal_overreach: YES
- 根拠: polite 50-100 が `with great pleasure`, `respectfully note` など過剰儀礼。

## 142
- over_formal_overreach: YES
- 根拠: polite/business 75-100 で `most obliged`, `would be most grateful` が混入。

## 143
- over_formal_overreach: YES
- 根拠: polite 75-100 で `greatest pleasure`, `most obliged` へ増幅。

## 144
- over_formal_overreach: YES
- 根拠: polite/business 75-100 が `most honored`, `most grateful` を使用。

## 145
- over_formal_overreach: YES
- 根拠: polite/business 75-100 が `utmost pleasure`, `most grateful` へ増幅。

## 集計
- over_formal_overreach: 5 / 5 (100%)
