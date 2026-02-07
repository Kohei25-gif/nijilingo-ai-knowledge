# R63b: toneStyle哲学準拠化（英語特化の全削除）

## 概要
R63でtoneStyleに入れた英語具体例・禁止リストが逆効果だったため、
英語特化の記述を全削除し、言語非依存の構造的定義に置き換える。

## 変更ファイル
- `src/services/prompts.ts` のみ

## 変更対象
- polite 75%
- polite 100%
- business 75%
- business 100%

## 置換方針
- 英語のGood/Bad例、禁止単語リスト、具体フレーズを全削除
- 丁寧さを「語彙の希少性」ではなく「構文の間接性・柔らかさ」で定義
- 原文の動作・意味を別概念に置き換えないことを明示

## テスト
- 同じ10文 × 12トーン = 120件
- 出力: `logs/step5-5-v2/round-63b-tonestyle-philosophy.json`
