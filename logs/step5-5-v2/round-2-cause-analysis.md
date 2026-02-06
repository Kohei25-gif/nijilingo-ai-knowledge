# Step 5.5 v2 Round 2 悪化原因分析（旧プロンプト比較）

## 結論（先に）

Round 2で `over_formal_overreach` が増えた主因は、**再設計で PARTIAL プロンプトの強い抑制文を削ったこと**。

特に、旧プロンプトにあった以下の「強制ガード」が新プロンプトで弱くなり、
`translatePartial` 側の強い丁寧化スタイル指示（business/formal 75-100%）を抑えきれなくなった。

## Round 2で観測した症状

- over_formal_overreach: 12件（Round 1比 +4）
- 意味反転FAILの増加（Round 1:2件 -> Round 2:4件）
  - 感謝文 -> 依頼文
  - 自己行為報告 -> 相手への依頼
  - 控えめ推量 -> 断定/強要

## 旧プロンプト（Round 1時点）から削れて悪化に効いた点

1. `PARTIAL_SYSTEM_PROMPT` の明示禁止が弱化
- 旧: `Forbidden: Overly formal honorifics not used in daily conversation`
- 旧: `Allowed edits (surface-level only)`
- 旧: `Forbidden edits: Any change that alters meaning`
- 旧: `If risk=high, output unchanged`

これらは「どこまで言い換えて良いか」の上限を明確に縛っていた。
再設計版では簡潔化したが、モデルには上限が弱く伝わり、儀礼的な増幅が通りやすくなった。

2. モダリティ固定の強調低下
- 旧: `modality_class` を例付きで強く固定（依頼を確認に変えない等）
- 新: 概念はあるが、例付きの強い禁止が減少

結果として、報告/感謝が依頼へ寄る drift が増えた。

3. 具体的な「意味保持チェック」の削減
- 旧: 意味保持・創作禁止を明示
- 新: concise化で抽象度が上がり、`difference` 指示と衝突時に意味を崩しやすい

## 追加で見えた構造的な原因（プロンプト外）

`translatePartial` の toneStyle（`src/services/groq.ts`）が 75/100 で
「Could you kindly... / I would be grateful...」等を直接誘導している。

- 旧Round 1では、上記を旧PARTIALガードが一部抑制していた
- 再設計後は抑制が弱まり、誘導文がそのまま過剰儀礼化に転化

つまり、悪化は「単一要因」ではなく、
**(A) PARTIAL抑制弱化** × **(B) toneStyle誘導の強さ** の掛け算で起きている。

## 今回入れた最小修正（1箇所）

- `src/services/prompts.ts` の `PARTIAL_SYSTEM_PROMPT` に Safety rails を追加
  - 儀礼表現禁止
  - actor/target lock
  - modality lock
  - certainty lock
  - 破れそうなら unchanged + risk=high

## Round 3での結果（1箇所修正後）

- 対象: 141-150（10件）
- PASS 0 / WARN 6 / FAIL 4
- over_formal_overreach: 10/10（100%）

=> `PARTIAL_SYSTEM_PROMPT` 単独修正だけでは不十分。

## 次の1箇所修正候補（推奨）

`src/services/groq.ts` の `translatePartial` 内 `toneStyle` 文言のみを調整する。

狙い:
- business/formal 75/100 の依頼テンプレ誘導（Could you kindly / I would be grateful）を除去
- 「丁寧化は語調のみ、モダリティ変更禁止」を toneStyle 側でも明示

この1箇所で、過剰儀礼化と意味反転の両方に効く見込みが高い。
