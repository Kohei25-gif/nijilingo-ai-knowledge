# R58: toneStyle最適化 + subject_shift対策

## 目的
Maverick切り替え後に見つかった2つの課題をプロンプトレベルで修正する。
- hyper_formality: polite/business 100%で法律文書レベルの語彙が出る（perforce, hereby, wherein等）
- subject_shift: 一人称単数の発言がWe/Let'sに変わる

## 方針
- 英語例を全廃し、言語非依存の「場面ベース」定義に切り替え
- 禁止表現は使わない（R38教訓: 明示的禁止は逆効果）
- 全て肯定的指示（「〜の文体で書く」「〜を使う」）
- ロールバック可能にするため、変更前のコードも記載

## 変更1: toneStyle定義の書き換え
- ファイル: groq.ts
- 場所: let toneStyle = ''; から始まるswitch文
- casual/business/formalを場面定義へ変更
- customは変更なし

## 変更2: INVARIANT_RULES に人称保持ルール追加
- ファイル: prompts.ts（定義実体）
- 8の後に9としてsubject_personを追加

## テスト
対象5文（文2, 文5, 文7, 文8, 文9）を12トーンで実行
- extractStructure → translateFull(seed) → translatePartial
- 出力: logs/step5-5-v2/round-58-tonestyle-optimization.json
