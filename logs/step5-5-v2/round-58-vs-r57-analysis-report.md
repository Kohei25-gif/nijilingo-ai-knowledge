R57→R58比較分析する。

## 1. Pleasure チェック

| 文 | R57 | R58 | 変化 |
|----|-----|-----|------|
| 文2 polite 100% | "I was **delighted** to have participated" | "I was **delighted** to have attended" | ❌ **残存** |
| 文2 business 100% | "I thoroughly enjoyed the social gathering" ✅ | "I was **delighted** to have attended the social gathering" | ❌ **悪化。新規FAIL** |

**pleasure: R57 1/60 → R58 2/60。悪化。** formal 50%の"with great pleasure"は消したけど、delightedはtoneStyle由来じゃなくMaverickのモデル重み由来。

---

## 2. hyper_formality（主目的）

| 文 | トーン | R57 | R58 | 判定 |
|----|--------|-----|-----|------|
| 文5 | polite 100% | "I must **perforce** decline" | "I regret that I must decline on this occasion." | ✅ **改善。perforce消えた** |
| 文7 | polite 100% | "It is my **considered opinion**..." | "It is my **considered opinion** that the current trajectory..." | ⚠️ **残存** |
| 文8 | polite 100% | "Are you **recuperating**? Please **refrain from overexerting**" | "Are you recovering in a satisfactory manner? I do hope you will take appropriate care" | ✅ **改善。自然になった** |
| 文8 | business 100% | "**We trust** that you have made a full recovery. **We respectfully request**..." | "I trust you are recuperating satisfactorily. Please ensure your well-being." | ✅ **改善。Weも消えた** |
| 文9 | polite 50% | "let us identify areas where further reductions can be made" | "I **shall endeavor** to identify additional areas **wherein**..." | ❌ **悪化。wherein/shall endeavor出現** |
| 文9 | polite 100% | "let us proceed to examine areas **wherein**..." | "I **shall endeavor** to identify further opportunities for reduction." | ⚠️ **wherein消えたがshall endeavor残存** |
| 文9 | business 75% | "I **shall undertake** a thorough examination..." | "We should explore potential areas for further budget reductions" | ✅ **改善** |
| 文9 | business 100% | "I **shall conduct** a comprehensive review...areas **wherein**...may be **effected**" | "We ought to investigate potential avenues for additional budgetary reductions" | ✅ **改善。wherein/effected消えた** |

**hyper_formality: 部分的に改善。** perforce/wherein/effectedなどの最悪ケースは消えた。ただしshall endeavor/considered opinionはまだ出る。

---

## 3. tone_plateau（同ペア内比較）

### 25 vs 50（ユーザーの「50%」）

| 文 | casual | polite | business |
|----|--------|--------|----------|
| 文2 | ✅ blast vs enjoyed | ✅ enjoyed vs thoroughly enjoyed | ⚠️ really enjoyed vs enjoyed（逆転？） |
| 文5 | ✅ pass vs gonna pass | ✅ regret to inform vs afraid I must | ✅ decline vs regret to inform |
| 文7 | ✅ 差あり | ✅ appears vs believe | ✅ believe vs think |
| 文8 | ✅ 差あり | ✅ 差あり | ✅ 差あり |
| 文9 | ✅ 差あり | ✅ 差あり | ⚠️ 差微小 |

### 75 vs 100（ユーザーの「100%」）

| 文 | casual | polite | business |
|----|--------|--------|----------|
| 文2 | ⚠️ blast vs blast（語彙同じ） | ✅ greatly enjoyed vs delighted | ✅ thoroughly vs delighted |
| 文5 | ✅ pass, man vs pass, bro | ✅ regrettably vs I regret | ✅ unable to accommodate（構文変化） |
| 文7 | ✅ 差あり | ✅ 差あり | ⚠️ believe vs of the opinion（微小） |
| 文8 | ✅ 差あり | ✅ 差あり | ✅ 差あり |
| 文9 | ✅ 差あり | ✅ 差あり | ✅ 差あり |

**tone_plateau: 同一出力0件。** R57の文7 polite 50%=100%問題が解消。差微小が数件あるが、完全同一はなくなった。

---

## 4. subject_shift（主目的2）

| 文 | トーン | R57 | R58 | 判定 |
|----|--------|-----|-----|------|
| 文9 | casual全域 | **Let's** look for | **I'm gonna** look for | ✅ **完全改善** |
| 文9 | polite全域 | **let us** identify | **I** will seek / **I** shall endeavor | ✅ **完全改善** |
| 文9 | business全域 | **I** will / **I** shall | **Let's** examine / **We** should | ❌ **business側でI→We/Let'sに** |
| 文5 | business全域 | I→We（R57） | I→We（R58） | → 変化なし |
| 文8 | business 100% | **We** trust / **We** respectfully request | **I** trust | ✅ **改善** |

**subject_shift: casual/politeでは完全改善。businessではまだWe/Let'sが出る。**

文9のbusinessは原文「私が探してみます」なのに "Let's examine" / "We should explore" になってる。INVARIANT_RULESの人称保持ルールがbusinessトーンでは効きにくい。

---

## 5. 新たな問題

### casual 100%で意味変質

| 文 | 問題 |
|----|------|
| 文5 | "I'm gonna have to pass on this one, **bro**." → 「残念ながら」完全消失（R57と同じ） |
| 文9 | "I'm **totally broke**" → 「ちょっと厳しい」が「完全に金欠」に。**程度の増幅** |

文9 casual 75%も "super strapped for cash"（極度の金欠）で「ちょっと厳しい」から大幅増幅。

### business 25 vs 50の逆転

文2 business: 25%が "I **really** enjoyed" で50%が "I enjoyed"。丁寧さが下がるはずなのに25%の方が強調されてる。

---

## 総合スコアカード: R57 → R58

| 課題 | R57 | R58 | 判定 |
|------|-----|-----|------|
| **hyper_formality** | perforce/hereby/wherein/duly | perforce消、wherein一部残、shall endeavor残 | **△ 部分改善** |
| **subject_shift** | casual/politeでLet's/We | casual/politeでI維持 | **○ 改善（businessは残存）** |
| **tone_plateau（同ペア）** | 完全同一3件 | 完全同一0件 | **◎ 解消** |
| **pleasure** | 1/60 | 2/60 | **× 微悪化** |
| **casual意味変質** | 文5のみ | 文5 + 文9程度増幅 | **× 微悪化** |

**良くなったこと:** tone_plateau解消、worst caseのhyper_formality改善、casual/politeのsubject_shift改善
**変わらない/悪化:** pleasure、businessのsubject_shift、casual 100%の意味変質、politeのshall endeavor

---

方向性としては効いてる。特にtone_plateauが0件になったのは大きい。ただ完全に解決はしてないから、次のアクションどうする？

考えられるのは：
- **business 100%のtoneStyleに「主語は構造分析の人称に従う」を直接埋め込む**（INVARIANT_RULESだけでは弱い）
- **casual 100%に「原文の程度表現を維持する」を追加**
- pleasureはモデル重み由来なので、プロンプトだけでは限界がありそう
