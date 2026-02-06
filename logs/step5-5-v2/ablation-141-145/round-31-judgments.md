# Ablation Round 31 (old prompts at fb53450) - C Judgment

- 条件: `src/services/prompts.ts` を `fb53450` 時点へ差し替えて実行
- 対象: 141-145
- 判定観点: `over_formal_overreach` の有無（ケース単位）

## 141
- over_formal_overreach: YES
- 根拠: `We would be most grateful if you could be so kind...` / `It is indeed the case...`

## 142
- over_formal_overreach: YES
- 根拠: `Would you not be entirely inclined to concur...`

## 143
- over_formal_overreach: YES
- 根拠: `I would be most grateful if you would be so kind...`

## 144
- over_formal_overreach: NO
- 根拠: 高トーンでも `I am feeling rather down today...` レベルで、過剰儀礼テンプレは未使用

## 145
- over_formal_overreach: YES
- 根拠: `It would be my utmost pleasure...` / `I would be most grateful if...`

## 集計
- over_formal_overreach: 4 / 5 (80%)
