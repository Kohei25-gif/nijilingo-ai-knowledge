# Round 42 修正指示（こでくん用）（保存しといて）

## 目的
stance_strength_amplification（FAIL全体の60%以上）と commitment_weakening を解消するためのプロンプト改善。
複数AIの分析結果から、**言語非依存かつ効果の高い修正**のみを厳選して実施する。

## 背景
- R41: 87% PASS（文161-165）
- 最大の残存問題: stance_strength_amplification（casual/polite 75-100%で程度が増幅）
  - 例: 「割と集中できた」(moderate) → "totally crushed it" (extreme)
- 二次問題: commitment_weakening（文165 casual50-100%で意志が弱体化）
  - 例: 「私が対応する」→ "I might respond"
- 根本原因分析:
  1. toneStyleに "mild intensifiers" の文言があり、モデルが強調語で盛る
  2. PARTIAL_SYSTEM_PROMPTに Style/Semantic の分離宣言がない
  3. Seedが「意味」だけのアンカーで「程度・確信度・コミットメント」のアンカーになっていない
  4. fixedValueDeclaration に 程度・発話行為 が含まれていない（R41バグ）
  5. extractStructure の validated に 程度・発話行為 が含まれていない（R41バグ）
  6. EXPANDED_STRUCTURE_PROMPT に条件節の確信度ルールがない

---

## 変更対象ファイル
- `src/prompts.ts`（PARTIAL_SYSTEM_PROMPT, EXPANDED_STRUCTURE_PROMPT, structureToPromptText内の固定値宣言）
- `src/groq.ts`（translatePartial内のtoneStyle, fixedValueDeclaration, driftPrevention, extractStructure, userPrompt末尾）
- `src/types.ts`（ExpandedStructure型に程度・発話行為がなければ追加）

---

## 修正1: extractStructure の validated に 程度・発話行為 を追加（バグ修正）

### ファイル: `src/types.ts`

ExpandedStructure 型に以下のフィールドがなければ追加:
```typescript
程度?: 'none' | 'slight' | 'moderate' | 'strong' | 'extreme';
発話行為?: string[];
```

### ファイル: `src/groq.ts`

extractStructure 関数内の `validated` オブジェクト構築部分を修正。
現在:
```typescript
const validated: ExpandedStructure = {
  主題: parsed.主題 || 'なし',
  動作: parsed.動作 || 'なし',
  動作の意味: parsed.動作の意味 || 'なし',
  意図: intent,
  感情極性: polarity,
  モダリティ: modality,
  主語: parsed.主語 || '省略',
  対象: parsed.対象 || 'なし',
  目的格: parsed.目的格 || 'なし',
  願望: parsed.願望 || 'なし',
  人称: parsed.人称 || '一人称単数',
  確信度: parsed.確信度 || '確定',
  固有名詞: validatedEntities
};
```

修正後（2行追加）:
```typescript
const validated: ExpandedStructure = {
  主題: parsed.主題 || 'なし',
  動作: parsed.動作 || 'なし',
  動作の意味: parsed.動作の意味 || 'なし',
  意図: intent,
  感情極性: polarity,
  モダリティ: modality,
  主語: parsed.主語 || '省略',
  対象: parsed.対象 || 'なし',
  目的格: parsed.目的格 || 'なし',
  願望: parsed.願望 || 'なし',
  人称: parsed.人称 || '一人称単数',
  確信度: parsed.確信度 || '確定',
  程度: parsed.程度 || 'none',
  発話行為: Array.isArray(parsed.発話行為) ? parsed.発話行為 : [],
  固有名詞: validatedEntities
};
```

---

## 修正2: PARTIAL_SYSTEM_PROMPT を差し替え

### ファイル: `src/prompts.ts`

既存の `export const PARTIAL_SYSTEM_PROMPT` を以下に**全文置換**:

