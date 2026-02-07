# Round 45 修正指示

## R44判定結果サマリ（安定性テスト 文176-180）

| 指標 | 結果 |
|------|------|
| PASS率(WARN含む) | 85%（51/60） |
| FAIL | 9件 |
| うち程度抽出欠陥 | **7件**（文176「ちょっと」→程度=none） |
| ceremonial_framing | 1件（文177 polite_100） |
| predicate_meaning_shift | 1件（文180 business_100） |

---

## 根本原因

### 最大の問題: 構造解析が「ちょっと」を程度=noneで返す

文176「それはちょっとリスク高い。」で構造解析が程度=noneを出力。
fixedValueDeclarationに程度制約がないため、モデルが "considerable" "significant" "extremely" と自由に増幅。
→ 7/9件のFAILはこの1点が原因。

### 副次的問題: MEANING LOCK #12の範囲不足

R43で追加した #12 は "pleasure/gratitude framing" を例示したが、
文177 polite_100 で "It is with utmost formality that I must inform you that..." という
**formality型の儀式化**が発生。例示の範囲を広げる必要あり。

---

## 修正内容（2箇所）

### 修正1: EXPANDED_STRUCTURE_PROMPT の程度セクション強化（src/prompts.ts）

`EXPANDED_STRUCTURE_PROMPT` 内の程度（degree）に関する説明部分を探し、以下のルールを**追加**する（既存の内容は削除しない）:

```
■ 程度（degree）判定の必須ルール:

以下の副詞・表現が文中にある場合、程度を "none" にしてはならない:

slight: 「ちょっと」「少し」「やや」「多少」「若干」
moderate: 「割と」「結構」「かなり」「相当」「なかなか」
strong: 「めっちゃ」「すごく」「とても」「非常に」「本当に」
extreme: 「超」「マジで」「ありえないほど」

否定緩和も程度として扱う:
- 「あんまり〜ない」「そんなに〜ない」→ moderate
- 「ちょっと〜ない」→ slight
- 「全然〜ない」→ strong

重要: 程度副詞が存在する文で程度="none" を返すのは誤りである。
```

**目的**: 「ちょっとリスク高い」→ 程度=slight で抽出。fixedValueDeclarationに `程度: slight（← ...この値を超える強調は禁止）` が入ることで、"considerable" "significant" "extremely" への増幅を構造的に防ぐ。

### 修正2: MEANING LOCK #12 の範囲拡大（src/prompts.ts）

現在の #12 を以下に**差し替え**:

```
BEFORE:
12. No ceremonial framing: Do NOT wrap the message in emotional ceremony not present in the source (e.g., adding "It is with great pleasure..." or "I am delighted to..." when the source simply states a fact or opinion).

AFTER:
12. No ceremonial framing: Do NOT wrap the message in ceremony not present in the source. This includes emotional ceremony ("It is with great pleasure..."), formality ceremony ("It is with utmost formality that I must inform you..."), and any preamble that inflates a simple statement into an announcement.
```

**目的**: pleasure型だけでなくformality型の儀式化もブロック。

---

## 修正しないもの

- fixedValueDeclaration: R43の動作の意味フィールドは機能している。追加なし
- toneStyle: 変更なし
- チェックリスト/Seedアンカー: 変更なし

---

## テスト

R45適用後、**文176-180を再テスト**（同じ文で修正効果を確認）。

重点確認:
1. **文176**: 構造解析で程度=slight が返るか。全トーンで "considerable"/"significant"/"extremely" が消えているか
2. **文177 polite_100**: "It is with utmost formality..." が消えているか
3. **退行チェック**: 他の文のPASSが維持されているか

## 出力形式

`logs/step5-5-v2/round-45-outputs.json` に保存。フォーマットはR44と同一。
