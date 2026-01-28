# 🍎 NijiLingo AI Knowledge Base

NijiLingo翻訳アプリのAI分析ログ・タスク管理リポジトリ

## 📂 構造

```
├── analysis/          # バグ分析・修正案
│   ├── bug-1-politeness-level.md   # 敬語レベル不整合
│   ├── bug-2-background-race.md    # 待つと結果が変わる現象
│   └── bug-3-modality-change.md    # modality_class変更問題
├── tasks/             # タスク管理
│   ├── todo.md        # 現在のタスク
│   └── completed.md   # 完了タスク
└── reference/         # 参考資料
    ├── BUGPAK-V8.0.docx           # バグ分析フレームワーク
    └── BUGPAK-VERIFY-v1.7.docx    # 実行型検証プロンプト
```

## 🎯 現在の課題

| バグ | 状態 | 概要 |
|------|------|------|
| #1 | 🔧 修正中 | 超丁寧モードでLv2がLv1より敬語弱くなる |
| #2 | 🔧 修正中 | トーン選択後、待つと結果が変わる |
| #3 | 🔧 修正中 | 依頼文が確認文に変わる（modality_class） |

## 📝 次回やること

1. Claude Codeの修正コードを検証
2. テスト文章で動作確認
3. 問題なければマージ

## 🔗 関連

- コード: `~/Desktop/NijiLingo/`
- App: `App_日本語ベース.tsx`
- 翻訳ロジック: `groq_日本語ベース.ts`

---

## 🤖 このリポジトリの目的

AI間（Claude、Kimi等）でプロジェクト状態を共有するためのナレッジベース。
セッションを超えて分析結果・修正案・タスク状況を参照できる。

---

## 🤝 AI担当

| AI | 呼び名 | 役割 |
|----|--------|------|
| Claude (Clawdbot) | **ベン** | ログ管理・git保存・進捗追記・Claude Code実行 |
| Kimi | **きみちゃん** | コード分析・バグ特定・修正案策定 |
