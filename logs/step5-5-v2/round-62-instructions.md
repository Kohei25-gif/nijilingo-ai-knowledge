# R62: 広域検証テスト（10文 × 12トーン = 120件）

## 目的
R61bで洗練したプロンプト（構造的定義2層 + MEANING LOCK二重防御）を、
過去にFAILした文パターンで広域検証する。

## 前提
- コード: R61bのまま（prompts.ts, groq.ts, types.ts 変更なし）
- ブランチ: `codex/improve/generalize-qa-20260206`
- 処理: extractStructure → translateFull(seed) → translatePartial（全レベル）

## テスト文（10文）
- 文A1: おうたが寝てから向かいます
- 文B1: 財布忘れた
- 文C1: 電車が止まってた
- 文D1: 送ってもらえる？
- 文E1: 君を抱きたい
- 文G1: 遅れてごめん、電車が止まってた
- 文I1: 明日行く
- 文N1: 9時半に新宿駅の南口で待ち合わせしよう
- 文N2: もし時間があれば、手伝ってもらえると助かるんだけど
- 文N3: 田中さんが来週の月曜に50人分の資料を持ってくるらしいよ

## トーン設定
- casual: 25/50/75/100
- polite: 25/50/75/100
- business: 25/50/75/100

## 出力
- ファイル: `logs/step5-5-v2/round-62-broad-validation.json`
- 形式: 各文に `structure`, `seed`, `results`（12トーン）

## 実行手順
1. extractStructure
2. translateFull(seed)
3. translatePartial（12トーン）
4. JSON保存
5. ナレッジリポジトリにpush
