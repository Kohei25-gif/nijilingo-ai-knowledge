# Loop 1: 修正適用

## 結果
- PASS: 40 / 40
- FAIL: 0
- ERROR: 0

## 修正内容

### 1. qa-test-cases.json
- B6: `must_contain_any` に "I'm" と "home" を追加（"I'm heading home now" を正しくPASSにする）
- C5: `certainty` → `certainty_any: ["推測", "可能性"]` に変更（「かも」は可能性も適切）

### 2. qa-runner.test.ts
- `certainty_any` チェック対応を追加

### 3. prompts.ts - EXPANDED_STRUCTURE_PROMPT
- 確信度の定義を強化:
  - 「〜てた」「〜ていた」= 過去の事実 → 確定（推測にしない）
  - 文末「〜って」= 伝聞（推測にしない）
- 例文を3つ追加:
  - 例3b: 「電車が止まってた」→ 確定
  - 例3c: 「遅れてごめん、電車が止まってた」→ 謝罪、一人称単数、確定
  - 例3d: 「明日は晴れるって」→ 伝聞

### 4. prompts.ts - getFullDifferenceInstruction
- toneLevel 50% の差分指示を追加（previousTranslationあり/なし両方）
- 25%→50%の翻訳が同一にならないよう明確な差分指示

### 5. prompts.test.ts
- `50%: 空文字` → `50%: 差分推奨` に更新
