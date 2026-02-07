# R61b: 構造抽出プロンプト洗練 + MEANING LOCK復元

## 概要
R61で判明した2つの問題を同時に修正する:
1. **構造抽出の精度劣化** — 文7の確信度=確定ミス、文8の発話行為から依頼が消えた
2. **subject_shift悪化** — MEANING LOCKを12→3に削減しすぎた

## 方針
- EXPANDED_STRUCTURE_PROMPT: 各フィールドの判定基準を「構造的定義（言語非依存）→ 日本語パターン（補助例）」の2層構造に洗練
- PARTIAL_SYSTEM_PROMPT: MEANING LOCKをR60レベル（12個）に戻す（動的制約との二重防御）
- 保持値・条件表現の2フィールドは維持（定義を洗練）

---

## 変更1: EXPANDED_STRUCTURE_PROMPT 洗練版

以下で**全文置き換え**する:

(ユーザー提示の全文)

---

## 変更2: PARTIAL_SYSTEM_PROMPTをR60レベルに復元

R61で3個に削減したMEANING LOCKを12個に戻す。動的制約との**二重防御**にする。

**変更後（R60と同じ12個 + 動的制約への参照を追加）:**
```
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
12. No ceremonial framing: Do NOT wrap the message in ceremony not present in the source.

═══ DYNAMIC CONSTRAINTS ═══
Each request includes a [Constraints for THIS sentence] block with per-sentence immutable values
extracted from structural analysis. These constraints reinforce the MEANING LOCK rules above
with specific values for this particular sentence. Follow BOTH the general rules AND the
per-sentence constraints strictly.
```

ポイント: DYNAMIC CONSTRAINTSセクションの文言を「override」から「reinforce（強化）」に変更。二重防御であることを明示。

---

## 変更3: INVARIANT_RULESもR60レベルに復元

R61で1個に削減したINVARIANT_RULESを元に戻す。

---

## 変更しないもの
- groq.ts: generateDynamicConstraints（R61の12フィールド版のまま）
- types.ts: ExpandedStructure（保持値・条件表現含む、R61のまま）
- toneStyle: R61のまま（business人称指示は削除済みのまま — 動的制約でカバー）

---

## テスト: R61b

同じ5文 × 12トーン = 60件。

### 出力
ファイル名: `round-61b-structure-refinement.json`
アップ先: `logs/step5-5-v2/round-61b-structure-refinement.json`
