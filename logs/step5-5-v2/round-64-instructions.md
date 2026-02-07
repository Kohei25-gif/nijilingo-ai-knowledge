# R64: prompts.ts リファクタリング（重複削除・哲学準拠化）

## 目的
動作を変えずにプロンプトを整理する。ダメなら即 `981221f` に戻す。

## 原則
- ルールは1箇所だけに書く（Single Source of Truth）
- 英語ハードコードの禁止パターンを削除（哲学違反）
- 重複関数を統合
- 例文の重複注釈を削減
- **意味を変える修正は一切しない**

---

## 変更1: structureToPromptText から英語禁止パターンを全削除

**削除対象:** `【英語出力の禁止パターン（target=enのみ）】` セクション全体

```
【英語出力の禁止パターン（target=enのみ）】
- 感情極性が negative / neutral の場合:
  "pleasure", "delight", "honored", "It is with great" を禁止
...（このセクション全部）
```

**理由:** 
- R38/R63で禁止リストは逆効果と2回証明済み
- 10言語対応なのに英語だけハードコード = 哲学違反
- pleasure は構造的防御（MEANING LOCK #12 No ceremonial framing + 感情極性ルール）で既に0件を6ラウンド維持

---

## 変更2: 重複ルールの統合

### 人称ルール
**残す場所:** PARTIAL_SYSTEM_PROMPT の MEANING LOCK #3 のみ
**削除対象:** structureToPromptText 内の以下セクション

```
【人称ルール - 絶対遵守】
人称は翻訳で必ず保持する。勝手に変更しない:
- 一人称単数 → I を使う（絶対に We に変えない）
...（このセクション全部）
```

**代わりに1行だけ残す:**
```
- 人称: 構造情報の人称を厳守（MEANING LOCK #3参照）
```

### 確信度ルール
**残す場所:** structureToPromptText 内の `【確信度の制約】` セクション（これは簡潔で良い）
**削除対象:** structureToPromptText 内の以下2セクション

```
【重要】確信度「確定」の場合、以下の表現は一切使用禁止:
- I think / I guess / I suppose
...（このセクション全部）

【重要】確信度「伝聞」と「推測」の違い:
- 伝聞（らしい/そうだ/って）= 誰かから聞いた → I heard / apparently
...（このセクション全部）
```

**理由:** EXPANDED_STRUCTURE_PROMPT の確信度定義（項目12）で既に詳しく定義済み。翻訳指示で再説明は冗長。

### 目的格・願望ルール
**残す場所:** PARTIAL_SYSTEM_PROMPT の MEANING LOCK #8（predicate meaning lock）で動作の意味保持はカバー済み
**削除対象:** structureToPromptText 内の以下2セクション

```
【目的格ルール - 重要】
目的格（「〜を」がついている単語）は必ず目的語(object)として翻訳する:
...（このセクション全部）

【願望ルール - 重要】
願望が「あり」の場合、翻訳・逆翻訳で必ず願望表現を保持する:
...（このセクション全部）
```

**代わりに構造情報テキスト内に1行ずつ:**
```
- 目的格: 構造情報の目的格を目的語として保持
- 願望: 構造情報の願望を保持（「あり」なら want to / ~したい を維持）
```

### 主語省略ルール
**削除対象:** structureToPromptText 内の以下セクション

```
【主語省略ルール - 重要】
主語が「省略」の場合、意図で判断して主語を決定:
...（このセクション全部）
```

**理由:** EXPANDED_STRUCTURE_PROMPT の人称定義（項目11）で「主語省略でも文脈から人称を判断する」と既に指示済み。構造データに人称が入っているので、翻訳時に再判断は不要。

---

## 変更3: EXPANDED_STRUCTURE_PROMPT の例文注釈を削減

現在: 例1〜例5の各例文に「※ 人称を変えない」「※ 願望を消さない」等の注釈が大量にある

**変更:** 各例文の※注釈を最大2個に削減。その例文固有のポイントだけ残す。

