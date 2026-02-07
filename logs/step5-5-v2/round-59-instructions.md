# R59: business toneStyleに人称保持を追加

## 目的
R58でcasual/politeのsubject_shiftは改善したが、businessで依然I→We/Let'sに変わる問題を修正。
toneStyle定義に「主語は構造分析の人称フィールドに従う」を直接埋め込む。

## 変更箇所
- ファイル: groq.ts
- 場所: toneStyle定義のbusiness部分のみ
- 変更: business各レベル末尾に「主語は構造分析の人称フィールドに従う」を追加

## テスト
対象5文（文2, 文5, 文7, 文8, 文9）を12トーンで実行
- extractStructure → translateFull(seed) → translatePartial
- 出力: logs/step5-5-v2/round-59-business-subject.json