```typescript
export const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo's tone editor in PARTIAL mode.
Edit current_translation to match the requested tone level. Do NOT translate from scratch.

CORE PRINCIPLE (non-negotiable):
- Style Strength (tone%) and Semantic Strength (degree_level) are TWO INDEPENDENT axes.
- Raising tone changes ONLY surface style (vocabulary formality, contractions, politeness markers, sentence structure).
- Raising tone must NEVER raise semantic intensity, certainty, or commitment strength.

═══ MEANING LOCK (never change) ═══
1. Entities: numbers, dates, times, amounts, proper nouns
2. Polarity: positive ↔ negative never flips
3. Subject: never change (1st person singular ≠ 1st person plural)
4. Intent & modality class: request/report/gratitude/suggestion stays the same
5. Question/statement type preserved
6. Condition markers (if/unless/when) preserved — never drop them
7. Commitment lock: do NOT weaken or strengthen commitments/promises/offers. Keep the same commitment class as Seed(0%).
8. Predicate meaning lock: keep the core action meaning from structure.動作の意味. Do not swap into a different achievement/evaluation verb.
9. Degree lock: keep intensity at the level specified in structure.程度. Do NOT escalate beyond Seed(0%).
10. Speech acts lock: ALL acts listed in structure.発話行為 must appear in output.
11. No extra facts: do not add new reasons, excuses, evaluations, or details not present in Seed(0%).

═══ DYNAMIC CONSTRAINTS ═══
Each request includes immutable values:
- 意図 (intent): stays fixed
- 確信度 (certainty): stays fixed
- 感情極性 (sentiment): stays fixed
- モダリティ (modality): stays fixed
- 程度 (degree_level): stays fixed — this is semantic intensity, NOT tone
- 発話行為 (speech_acts): all must remain in output

═══ TONE = SURFACE STYLE ONLY ═══
OK to change: vocabulary formality, politeness markers, contractions, discourse markers, sentence structure, word choice within SAME meaning+strength.
NOT OK: meaning, intent, certainty, sentiment, degree/intensity, commitment strength.

═══ OUTPUT ═══
JSON only, no markdown: {"new_translation":"...","reverse_translation":"...(source lang)","risk":"low|med|high"}`;
```

### 変更点まとめ
- **追加**: CORE PRINCIPLE（Style/Semantic分離宣言）を冒頭に配置
- **追加**: #7 Commitment lock（弱体化も強化も禁止、Seedと同じクラスを維持）
- **追加**: #8 Predicate meaning lock（動作の意味を別の達成/評価動詞に変えない）
- **変更**: #9 Degree lock に「Do NOT escalate beyond Seed(0%)」を追加
- **追加**: #11 No extra facts（Seedにない理由・言い訳・評価の追加禁止）
- **削除**: 旧Tone Level Guide（0-24%, 25-49%...の説明 → userPrompt側で既に指示済みのため重複削除）
- **削除**: 旧Allowed/Forbidden edits リスト → TONE = SURFACE STYLE ONLY に統合

---

## 修正3: translatePartial の toneStyle 文言修正

### ファイル: `src/groq.ts`

translatePartial 関数内の toneStyle 生成部分を修正。

#### casual の修正

現在:
```typescript
case 'casual':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum casual (slang OK, gonna/wanna/gotta, very friendly; keep meaning exact)';
  } else if (toneLevel >= 75) {
    toneStyle = 'strong casual (more contractions, a bit more playful; add mild intensifiers like "really/so", allow "kinda", "lol/haha")';
  } else if (toneLevel >= 50) {
    toneStyle = 'standard casual (use contractions like "I\'ll", "it\'s"; friendly phrasing; light intensifiers)';
  } else {
    toneStyle = 'slightly casual (use basic contractions like "it\'s", "that\'s"; keep relatively neutral)';
  }
  break;
```

修正後:
```typescript
case 'casual':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum casual (heavy slang, gonna/wanna/gotta, very friendly phrasing. Surface style only — do NOT add stronger degree words.)';
  } else if (toneLevel >= 75) {
    toneStyle = 'Strong casual (more contractions, playful phrasing, relaxed tone. Surface style only — do NOT add stronger degree words.)';
  } else if (toneLevel >= 50) {
    toneStyle = 'Standard casual (contractions, friendly phrasing. Surface style only — do NOT add stronger degree words.)';
  } else {
    toneStyle = 'Slightly casual (basic contractions, relaxed but clear.)';
  }
  break;
```

#### business の修正

現在:
```typescript
case 'business':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum business (very polite, no contractions, highly professional; avoid slang)';
  } else if (toneLevel >= 75) {
    toneStyle = 'strong business (more deference: "Could you kindly...", "I would be grateful if..."; still concise)';
  } else if (toneLevel >= 50) {
    toneStyle = 'standard business (use "I would suggest...", "Please note that...", avoid contractions)';
  } else {
    toneStyle = 'slightly business (polite tone, minimal contractions, but not overly formal)';
  }
  break;