### 例1（ごんた）
```
現在:
※ 主語省略 + 意図「報告」+ 人称「一人称単数」→ 翻訳時にIを使う
※ 敬称なし → 身内（子ども等）→ 尊敬語不要
※ ❌ 人称を変えない（I → We は禁止）

変更後:
※ 主語省略だが人称「一人称単数」→ I を使う
※ 敬称なし → 身内 → 尊敬語不要
```

### 例3c（遅れてごめん）
```
現在:
※ 複文の場合、主文の主語・意図を優先（「遅れてごめん」が主文→主語は話者→一人称単数）
※ 「〜てた」= 過去の事実 → 確信度は「確定」

変更後（そのまま。これは例固有のポイントなので維持）
```

### 例5（君を抱いていたい）
```
現在:
※ 目的格「君」→ 翻訳時に「君」は目的語
※ 願望「あり」→ "want to" を入れる（I want to hold you）
※ 人称「一人称単数」→ I を使う（We に変えない）
※ ❌ 主語と目的語を入れ替えない（you wanna hold me は禁止）
※ ❌ 願望を消さない（「抱きたい」→「抱いてる」は禁止）
※ ❌ 人称を変えない（I → We は禁止）

変更後:
※ 目的格「君」→ you は目的語（主語と入れ替えない）
※ 願望「あり」→ want to を保持（消さない）
```

---

## 変更4: getToneStyleInstruction と getToneInstruction の統合

現在2つの関数がほぼ同じ役割:
- `getToneStyleInstruction`: FULL翻訳用（英語例文つき、長い）
- `getToneInstruction`: PARTIAL翻訳用（短い）

**統合方針:** `getToneInstruction` に統一。`getToneStyleInstruction` を削除。

**理由:** 
- FULL翻訳もPARTIAL翻訳も、トーンの指示内容は同じであるべき
- 2つあると片方だけ修正して不整合が起きるリスク
- getToneStyleInstruction内の英語例文（"I would be most grateful if..."等）は哲学違反で不要

**注意:** groq.tsで`getToneStyleInstruction`を呼んでいる箇所を`getToneInstruction`に差し替えること。

---

## 変更しないもの
- PARTIAL_SYSTEM_PROMPT（MEANING LOCK 12個 + DYNAMIC CONSTRAINTS）— これが防御の本体
- EXPANDED_STRUCTURE_PROMPT の構造的定義（項目1〜15の定義文）— 分析の本体
- EXPANDED_STRUCTURE_PROMPT の日本語パターン補助 — 哲学準拠の補助
- getLanguageSpecificRules — 言語別の人名・敬称ルール
- JAPANESE_EDIT_SYSTEM_PROMPT — 日本語編集モード
- getReverseTranslationInstruction — 逆翻訳指示
- カスタムトーン4種（オジサン構文、限界オタク、赤ちゃん言葉、ギャル）

---

## 削減見込み

| セクション | 現在 | 削減後 | 削減 |
|-----------|------|--------|------|
| structureToPromptText 禁止パターン | ~40行 | 0行 | -40行 |
| structureToPromptText 重複ルール | ~50行 | ~5行 | -45行 |
| EXPANDED_STRUCTURE_PROMPT 例文注釈 | ~25行 | ~10行 | -15行 |
| getToneStyleInstruction | ~80行 | 0行（統合） | -80行 |
| **合計** | | | **約-180行** |

600行 → 約420行（30%削減）

---

## テスト: R64

同じ10文 × 12トーン = 120件

### 最重要チェック: リグレッションなし
- pleasure: 0件維持
- G1 発話行為: ["謝罪","報告"] 維持
- N3 確信度: 伝聞 維持
- E1 business 100%: 意味保持（hold/embrace系）
- subject_shift: R63bと同等以下

### 合格基準
- R63bと同等（119/120以上）ならリファクタリング採用
- 1件でも新しいFAILが増えたら即戻し（`981221f`）

### 出力
- ファイル名: `round-64-refactor.json`
- アップ先: `logs/step5-5-v2/round-64-refactor.json`
