# Step 5.5 v2 プロンプト再設計（Round 1反映）

## 目的

Round 1（ケース101-120）のC判定結果を入力に、`/Users/takakikohei/NijiChat/src/services/prompts.ts` を例文依存から構造ルール依存へ再設計した。

## 固定制約（維持）

- アーキテクチャは維持: `extractStructure -> translateFull -> translatePartial -> reverse translation`
- 不変条件（entities / polarity / locked_terms / modality / question-statement / conditional / commitment）を維持
- 既存I/Oインターフェース（関数シグネチャ・戻り値）を変更しない
- モデル構成（Scout + gpt-4.1-nano）を変更しない

## Round 1で主要だった問題

1. `over_formal_overreach`（8/15 WARN）
2. `detail_loss` / `temporal_detail_drop` / `apology_drop`（補助情報の脱落）
3. `tone_gradient_flatten`（25-100の差分不足）
4. `certainty_flip`・`hearsay_marker_drop`（推測/伝聞の保持不安定）

## 再設計方針

1. 例文列挙を削減し、構造保持ルールを短く強く明示
2. certainty/subject/context markerを不変条件として昇格
3. 高トーン時の過剰儀礼化を禁止
4. tone levelの差分要件（低/中/高）を明文化

## 実装差分（prompts.ts）

### INVARIANT_RULES

- 7不変条件を中心に再構成
- 追加安全制約として以下を明示:
  - `subject/person consistency`
  - `certainty consistency`
  - `context_markers retention`

### PARTIAL_SYSTEM_PROMPT

- 「再翻訳禁止」「編集のみ」を先頭で明確化
- tone policyを0-24/25-49/50-74/75-99/100で段階化
- 「過剰儀礼で意図を変えるな」を明示

### EXPANDED_STRUCTURE_PROMPT

- 抽出対象を明示し、確信度を構造的に分類（確定/推測/可能性/伝聞/希望）
- 推測・可能性・伝聞を断定へ繰り上げない制約を追加
- 条件・modality保持を明示

### structureToPromptText

- 生成時ルールに certainty/person/condition保持を埋め込み
- 目的格と願望の保持規則を分離して明示

### getToneStyleInstruction / getFullDifferenceInstruction

- 高トーンの差分強制を維持しつつ、過剰儀礼化回避を追加
- tone gradient不足への対応として、75%以上で差分要件を明示

## 検証結果（再設計直後）

- `prompts.test.ts`: PASS (45/45)
- `guards.test.ts`: PASS (72/72)
- `npm run build`: PASS
- `qa-runner.test.ts`: 実行失敗（401 invalid OpenAI API key。コード不具合ではなく環境要因）

## 次アクション

- APIキー有効性を確認後、Round 2（121-140）をC判定で実行
- 同じ観点（構造保持/自然さ/トーン差）で再評価