```

修正後:
```typescript
case 'business':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum business (highest formality, no contractions, highly professional phrasing. Surface style only — do NOT add stronger degree words.)';
  } else if (toneLevel >= 75) {
    toneStyle = 'Strong business (formal, deferential phrasing, no contractions. Surface style only — do NOT add stronger degree words.)';
  } else if (toneLevel >= 50) {
    toneStyle = 'Standard business (professional phrasing, avoid contractions. Surface style only — do NOT add stronger degree words.)';
  } else {
    toneStyle = 'Slightly business (polite tone, minimal contractions.)';
  }
  break;
```

#### formal の修正

現在:
```typescript
case 'formal':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum formal (highest politeness, honorifics, humble expressions)';
  } else if (toneLevel >= 50) {
    toneStyle = 'standard formal (use "I would be most pleased...", "It is with great pleasure...", highest politeness)';
  } else {
    toneStyle = 'slightly formal (polite and respectful, use "indeed", "certainly", but not maximally formal)';
  }
  break;
```

修正後:
```typescript
case 'formal':
  if (toneLevel >= 100) {
    toneStyle = 'Maximum formal (highest politeness, honorifics, humble expressions. Surface style only — do NOT add stronger degree words.)';
  } else if (toneLevel >= 50) {
    toneStyle = 'Standard formal (elevated politeness, respectful phrasing. Surface style only — do NOT add stronger degree words.)';
  } else {
    toneStyle = 'Slightly formal (polite and respectful, but not maximally formal.)';
  }
  break;
```

### 変更点まとめ
- **削除**: "mild intensifiers like really/so"、"light intensifiers"、"add mild intensifiers"
- **削除**: business 75%の "I would be grateful if..."（意図を依頼に変える誘発表現）
- **削除**: formal 50%の "I would be most pleased...", "It is with great pleasure..."（polarity flipの誘発表現）
- **追加**: 全75%以上に "Surface style only — do NOT add stronger degree words." を付与

---

## 修正4: fixedValueDeclaration に 程度・発話行為 を追加

### ファイル: `src/groq.ts`

translatePartial 関数内の fixedValueDeclaration を修正。

現在:
```typescript
const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記4つの値が変わる翻訳は不合格。
` : '';
```

修正後:
```typescript
const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}（← 全て出力に残すこと）
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記6つの値が変わる翻訳は不合格。
` : '';
```

---

## 修正5: driftPrevention を Seed アンカーに強化

### ファイル: `src/groq.ts`

translatePartial 関数内の driftPrevention を修正。

現在:
```typescript
const driftPrevention = `
【ドリフト防止】
元の翻訳（0%）: "${seedTranslation}"
この意味を維持したまま口調のみ変更すること。
意味・意図・確信度が元の翻訳からズレていたら修正すること。
`;
```

修正後:
```typescript
const driftPrevention = `
【Seed（0%）= 意味・程度・確信度・コミットメントのアンカー】
Seed: "${seedTranslation}"
- Seedの意味を維持したまま口調のみ変更すること
- Seedより程度を強めない（Seedが"pretty"なら"totally"にしない）
- Seedより確信度を変えない（Seedが"will"なら"might"にしない）
- Seedより約束/意志を弱めない・強めない
- 意味・意図・確信度がSeedからズレていたら修正すること
`;
```

---

## 修正6: userPrompt 末尾にチェックリスト追加

### ファイル: `src/groq.ts`

translatePartial 関数内の userPrompt 末尾（`Edit the current_translation to match the tone level ${toneLevel}%. Return JSON only.` の直前）に以下を追加:

```typescript
const finalChecklist = `
【FINAL CHECK（出力前に必ず確認）】
□ 程度（degree）: Seedと同じ強さか？強調語を追加していないか？
□ 確信度: Seedと同じモーダル動詞か？（will→might に変えていないか？）
□ コミットメント: 約束・意志表明の強さがSeedと同じか？
□ 発話行為: 構造情報の全発話行為が出力に含まれているか？
□ 条件節: 原文の条件表現（if/when等）が残っているか？
□ 追加事実: Seedにない理由・言い訳・評価を追加していないか？
`;
```

そしてuserPromptの末尾を:
```typescript
${finalChecklist}
Edit the current_translation to match the tone level ${toneLevel}%. Return JSON only.`;
```

に変更。

---

## 修正7: EXPANDED_STRUCTURE_PROMPT に確信度・発話行為の判定ルール追加

### ファイル: `src/prompts.ts`

EXPANDED_STRUCTURE_PROMPT の `12. 確信度` セクションの末尾（例3dの後あたり）に以下を追加:

