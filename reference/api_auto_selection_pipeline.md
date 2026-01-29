# NijiLingo API自動選定パイプライン

**作成日:** 2026-01-29
**ステータス:** 構想段階

## 概要

翻訳アプリ「NijiLingo」で使用するLLM APIを、**コストと品質のバランス**で自動選定するパイプラインを構築する。

人間が手動でテストするのではなく、**AIが自動でテスト→修正→再テストをループ**し、最適なAPIとプロンプトを決定する。

---

## 全体フロー

```
Phase 0: プロンプト設計ルールの準備（済）
    ↓
事前準備: API速度ランキング作成
    ↓
Phase 1: 翻訳問題パターンの生成
    ↓
Phase 2: バグ収集（全APIでテスト）
    ↓
Phase 3: バグ修正ループ（安い順にAPI選定）
    ↓
Phase 4: トーン差検証
    ↓
完成: 最適なAPI + 最適なプロンプト
```

---

## Phase 0: プロンプト設計ルール（済）

論文ベースで「AIがプロンプトを修正する時のルール」を事前に用意。

- Few-shot例の入れ方
- 否定形より肯定形で指示
- ロールの明確化
- 出力形式の指定方法

**これにより、Phase 3のループで「適当な修正」ではなく「論文ベースの修正」が行われる。**

---

## 事前準備: API速度ランキング

目的: 正確性の前に、まず速度だけで順位をつける。

```javascript
// 各APIに同じ文を投げて速度計測
const testText = "昨日友達と美味しいラーメン食べた";
const apis = ["groq-8b", "groq-70b", "gpt-4.1-nano"];

for (const api of apis) {
  const start = Date.now();
  await translate(testText, api);
  const elapsed = Date.now() - start;
  console.log(`${api}: ${elapsed}ms`);
}
```

出力例:

```
1位: groq-8b      89ms   $0.05/$0.08
2位: groq-70b    156ms   $0.59/$0.79
3位: gpt-4.1-nano 387ms  $0.10/$0.40
```

---

## Phase 1: 翻訳問題パターンの生成

目的: AIが翻訳で間違えやすいパターンを洗い出し、テスト用例文を作成。

### 洗い出す問題カテゴリ

**日本語→英語:**
- 主語省略（日本語に主語がないのに英語で追加）
- 過剰な丁寧表現（casualなのにpleaseを入れる）
- 直訳すぎる（「〜と思う」→ 毎回 "I think"）
- ニュアンス消失（「ちょっと」「なんか」が消える）
- 時制の過剰明示

**英語→日本語:**
- 主語の過剰翻訳（Iを毎回「私は」と訳す）
- 敬語レベルのズレ
- 二重語尾（「〜ですねね。」）
- カタカナ過剰
- 不自然な語順

### 出力形式

```json
{
  "problems": [
    {
      "id": "P001",
      "category": "主語省略",
      "description": "日本語は主語を省略するが、英訳時に不要な主語を追加してしまう",
      "direction": "ja→en",
      "examples": [
        {
          "input": "昨日買った",
          "bad_output": "I bought it yesterday",
          "good_output": "Bought it yesterday",
          "check_regex": "^(I|We|He|She|It|They) "
        }
      ]
    }
  ]
}
```

各問題に例文3つずつ作成。

---

## Phase 2: バグ収集

目的: Phase 1で作った問題を**全API**に解かせ、どのAPIがどんなミスをするか収集。

```
入力: Phase 1 の problems.json
処理: 全APIで全例文を翻訳
出力: 各APIのエラーパターン
```

### 出力形式

```json
{
  "phase2_results": {
    "apis_tested": ["groq-8b", "groq-70b", "gpt-4.1-nano"],
    "problems_found": [
      {
        "problem_id": "P001",
        "category": "主語省略",
        "results_by_api": {
          "groq-8b": { "pass": 0, "fail": 3 },
          "groq-70b": { "pass": 2, "fail": 1 },
          "gpt-4.1-nano": { "pass": 3, "fail": 0 }
        }
      }
    ]
  },
  "phase3_input": {
    "problems_to_fix": ["P001", "P002", "P005"],
    "api_priority": ["groq-8b", "groq-70b", "gpt-4.1-nano"],
    "max_attempts": {
      "groq-8b": 50,
      "groq-70b": 30,
      "gpt-4.1-nano": 10
    }
  }
}
```

