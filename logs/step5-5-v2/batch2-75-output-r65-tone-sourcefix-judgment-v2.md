## B2-01「ごめん、今日ちょっと体調悪くて休ませてもらうね」
程度=**slight**（※前回moderate→今回slight、構造抽出の非決定性）、極性=negative、動作=take a rest

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | feeling a bit off, wanna take it easy | not feeling too great, want to take it easy | **feelin' pretty crummy**, gonna take it easy | **feelin' super crappy**, gonna chill |
| bus | feeling unwell, appreciate taking a break | currently indisposed, appreciate if I could take a break | regret to inform, unwell, request a day's leave | compelled to notify, health concerns, submitting a request |
| for | not in good health, would like to take some rest | currently unwell, wish to take a period of rest | regret to inform, ill health, temporary leave of absence | compelled to notify, compromised health, provisional respite |

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | ✅ | ✅ | ❌ pretty crummy=degree↑ | ❌ super crappy=degree↑ |
| bus | ✅ | ✅ | ✅ | ✅ |
| for | ✅ | ✅ | ✅ | ✅ |

**10/12** — cas75/100のdegree escalation残存。ただしslightからの上昇なので前回（moderate→strong）より深刻。

---

## B2-02「田中さんが来週の月曜に来るらしいよ」
確信度=伝聞、極性=neutral、程度=none

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | I heard, coming | I heard, coming | I heard, coming | I heard, comin' |
| bus | I've been informed, arriving | I have been advised, scheduled | I have been informed, due to arrive | We have been advised, scheduled |
| for | It is understood, arriving | We have been informed, scheduled | brought to our attention, slated | We have been informed, scheduled |

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | ✅ | ✅ | ✅ | ✅ |
| bus | ✅ | ✅ | ✅ | ✅ |
| for | ✅ | ✅ | ✅ | ✅ |

**12/12** 🎉 pleasure完全消滅。伝聞マーカー全保持。前回6/12→12/12、+6件の改善。

---

## B2-03「もし時間があったら手伝ってもらえると助かるんだけど」
条件=もし〜たら、願望=あり、確信度=推測

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | If you've got some time, appreciate | If you've got a sec, super appreciate | If you've got a minute, appreciate | If you've got a sec, hook me up |
| bus | If you have spare time, grateful | If you have spare time, appreciate | If you have spare time, grateful | If you could allocate some time, appreciative |
| for | If you have spare time, grateful | If you could spare a moment, most grateful | If you could kindly spare a moment, deeply grateful | If you would be so kind as to spare a moment, most grateful |

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | ✅ | ✅ | ✅ | ✅ |
| bus | ✅ | ✅ | ✅ | ✅ |
| for | ✅ | ✅ | ✅ | ✅ |

**12/12** ✅

---

## B2-04「この資料、かなりよくできてると思うよ」
程度=strong、確信度=推測、極性=positive

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | I reckon, done pretty well | I think, done really well | done really well, I think | done super well, I reckon |
| bus | I believe, well prepared | I am confident, thoroughly prepared | **I am pleased to confirm**, high standard | **I am delighted to confirm**, exceptionally high |
| for | I believe, well executed | I deem, executed commendably | I consider, executed laudably | I deem, executed commendably |

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | ✅ | ✅ | ✅ | ✅ |
| bus | ✅ | ❌ confident=推測→確定 | ❌ pleased to confirm=pleasure+確定化 | ❌ delighted to confirm=pleasure+確定化 |
| for | ✅ | ✅ | ✅ | ✅ |

**9/12** — bus50の"confident"は推測→確定化。bus75/100にpleasure復活。ただしB2-02では消えてB2-04で出現、つまり文の内容（positive感想文）に引きずられてる可能性。

---

## B2-05「駅前の新しいラーメン屋、めちゃくちゃ並んでたから諦めた」
動作=give up、程度=strong、確信度=確定(過去)、条件=〜から

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | gave up, crazy long line | gave up, ridiculously long | gave up, super long | ditched, hella long |
| bus | decided against, extremely long | opted not to, exceptionally long | refrained from, extraordinarily lengthy | abstained from, exceptionally extensive |
| for | refrained from, considerable | abstained from, substantial | refrained from, considerable | abstained from, substantial |

| | 25 | 50 | 75 | 100 |
|---|---|---|---|---|
| cas | ✅ | ✅ | ✅ | ✅ |
| bus | ✅ | ✅ | ✅ | ✅ |
| for | ✅ | ✅ | ✅ | ✅ |

**12/12** 🎉 時制shift完全解消（前回cas75/100がFAIL）。innovative問題も消滅。

---

## 総合

| 文 | 前回(2点修正後) | 今回(源流修正) | 差分 |
|---|---|---|---|
| B2-01 | 10/12 | 10/12 | ±0 |
| B2-02 | 6/12 | **12/12** | **+6** 🎉 |
| B2-03 | 12/12 | 12/12 | ±0 |
| B2-04 | 12/12 | **9/12** | **-3** |
| B2-05 | 9/12 | **12/12** | **+3** 🎉 |

**合計: 55/60 (91.7%)** — 前回49/60 (81.7%)から **+10.0%改善**

### 効果まとめ

| 修正 | 対象FAIL | 結果 |
|---|---|---|
| 「感情や評価は付加しない」 | B2-02 pleasure+伝聞消失 | **完全解消** ✅ |
| 「砕けた文法」→「スラング」 | B2-05 時制shift | **完全解消** ✅ |
| 「強い強調表現」→「くだけた語彙」 | B2-01 degree escalation | 残存 |

### 新規FAIL: B2-04 bus50/75/100

B2-04はpositive感想文（「かなりよくできてると思うよ」）。bus高レベルで "pleased to confirm"/"delighted to confirm" が出た。B2-02（neutral文）ではpleasure消えたのにB2-04（positive文）では出た。

原文がpositiveだからpleasedが出るのは一見妥当に見えるが、構造値は確信度=**推測**（「思うよ」）。"confirm"は確定化だからFAIL。pleasedは感情極性positiveと整合するが、confirmが推測と矛盾する。
