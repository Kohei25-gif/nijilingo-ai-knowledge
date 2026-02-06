# Model Comparison (Old Prompts, Cases 141-145)

## 条件
- プロンプト: 旧プロンプト（`fb53450`）で固定
- 比較モデル:
  - Scout: `meta-llama/llama-4-scout-17b-16e-instruct`（Round 31）
  - GPT-OSS: `openai/gpt-oss-120b`（Round 33）
- 実行経路: `extractStructure -> translateFull -> translatePartial -> reverse`
- 判定: C方式（manual）

## over_formal_overreach 比較
- Scout（Round 31）: `4/5`（80%）
- gpt-oss-120b（Round 33）: `5/5`（100%）
- 差分: `+1ケース`（+20pt, gpt-oss-120b が悪化）

## 結論
- この5文セットでは、モデルを Scout -> gpt-oss-120b に変えても改善せず、`over_formal_overreach` は増加した。
- したがって「Scout固有問題のみ」とは言えず、旧プロンプト条件でも gpt-oss-120b は同傾向（むしろ強い）を示した。