**このJSONをそのままPhase 3に渡せる形式にしておく。**

---

## Phase 3: バグ修正ループ

目的: 安い順のAPIから、バグ0になるまでプロンプト修正をループ。

```
ループ処理:
1. 最安API（groq-8b）でテスト実行
2. 失敗あり → プロンプト修正（Phase 0のルールに従う）
3. 再テスト
4. 上限回数（50回）まで繰り返し
5. それでも失敗 → 次のAPI（groq-70b）へ
6. 全テストpass → そのAPIを採用
```

### 試行回数の上限（コスト管理）

```
groq-8b:      50回まで（〜0.5円）
groq-70b:     30回まで（〜3円）
gpt-4.1-nano: 10回まで（〜5円）
```

全部やっても10円以下。

---

## Phase 4: トーン差検証

目的: Phase 3で決まったAPIを使い、トーンレベルで翻訳結果が変わるかテスト。

```
テスト内容:
- 同じ文を 0%, 50%, 100% で翻訳
- 3つの結果が全て異なることを確認
- 同じ結果が出たら失敗 → プロンプト修正ループ
```

---

## 最終出力

```json
{
  "selected_api": "groq-70b",
  "speed_rank": 2,
  "cost_per_1k": "$0.59/$0.79",
  "passed_tests": {
    "subject_omission": true,
    "politeness_level": true,
    "double_ending": true,
    "tone_differentiation": true
  },
  "optimized_prompts": {
    "ja_to_en": "...",
    "en_to_ja": "..."
  },
  "fallback_api": "gpt-4.1-nano",
  "fallback_conditions": ["formal tone", "keigo required"]
}
```

---

## ファイル構成

```
scripts/
├── pre-speed-ranking.js       # 事前準備: 速度計測
├── phase1-generate-problems.js # 問題パターン生成
├── phase2-collect-bugs.js      # バグ収集
├── phase3-fix-loop.js          # 修正ループ
├── phase4-tone-check.js        # トーン差検証
└── run-all.js                  # 全フェーズ実行

data/
├── problems.json              # Phase 1 出力
├── bugs.json                  # Phase 2 出力
├── speed-ranking.json         # 速度ランキング
└── final-config.json          # 最終結果
```

---

## このパイプラインの価値

| 従来 | このパイプライン |
|------|-----------------|
| 人間が手動でテスト | AIが自動ループ |
| 感覚でAPI選定 | データで選定 |
| 「なんとなく良い」 | 全テストpass |
| 数日かかる | 数時間で完了 |
| 再現性なし | いつでも再実行可能 |

---

## レビュー結果

### ✅ 良いポイント

| 項目 | 評価 |
|------|------|
| **Phase 0を先に作った** | 🔥 修正ループの質が上がる |
| **Phase 2→3の受け渡し形式を先に決める** | 🔥 手戻りなくスムーズに進む |
| **安い順にトライ** | 🔥 コスト最適化の王道 |
| **試行回数に上限設ける** | 🔥 無限ループ防止 + コスト管理 |
| **速度ランキングを先にやる** | 🔥 Phase 3の優先順位が明確になる |
| **現コードをバックアップ** | 🔥 いつでも戻れる安心感 |

### 🤔 確認事項

**Phase 3 のループ、誰がプロンプトを直す？**

```
案A: Claude Code が自動で直す
     → 「テスト通るまでプロンプト直して」

案B: 紅平が結果見て直す
     → AIは実行だけ、判断は人間

案C: ハイブリッド
     → 最初はAI自動、3回失敗したら人間に聞く
```

**おすすめは案A（完全自動）。**
Phase 0 のルールがあるから、AIが「適当に直す」じゃなく「ルールに従って直す」になる。

### 📊 全体評価

```
構想の完成度: 95/100

減点ポイント:
- Phase 3 の自動修正の具体的な指示がまだ（これから作る部分）

加点ポイント:
- Phase 間の受け渡しを先に設計してる
- コスト管理が現実的
- 論文ベースのルールを先に用意してる
- 「指示だけする世界」が見えてる
```

---

## 🚀 次やること

1. git commit で現コードバックアップ
2. pre-speed-ranking.js 作成
3. phase1-generate-problems.js 作成
4. 順番に進める
