## R59 vs R58 比較分析

### 主検証: business subject_shift

| 文 | トーン | R58 | R59 | 判定 |
|----|--------|-----|-----|------|
| 文5 business 25% | | **We** will have to decline | **I'm afraid I'll** have to pass | ✅ **I に修正** |
| 文5 business 50% | | **We** regret to inform you that **we** will | **I** regret to inform you that **I** will | ✅ **I に修正** |
| 文5 business 75% | | **We** regret that **we** are unable to accommodate | **I** regret that **I** must decline | ✅ **I に修正** |
| 文5 business 100% | | **We** regret to inform you that **we** are unable | **I** regret to inform you that **I** must decline | ✅ **I に修正** |
| 文9 business 25% | | **Let's** examine areas | **I'll** search for additional areas | ✅ **I に修正** |
| 文9 business 50% | | **Let's** look for areas | **I** will be looking for | ✅ **I に修正** |
| 文9 business 75% | | **We** should explore | **I** intend to identify | ✅ **I に修正** |
| 文9 business 100% | | **We** ought to investigate | **I** plan to explore | ✅ **I に修正** |
| 文8 business 100% | | **I** trust（R58で既に改善） | **I** trust | ✅ 維持 |

**business subject_shift: 8/8件 完全修正。** 効いた。

---

### pleasure チェック

| 文 | R58 | R59 |
|----|-----|-----|
| 文2 polite 100% | **delighted** ❌ | "I thoroughly enjoyed" ✅ **消えた！** |
| 文2 business 100% | **delighted** ❌ | **delighted** ❌ 残存 |

**pleasure: R58 2/60 → R59 1/60。politeは消えた、business 100%に1件残存。**

---

### hyper_formality

| 文 | トーン | R58 | R59 | 判定 |
|----|--------|-----|-----|------|
| 文5 polite 100% | | "I regret that I must decline on this occasion." | "I regret that I am compelled to decline **at this juncture**." | ⚠️ juncture復活 |
| 文7 polite 50% | | "I believe..." | "It is my **considered opinion**..." | ⚠️ 残存 |
| 文7 polite 100% | | "It is my **considered opinion**..." | "It is my **considered opinion**..." | ⚠️ 残存 |
| 文9 polite 50% | | "I **shall endeavor**...areas **wherein**" | "let us identify areas where..." | ✅ 改善 |
| 文9 polite 100% | | "I **shall endeavor**..." | "**ascertain** domains **wherein**...may be **effectuated**" | ❌ **悪化。最悪レベル** |
| 文8 polite 100% | | "I do hope you will take appropriate care" | "**We** kindly request that you **refrain from exerting yourself to an excessive degree**" | ❌ **悪化 + We出現（polite側）** |

文9 polite 100%の "ascertain domains wherein additional economies may be effectuated" は「ちょっと予算厳しいから削れるとこ探す」の訳として完全に異常。R58より悪い。

---

### tone_plateau（同ペア内）

| 文 | 25 vs 50 | 75 vs 100 |
|----|----------|-----------|
| 文2 casual | ✅ blast vs enjoyed | ✅ totally blast vs absolute blast |
| 文2 polite | ✅ great time vs thoroughly enjoyed | ⚠️ most enjoyable vs thoroughly enjoyed（75>100に見える） |
| 文2 business | ⚠️ great time vs enjoyed（逆転） | ✅ thoroughly vs delighted |
| 文5 casual | ✅ pass vs gotta pass | ❌ gonna pass vs gotta pass（75と100逆転+50=100同一） |
| 文5 polite | ✅ 差あり | ✅ 差あり |
| 文5 business | ✅ 差あり | ✅ 差あり |
| 文7 casual | ✅ 差あり | ⚠️ 差微小 |
| 文7 polite | ✅ 差あり | ❌ polite 50% = 100% 完全同一 "considered opinion" |
| 文7 business | ✅ 差あり | ✅ 差あり |
| 文8 全体 | ✅ | ✅ |
| 文9 casual | ✅ | ✅ |
| 文9 polite | ✅ | ✅ |
| 文9 business | ✅ | ✅ |

**完全同一: 2件（文5 casual 50=100、文7 polite 50=100）。** R58の0件から微悪化。

---

## 総合スコアカード: R58 → R59

| 課題 | R58 | R59 | 判定 |
|------|-----|-----|------|
| **business subject_shift** | 8件We/Let's | **0件。全てI** | **◎ 完全解決** |
| **pleasure** | 2/60 | 1/60 | **○ 微改善** |
| **hyper_formality** | shall endeavor/wherein | 一部改善、polite 100%で悪化あり | **△ 不安定** |
| **tone_plateau** | 完全同一0件 | 完全同一2件 | **△ 微悪化** |
| **polite側のWe出現** | なし | 文8 polite 100% "We kindly request" | **× 新規問題** |

---

## 判断

**businessのsubject_shiftは完全に直った。** これは確定的な改善。

ただし**polite側が不安定化してる**。文8 polite 100%でWe出現、文9 polite 100%でascertain/wherein/effectuatedが出現。businessのtoneStyleに人称指示を入れた影響でpolite側に変な副作用が出てる可能性は低いけど、API非決定性かもしれない。

次どうする？選択肢：

1. **polite側にも同じ人称指示を追加**して安定させる
2. **今のまま確定**して、politeのhyper_formalityは別途対応
3. **R59をもう1回同じ条件で回して**API非決定性か確認
