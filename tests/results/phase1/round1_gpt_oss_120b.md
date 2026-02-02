# Round 1 検証結果

> 日付: 2026-01-31
> API: gpt-oss-120b

---

## 📊 サマリー

| トーン | スコア | 詳細 |
|--------|--------|------|
| casual | 8/10 | ❌ |
| business | 8/10 | ❌ |
| formal | 9/10 | ❌ |
| **合計** | **25/30** | |

平均レスポンス時間: 2969ms

---

## ❌ 失敗パターン

### casual

**「お願いできる？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | Can you do it? | できる？ |
| 50% | Can you do it? | できる？ |
| 100% | Can ya do me a favor? | やってくれる？ |

**「まあ、いいか」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | Well, I guess it's fine. | まあ、いいかね。 |
| 50% | I guess it's okay. | まあ、いいかね。 |
| 100% | Whatever, it's fine. | まあ、いいっすね。 |

### business

**「ちょっと聞きたいんだけど」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I would like to ask a quick question. | 少しお伺いしたいのですが。 |
| 50% | I would like to ask you a question. | 少しお伺いしたいのですが。 |
| 100% | I would like to make a brief inquiry, if | 少々お伺いしたいことがございますが、よろしいでしょうか。 |

**「そうなんだ」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I see. | 承知いたしました。 |
| 50% | I understand. | 承知いたしました。 |
| 100% | It is indeed the case. | 確かにそうでございます。 |

### formal

**「そうなんだ」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I see. | そうですか。 |
| 50% | I see. | そうですか。 |
| 100% |  | {
  "translation": "I humbly understand  |

---

## ✅ 成功パターン

**「これ、いいね」** (casual) ✅
**「ちょっと聞きたいんだけど」** (casual) ✅
**「また今度ね」** (casual) ✅
**「それ、どういう意味？」** (casual) ✅
**「来週都合どう？」** (casual) ✅
**「そうなんだ」** (casual) ✅
**「それ、本当？」** (casual) ✅
**「またよろしく」** (casual) ✅
**「これ、いいね」** (business) ✅
**「また今度ね」** (business) ✅
**「それ、どういう意味？」** (business) ✅
**「お願いできる？」** (business) ✅
**「まあ、いいか」** (business) ✅
**「来週都合どう？」** (business) ✅
**「それ、本当？」** (business) ✅
**「またよろしく」** (business) ✅
**「これ、いいね」** (formal) ✅
**「ちょっと聞きたいんだけど」** (formal) ✅
**「また今度ね」** (formal) ✅
**「それ、どういう意味？」** (formal) ✅
**「お願いできる？」** (formal) ✅
**「まあ、いいか」** (formal) ✅
**「来週都合どう？」** (formal) ✅
**「それ、本当？」** (formal) ✅
**「またよろしく」** (formal) ✅


---

## 📝 次の改善ポイント

（ここに手動で記入）

