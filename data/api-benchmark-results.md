# NijiLingo API ベンチマーク統合結果
**日付:** 2025-01-30
**テスト者:** ベン

---

## 📊 統合比較表（Phase 3/4/5）

| モデル | 翻訳精度 | JA→EN | EN→JA | トーン差 | 単体速度 | フロー速度 | コスト |
|--------|----------|-------|-------|----------|----------|------------|--------|
| **gpt-4.1-mini** | **18/20** 🥇 | **10/10** | 8/10 | 83% | 648ms | 3653ms | $0.40/$1.60 |
| **gpt-oss-120b** | 17/20 🥈 | 9/10 | 8/10 | **100%** 🥇 | 499ms | 2631ms | $0.15/$0.60 |
| **gpt-4.1-nano** | 16/20 | 8/10 | 8/10 | **100%** 🥇 | 685ms | 4110ms ⚠️ | $0.10/$0.40 |
| **groq-70b** | 16/20 | 9/10 | 7/10 | 67% | 360ms | 1353ms 🥈 | $0.59/$0.79 |
| **llama-4-scout** | 15/20 | 7/10 | 8/10 | 33% ⚠️ | 235ms | **921ms** 🥇 | $0.11/$0.34 |
| groq-8b | 14/20 | 8/10 | 6/10 | 50% ⚠️ | 414ms | 1532ms 🥉 | $0.05/$0.08 |
| gpt-5-nano | 17/20 | 8/10 | 9/10 | - | 2155ms | - | 遅すぎ除外 |

---

## 📈 Phase別ランキング

### Phase 3: 翻訳精度（20問テスト）
| 順位 | API | JA→EN | EN→JA | 合計 |
|------|-----|-------|-------|------|
| 🥇 | gpt-4.1-mini | **10/10** | 8/10 | **18/20** |
| 🥈 | gpt-oss-120b | 9/10 | 8/10 | 17/20 |
| 🥉 | gpt-4.1-nano | 8/10 | 8/10 | 16/20 |
| 🥉 | groq-70b | 9/10 | 7/10 | 16/20 |
| 5 | llama-4-scout | 7/10 | 8/10 | 15/20 |
| 6 | groq-8b | 8/10 | 6/10 | 14/20 |

### Phase 4: トーン差検証（0%/50%/100%が全部違うか）
| 順位 | API | Pass | Rate |
|------|-----|------|------|
| 🥇 | gpt-4.1-nano | 6/6 | **100%** |
| 🥇 | gpt-oss-120b | 6/6 | **100%** |
| 🥉 | gpt-4.1-mini | 5/6 | 83% |
| 4 | groq-70b | 4/6 | 67% |
| 5 | groq-8b | 3/6 | 50% |
| 6 | llama-4-scout | 2/6 | 33% |

### Phase 5: 実フロー速度（FULL→50%→100%の3回連続）
| 順位 | API | 平均フロー時間 |
|------|-----|---------------|
| 🥇 | llama-4-scout | **921ms (0.92秒)** |
| 🥈 | groq-70b | 1353ms (1.35秒) |
| 🥉 | groq-8b | 1532ms (1.53秒) |
| 4 | gpt-oss-120b | 2631ms (2.63秒) |
| 5 | gpt-4.1-mini | 3653ms (3.65秒) |
| 6 | gpt-4.1-nano | 4110ms (4.11秒) |

---

## 🎯 用途別おすすめ

| 用途 | 推奨API | 理由 |
|------|---------|------|
| **翻訳精度最優先** | gpt-4.1-mini | JA→EN 10/10パーフェクト |
| **トーン変化重視** | gpt-4.1-nano or gpt-oss-120b | 両方100% |
| **速度最優先** | llama-4-scout | フロー0.92秒 |
| **速度・品質バランス** | groq-70b | 1.35秒、16/20 |
| **コスパ最強** | gpt-oss-120b | 17/20、100%トーン、$0.15/$0.60 |
| **人名認識必要** | gpt-4.1-mini | 唯一「Outa」認識 |

---

## 💡 推奨構成

### 品質重視
- **FULL翻訳:** gpt-4.1-mini（翻訳精度18/20）
- **PARTIAL:** gpt-4.1-nano（トーン差100%）
- **想定フロー時間:** 約4〜5秒

### 速度重視
- **FULL翻訳:** groq-70b
- **PARTIAL:** groq-70b
- **想定フロー時間:** 約1.3秒

### バランス重視（おすすめ）
- **FULL翻訳:** gpt-oss-120b（17/20、コスパ良）
- **PARTIAL:** gpt-oss-120b（トーン差100%）
- **想定フロー時間:** 約2.6秒

### 最速（※Preview）
- **FULL翻訳:** llama-4-scout
- **PARTIAL:** llama-4-scout
- **想定フロー時間:** 約0.9秒
- ⚠️ Previewモデル、トーン差33%

---

## ⚠️ 注意点

| API | 注意 |
|-----|------|
| llama-4-scout | Previewモデル（本番非推奨）、トーン差33% |
| gpt-4.1-nano | businessトーンで不安定（最大8秒） |
| groq-8b | 出力品質に問題あり、依頼文が破綻 |
| gpt-5-nano | 遅すぎ（2155ms）で除外 |

---

## 🔑 APIキーの場所
- **OPENAI_API_KEY:** `~/Desktop/NijiLingo/.env.local`
- **GROQ_API_KEY:** コマンドライン引数で渡す

## 🛠️ 検証方法
```bash
cd ~/clawd/nijilingo-ai-knowledge/scripts

# Phase 3: 翻訳精度
GROQ_API_KEY=xxx OPENAI_API_KEY=xxx node phase3-test.js

# Phase 4: トーン差
GROQ_API_KEY=xxx OPENAI_API_KEY=xxx node phase4-full-test.js

# Phase 5: フロー速度
GROQ_API_KEY=xxx OPENAI_API_KEY=xxx node phase5-flow-test.js
```

## 📁 関連ファイル
- Phase 3スクリプト: `scripts/phase3-test.js`
- Phase 4スクリプト: `scripts/phase4-full-test.js`
- Phase 5スクリプト: `scripts/phase5-flow-test.js`
- Phase 5詳細ログ: `logs/2025-01-30_phase5_flow_test.md`
