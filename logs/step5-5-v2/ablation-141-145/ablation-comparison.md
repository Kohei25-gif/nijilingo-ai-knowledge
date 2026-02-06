# Ablation Comparison: 141-145 (Old vs Redesigned Prompts)

## 実験設定

- 同一入力: 文141-145（5件）
- 同一実行経路: `extractStructure -> translateFull -> translatePartial -> reverse`
- モデル: 既存構成のまま（Scout + gpt-4.1-nano）
- 比較対象:
  - Round 31: 旧プロンプト（`fb53450`）
  - Round 32: 再設計後プロンプト（HEAD）
- 判定方式: C（こでくん手動）
- 主指標: `over_formal_overreach`（ケース単位）

## 結果

- 旧プロンプト（Round 31）: `4/5`（80%）
- 再設計プロンプト（Round 32）: `5/5`（100%）
- 差分: `+1ケース`（+20pt）

## 判定

- この比較では、**再設計後の方が over_formal_overreach が多い**。
- したがって、少なくともこの5文セットでは「モデル固有傾向のみ」ではなく、**プロンプト再設計の寄与で悪化**している可能性が高い。

## 補足（同時に観測）

- 再設計後は、144/145で「報告・希望」→「依頼」への寄りが出やすい。
- これは over_formal と意味歪みが同時発生しているサイン。

## 次の切り分け提案（必要なら）

- 同5文で3試行ずつ（計15比較）し、温度ゆらぎを平均化して再確認。
- そのうえで `translatePartial` の toneStyle 文言だけを1点変更し、再A/B。