```
★ 重要: 条件節は確信度を下げない
- 「もし〜なら」「〜たら」「必要なら」「if needed」は条件表現であり、不確実性マーカーではない
- 確信度は主節の動詞で判定する（条件節の「もし」で「推測」にしない）
- 例: 「もし必要なら、私が対応する」→ 確信度=確定（条件付きの確約・申し出）
- 例: 「もし必要なら、対応するかも」→ 確信度=可能性（「かも」が不確実マーカー）
```

同じくEXPANDED_STRUCTURE_PROMPTの `15. 発話行為` セクションの末尾に以下を追加:

```
★ 重要: 複合発話の判定
- 文に複数の発話行為がある場合、全てを配列に含める（1つだけにしない）
- 例: 「ごめん、今は対応できない」→ ["謝罪", "報告"]（「ごめん」=謝罪 + 「対応できない」=報告）
- 例: 「悪いけど、これ急ぎでお願い」→ ["謝罪", "依頼"]
- 例: 「ありがとう、助かった」→ ["感謝", "報告"]
```

同じくEXPANDED_STRUCTURE_PROMPTの `4. 意図` セクションの末尾に以下を追加:

```
★ 重要: 意図の判定は主文の行為で決める
- 「教えて」「お願い」「〜してほしい」「〜してくれる？」がある → 意図=依頼, モダリティ=依頼
- 「〜だった」「〜している」「〜になった」（事実陳述）→ 意図=報告, モダリティ=報告
- 複合文は最後の主文の意図を採用（「結論だけ教えて」→ 意図=依頼）
```

---

## 修正8: translateFull 側の fixedValueDeclaration にも 程度・発話行為 を追加

### ファイル: `src/groq.ts`

translateFull 関数内にも同じ fixedValueDeclaration のパターンがある。こちらも修正4と同様に程度・発話行為を追加:

現在:
```typescript
const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記4つの値が変わる翻訳は不合格。
` : '';
```

修正後:
```typescript
const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}（← 全て出力に残すこと）
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記6つの値が変わる翻訳は不合格。
` : '';
```

---

## テスト計画

文166-170で以下を確認:
1. stance_strength_amplification: casual/polite 75-100%で程度が増幅しないこと
2. commitment_weakening: 条件付き意志表明が弱体化しないこと
3. apology_drop: 引き続きゼロであること（退行チェック）
4. gratitude_to_request_flip, certainty_flip: 引き続きゼロであること（退行チェック）

## 判定基準
- PASS: 意味・程度・確信度・発話行為が全て保持されている
- WARN: 軽微な語彙の揺れはあるが意味は保持
- FAIL: 程度増幅、確信度変化、発話行為欠落、意図変質のいずれか

---

## 変更の根拠（採用/不採用の判断）

### 採用した提案（言語非依存）
| # | 提案 | 出典 | 理由 |
|---|------|------|------|
| 1 | Style/Semantic分離宣言 | 君ちゃん+チャッピー共通 | 両者が推奨。冒頭に置くことでモデルの理解を根本から変える |
| 2 | Seedアンカー強化 | 君ちゃん+チャッピー共通 | 程度・確信度・コミットメント全てのアンカーにする |
| 3 | Commitment lock | チャッピー | commitment_weakeningへの直接対策 |
| 4 | Predicate meaning lock | チャッピー | "集中できた"→"crushed it"（動詞の意味変質）防止 |
| 5 | No extra facts | チャッピー | Seedにない理由追加の防止 |
| 6 | toneStyle intensifiers削除 | 君ちゃん+チャッピー共通 | "mild intensifiers"が増幅の直接原因 |
| 7 | 末尾チェックリスト | 君ちゃん+チャッピー共通 | recency biasを活用 |
| 8 | 条件節の確信度ルール | 君ちゃん+チャッピー共通 | 文165の根本原因 |

### 採用しなかった提案
| 提案 | 理由 |
|------|------|
| 英語禁止語リスト（totally/absolutely...） | 英語特化。10言語設計に違反 |
| INTENSITY LOCK英語例文表 | R37で削除した英語フレーズ例の復活。言語非依存原則に違反 |
| few-shot例の追加 | 英語例を入れると10言語設計が崩れる |
| temperature 0.3→0.1 | バリエーション減少リスク。要別途検証 |
| トーン%→離散ラベル変更 | コード変更が大きい。今やる必要なし |
| MEANING LOCKとDYNAMIC CONSTRAINTS統合 | R37で93%出てる構造を壊すリスク |
| 正規表現ポスト処理ガード | 良いアイデアだが今回はプロンプト改善に集中 |
