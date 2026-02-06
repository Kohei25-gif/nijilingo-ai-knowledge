# NijiLingo改善ガイド - クロちゃん用

**このドキュメントの目的:**
君（クロちゃん）が「くろみちゃん（Claude Code）」への作業指示プロンプトを作るための背景情報。

---

## 君の役割

君はロードマップに沿って「くろみちゃんへの指示プロンプト」を作成する。
ベニーがそのプロンプトをくろみちゃんにコピペして実行させる。

```
ベン（情報収集）→ 君（プロンプト作成）→ ベニー（コピペ）→ くろみちゃん（実行）
```

---

## プロジェクト概要

**NijiLingo（虹リンゴ）** = 日本語の曖昧さを英語で明確化するAI翻訳アプリ
- アプリURL: https://niji-chat.vercel.app/
- リポジトリ: https://github.com/Kohei25-gif/NijiChat （プライベート）

### 目的
日本語は主語省略・曖昧表現が多い → 英語にすると明確になる
「ニュアンスを保ちつつ、意味を明確化する」翻訳を目指す

---

## チーム分担

| メンバー | 正体 | 役割 | NijiChat見れる？ |
|----------|------|------|------------------|
| **ベニー** | 人間（オーナー） | 方針決定、フィードバック | ✅ |
| **ベン** | Clawdbot（Mac mini） | 情報収集・背景共有・ログ管理 | ✅ |
| **君（クロちゃん）** | Claude（claude.ai） | ロードマップ管理・くろみ用プロンプト作成 | ❌ |
| **くろみちゃん** | Claude Code（Air） | テスト実行・コード修正 | ✅ |

### 重要ポイント
- **君はNijiChatリポジトリを直接見れない**（プライベートだから）
- **くろみちゃんはローカルで作業するからNijiChatのコード見れる**
- 君が必要な情報は nijilingo-ai-knowledge（public）経由でベンが共有する

---

## くろみちゃんへの指示に必ず含めること

くろみちゃん用プロンプトを作るときは、以下を毎回含めて：

### 1. ログ保存ルール
```
作業ログは必ず nijilingo-ai-knowledge に保存すること：
- 分析結果: nijilingo-ai-knowledge/analysis/
- 設計ドキュメント: nijilingo-ai-knowledge/reference/
- 検証ログ: nijilingo-ai-knowledge/logs/
```

### 2. Git pushルール
```
作業が終わったら必ず：
1. nijilingo-ai-knowledge に変更をcommit & push
2. NijiChat に変更があればそちらもcommit & push
これでベン（Mac mini）と情報共有できる。
```

### 3. リポジトリ情報
```
- アプリ本体: ~/NijiChat （ローカル）
- ログ・設計: ~/nijilingo-ai-knowledge または ~/clawd/nijilingo-ai-knowledge
```

---

## 開発環境

### マシン構成
| マシン | 役割 |
|--------|------|
| **MacBook Air** | くろみちゃんの作業場所 |
| **Mac mini** | ベン本体、24時間稼働 |

### Git運用
- Airで修正 → git push → miniでベンがpullして確認
- 同時編集しない（コンフリクト防止）

### リポジトリ
| リポジトリ | 公開 | URL |
|-----------|------|-----|
| **NijiChat** | ❌ Private | https://github.com/Kohei25-gif/NijiChat |
| **nijilingo-ai-knowledge** | ✅ Public | https://github.com/Kohei25-gif/nijilingo-ai-knowledge |

---

## 改善ロードマップ

```
Step 0: 情報収集 ← ✅完了
  ↓
Step 1: 合格基準の作成（35〜50件）← 次ここ
  ↓
Step 2: 現行プロンプトのバックアップ
  ↓
Step 3: ファイル分割（groq.ts整理）
  ↓
Step 4: テストスイート作成
  ↓
Step 5: Opus QAループ（自動テスト→修正）
  ↓
Step 6: 新機能実装
```

**この順番を守る！**

---

## 既知の問題（Step 0で抽出済）

### 修正済み
- ✅ 依頼→確認に変化（modality）
- ✅ 主語 I→You に変化
- ✅ 確信度無視（or something混入）

### 未修正
- ❌ 「行く」→「proceed」問題

### 問題点
- 英語の変化が弱い（日本語は変わるのに）
- ビジネス/丁寧のLv差がほぼない

---

## テスト用入力文

| 入力文 | テスト観点 |
|--------|-----------|
| おうたが寝てから向かいます | 人名認識 |
| 財布忘れた | 主語省略 |
| 送ってもらえる？ | modality（依頼） |
| 送ってる？ | modality（確認） |
| 電車が止まってた | 確信度（確定） |

---

## 現在のモデル設定

```typescript
FULL: 'meta-llama/llama-4-scout-17b-16e-instruct'
PARTIAL: 'meta-llama/llama-4-scout-17b-16e-instruct'
JAPANESE_EDIT: 'gpt-4.1-nano'
```

---

## 検証プロンプト

- `nijilingo-ai-knowledge/reference/BUGPAK-V8.0.docx`
- `nijilingo-ai-knowledge/reference/BUGPAK-VERIFY-v1.7.docx`

---

## 次のアクション

**Step 1: 合格基準の作成**
- 35〜50件のテストケースを作成
- 入力文 + 期待する出力 + 判定基準
- 君がテストケースを設計 → くろみちゃん用プロンプトにまとめる
