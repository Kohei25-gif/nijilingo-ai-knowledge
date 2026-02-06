# NijiLingo改善ガイド

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
| **クロちゃん** | Claude（claude.ai） | ロードマップ作成・相談・分析 | ❌ |
| **くろみちゃん** | Claude Code（Air） | テスト実行・コード修正 | ✅ |

### ポイント
- **クロちゃん**はNijiChatリポジトリ見れない → nijilingo-ai-knowledge（public）経由で情報共有
- **くろみちゃん**はAirでローカル作業 → NijiChatのコード直接触れる
- くろみちゃんがどんどんテストしていくスタイル

---

## 開発環境

### マシン構成
| マシン | 役割 |
|--------|------|
| **MacBook Air** | くろみちゃんの作業場所、開発用 |
| **Mac mini** | ベン（Clawdbot）本体、24時間稼働 |

### Git運用ルール
1. **Airで修正 → git push**
2. **miniで git pull → ベンが最新を確認**
3. **同時編集しない**（コンフリクト防止）
4. pushしたらベンにも見える

### リポジトリ
| リポジトリ | 公開 | 用途 | 誰が見れる |
|-----------|------|------|-----------|
| **NijiChat** | ❌ Private | アプリ本体 | ベニー、ベン、くろみちゃん |
| **nijilingo-ai-knowledge** | ✅ Public | ログ・分析・設計ガイド | 全員（クロちゃん含む） |

---

## 改善ロードマップ

```
Step 0: 情報収集 ← ✅完了（ベンが実施済）
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

## 作業ログ保存先

作業したら記録を残す：
- **分析結果**: `nijilingo-ai-knowledge/analysis/`
- **設計ドキュメント**: `nijilingo-ai-knowledge/reference/`
- **検証ログ**: `nijilingo-ai-knowledge/logs/`

作業後は **必ず git push** してベンと共有すること。

---

## 次のアクション

**Step 1: 合格基準の作成**
- 35〜50件のテストケースを作成
- 入力文 + 期待する出力 + 判定基準
- クロちゃん（Claude.ai）と相談しながら進める
- 完成したらくろみちゃんがテストスイート化
