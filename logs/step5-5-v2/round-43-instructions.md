# Round 43 修正指示

## R42b判定結果サマリ（通常文 文171-175）

| 指標 | 結果 |
|------|------|
| PASS率 | 65%（39/60） |
| FAIL | 8件 |
| 致命的FAIL | 2件（意味変質: busy→crushed, busy→down） |
| pleasure_polarity_flip復活 | 1件（文172 polite_100%） |

---

## 修正内容（2箇所のみ）

### 修正1: fixedValueDeclaration に「動作の意味」を追加（src/groq.ts）

`translatePartial` 関数内の `fixedValueDeclaration` に7番目のフィールドを追加。

```typescript
// BEFORE（6フィールド）:
const fixedValueDeclaration = `
【以下の値は固定。変更禁止】
- 感情極性: ${structure.感情極性}
- 確信度: ${structure.確信度}
- エンティティ: ${structure.固有名詞.join(', ') || 'なし'}
- 条件マーカー: （原文の条件表現を維持）
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${structure.発話行為.join('+')}（← 全て出力に残すこと）
`;

// AFTER（7フィールド）:
const fixedValueDeclaration = `
【以下の値は固定。変更禁止】
- 感情極性: ${structure.感情極性}
- 確信度: ${structure.確信度}
- エンティティ: ${structure.固有名詞.join(', ') || 'なし'}
- 条件マーカー: （原文の条件表現を維持）
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${structure.発話行為.join('+')}（← 全て出力に残すこと）
- 動作の意味: ${structure.動作の意味}（← 述語の意味カテゴリ。この範囲を逸脱する動詞に変えない）
`;
```

同じ修正を `translateFull` の fixedValueDeclaration にも適用すること。

**これが防ぐもの:**
- 「忙しい」(busy) → "totally crushed"（crushed ≠ busy）
- 「忙しい」(busy) → "super down"（down ≠ busy）
- 「集中できた」(was able to focus) → "crushed it"（crushed it ≠ focus）

### 修正2: PARTIAL_SYSTEM_PROMPT の MEANING LOCK に1行追加（src/prompts.ts）

現在の MEANING LOCK セクション（#11の後）に #12 を追加:

```
12. No ceremonial framing: Do NOT wrap the message in emotional ceremony not present in the source (e.g., adding "It is with great pleasure..." or "I am delighted to..." when the source simply states a fact or opinion).
```

**これが防ぐもの:**
- 「この映画、思ったより面白かった」(感想) → "It is with great pleasure that I must say..."（感想→儀式的喜びの表明）

---

## 修正しないもの

- 構造解析プロンプト: R43ではまだ触らない（次のラウンドで程度抽出改善を予定）
- toneStyle: R42の自然さ改善を維持
- チェックリスト/Seedアンカー: commitment_weakening解消に効いている

---

## テスト

R43適用後、**文171-175を再テスト**（同じ通常文で比較）。

重点確認:
1. 文174 casual_75: "totally crushed" → busy系の動詞になっているか
2. 文174 casual_100: "super down" → busy系の動詞になっているか
3. 文172 polite_100: "It is with great pleasure..." → 感想形式が維持されているか
4. 退行チェック: 他の文のPASSが維持されているか

## 出力形式

`logs/step5-5-v2/round-43-outputs.json` に保存。フォーマットはR42と同一。
