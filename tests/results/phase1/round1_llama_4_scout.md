# Round 1 検証結果

> 日付: 2026-01-31
> API: llama-4-scout

---

## 📊 サマリー

| トーン | スコア | 詳細 |
|--------|--------|------|
| casual | 2/10 | ❌ |
| business | 5/10 | ❌ |
| formal | 3/10 | ❌ |
| **合計** | **10/30** | |

平均レスポンス時間: 1150ms

---

## ❌ 失敗パターン

### casual

**「これ、いいね」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | This is good | これ、いいね |
| 50% | This is cool | これ、いいね |
| 100% | This is lit! | これ、最高じゃん |

**「ちょっと聞きたいんだけど」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I was wondering if I could ask you somet | ちょっと聞きたいんだけど |
| 50% | So, I was wondering | ちょっと聞きたいんだけど |
| 100% | So I gotta ask | ちょっと聞きたいんだけど |

**「また今度ね」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | See you next time | また今度ね |
| 50% | See you next time | また今度ね |
| 100% | Catch you later! | また今度ね！ |

**「それ、どういう意味？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | What does that mean? | それどういう意味？ |
| 50% | What does that mean? | それ、どういう意味？ |
| 100% | What does that even mean? | それ、どういう意味？ |

**「お願いできる？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | Can I ask you something? | お願いできる？ |
| 50% | Can you do me a favor? | お願いできる？ |
| 100% | Can you do me a solid? | お願いできる？ |

**「まあ、いいか」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I guess it's okay | まあ、いいか |
| 50% | It's okay, I guess. | まあ、いいか |
| 100% | Whatever, it's cool | まあ、いいか |

**「来週都合どう？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | How about next week? | 来週どうかな？ |
| 50% | How about next week? | 来週どうかな？ |
| 100% | What's up next week? | 来週どうなの？ |

**「そうなんだ」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | oh | そうなんだ |
| 50% | oh, really | そうなんだ |
| 100% | Yep, that's right! | そうなんだ！ |

### business

**「これ、いいね」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I like this. | これ、いいね |
| 50% | I think this is good. | これ、いいね |
| 100% | I find this extremely satisfactory. | この内容、非常に満足しています。 |

**「ちょっと聞きたいんだけど」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I was wondering if I could ask you somet | ちょっと聞きたいんだけど |
| 50% | Could I ask you something? | ちょっと聞きたいんだけど |
| 100% | I would be most grateful if I could inqu | お伺いしたいことがあるのですが |

**「また今度ね」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | See you next time | また今度ね |
| 50% | Let's catch up another time. | また今度ね |
| 100% | I look forward to our next opportunity t | また今度ね |

**「来週都合どう？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | How about your schedule for next week? | 来週の予定はどうですか？ |
| 50% | How are you next week? | 来週の予定はどうですか？ |
| 100% | I would be most grateful if you could ki | 来週のご都合いかがでしょうか？ |

**「そうなんだ」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | That's right | そうなんだ |
| 50% | I see. | そうなんだ |
| 100% |  | {
  "translation": "I see.",
  "reverse_ |

### formal

**「ちょっと聞きたいんだけど」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | I was wondering if I could ask you somet | ちょっと聞きたいんだけど |
| 50% | I was wondering if I could ask you somet | ちょっと聞きたいんだけど |
| 100% | I would be deeply honored if I might inq | ちょっと聞きたいんですが |

**「また今度ね」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | See you next time | また今度ね |
| 50% | Let's catch up next time. | また今度ね |
| 100% | I would be deeply honored to catch up wi | また今度ね、お楽しみに |

**「それ、どういう意味？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | What does that mean? | それ、どういう意味ですか？ |
| 50% | What does that mean? | それ、どういう意味ですか？ |
| 100% | I would be deeply honored if you could k | どうか、その意味を詳しく説明していただけますでしょうか。 |

**「お願いできる？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | Could I ask you for a favor? | お願いしてもいいですか？ |
| 50% | Could I ask a favor of you? | お願いしてもいいですか？ |
| 100% | I would be deeply honored if you could p | お願いできますでしょうか？ |

**「来週都合どう？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | How are you next week? | 来週の予定はどうですか？ |
| 50% | How are you next week? | 来週の予定はどうですか？ |
| 100% | I would be deeply honored if you could k | 来週のご都合いかがでしょうか？ |

**「そうなんだ」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | That's right. | そうなんだ |
| 50% | I see. | そうなんだ |
| 100% | I see. | そうなんだ |

**「それ、本当？」**
| Level | 英語 | 逆翻訳 |
|-------|------|--------|
| 0% | Is that true? | それ、本当ですか？ |
| 50% | Is that really true? | それ、本当ですか？ |
| 100% | Is that truly the case? | それは本当ですか？ |

---

## ✅ 成功パターン

**「それ、本当？」** (casual) ✅
**「またよろしく」** (casual) ✅
**「それ、どういう意味？」** (business) ✅
**「お願いできる？」** (business) ✅
**「まあ、いいか」** (business) ✅
**「それ、本当？」** (business) ✅
**「またよろしく」** (business) ✅
**「これ、いいね」** (formal) ✅
**「まあ、いいか」** (formal) ✅
**「またよろしく」** (formal) ✅


---

## 📝 次の改善ポイント

（ここに手動で記入）

