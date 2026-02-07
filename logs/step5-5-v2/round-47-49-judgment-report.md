## Round 47 判定結果（文186-190）

### 文186:「正直、その説明は分かりづらい。」
意図=感想 / 動作の意味=be unclear / 感情極性=negative / 程度=none

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "isn't clear" 適切 |
| casual 50 | ✅ PASS | "kinda confusing" 自然なカジュアル |
| casual 75 | ⚠️ WARN | "super confusing" — 原文に「すごく」はないが、casual 75として許容範囲 |
| casual 100 | ⚠️ WARN | "hella confusing" — 同上。casual_100の増幅は許容 |
| polite 25 | ✅ PASS | "having trouble understanding" 適切 |
| polite 50 | ✅ PASS | "finding it difficult to grasp" |
| polite 75 | ✅ PASS | "having some trouble understanding" |
| polite 100 | ⚠️ WARN | "somewhat perplexing" — 過剰だが意味維持 |
| business 25 | ✅ PASS | "appears to be unclear" |
| business 50 | ✅ PASS | "seems unclear" |
| business 75 | ✅ PASS | "appears to be unclear" — 25%と同一だが意味OK |
| business 100 | ✅ PASS | "seems unclear" — 50%と同一。business差分薄い |

**文186: PASS 9 / WARN 3 / FAIL 0** 🎉

述語「分かりづらい」→ "unclear/confusing" で一貫維持。「正直」のニュアンスも全トーンで保持。

---

### 文187:「今日の会議、結局結論出なかった。」
意図=報告 / 動作の意味=result / 感情極性=neutral / 確信度=確定

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "didn't quite wrap up" — 「結論出なかった」→「まとまらなかった」微妙にズレ。wrap up=終了であり結論到達とは異なる |
| casual 50 | ❌ FAIL | **predicate_meaning_shift**: "didn't get finished up" — 「結論出なかった」が「終わらなかった」に変化。会議は終わったが結論が出なかったのが原文の意味 |
| casual 75 | ❌ FAIL | **predicate_meaning_shift**: "didn't wrap up" — 同上。「結論」が消失し「会議が終わらなかった」に |
| casual 100 | ❌ FAIL | **predicate_meaning_shift**: "didn't get wrapped up, dude" — 同上 |
| polite 25 | ✅ PASS | "did not reach a conclusion" 正確 |
| polite 50 | ✅ PASS | "did not reach a conclusive outcome" |
| polite 75 | ✅ PASS | "did not yield a conclusive result" |
| polite 100 | ⚠️ WARN | "did not culminate in a definitive outcome" — 過剰だが意味維持 |
| business 25 | ⚠️ WARN | "unfortunately did not come to a conclusion" — 「残念ながら」は原文にないが軽微 |
| business 50 | ⚠️ WARN | "regrettably failed to reach a conclusion" — 同上。businessの丁寧さとして許容 |
| business 75 | ⚠️ WARN | "Regrettably" — 同上 |
| business 100 | ⚠️ WARN | "It is with considerable regret" — 「結局」のニュアンスを「残念」に変換。過剰だが意味の核は維持 |

**文187: PASS 4 / WARN 6 / FAIL 3** 😟

**casualの「結論」→「wrap up/finish」シフトが問題**。「結局結論出なかった」の意味は「会議は行われたが結論に至らなかった」であり、「会議が終わらなかった」ではない。seed "didn't reach a conclusion" は正確だが、casual変換で "conclusion" が消えて "wrap up/finish" に置換されている。

また「結局」→「unfortunately/regrettably」変換がbusiness全レベルで発生。「結局」は諦め・事実報告のニュアンスであり、「残念ながら」とは異なるが、FAILまでには至らない。

---

### 文188:「ありがとう、気にかけてくれて。」
意図=感謝 / 動作の意味=care / 感情極性=positive

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "lookin' out" — reverse_translationが空。risk=highだがcaringのニュアンスは維持 |
| casual 50 | ✅ PASS | "watching out" — caring維持 |
| casual 75 | ✅ PASS | "lookin' out" — 25と同一 |
| casual 100 | ✅ PASS | "watchin' my back" — カジュアル表現として自然 |
| polite 25 | ✅ PASS | "I appreciate your concern" |
| polite 50 | ✅ PASS | "I am grateful for your concern" |
| polite 75 | ✅ PASS | "I appreciate your concern" — 25と同一だが意味OK |
| polite 100 | ⚠️ WARN | "deeply grateful" — 増幅だが感謝文なので許容 |
| business 25 | ✅ PASS | "I appreciate your concern" |
| business 50 | ✅ PASS | "I am grateful for your concern" |
| business 75 | ✅ PASS | "I appreciate your concern" |
| business 100 | ⚠️ WARN | "deeply grateful" — polite_100と同一 |

**文188: PASS 8 / WARN 3 / FAIL 0** 🎉

感謝 + caring の意味は全トーンで安定。pleasure_polarity_flip なし ✅

---

### 文189:「それ、噂だけ先行してる気がする。」
意図=報告 / 動作の意味=precede / 確信度=推測 / 感情極性=neutral

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "getting out of hand" — 「先行してる」→「手に負えなくなってる」はやや意味シフト。先行=事実より噂が先に広がる、out of hand=制御不能 |
| casual 50 | ❌ FAIL | **predicate_meaning_shift**: "getting out of control" — 「噂だけ先行」→「制御不能」。原文は噂が事実に先んじているという観察であり、「暴走している」ではない |
| casual 75 | ❌ FAIL | **stance_amplification + predicate_meaning_shift**: "totally getting out of control" — 同上 + 「totally」で増幅 |
| casual 100 | ❌ FAIL | **stance_amplification + predicate_meaning_shift**: "totally spiraling outta control" — spiral は暴走・悪化。原文にそのニュアンスなし |
| polite 25 | ✅ PASS | "the rumor is preceding the facts" — seed通り正確 |
| polite 50 | ✅ PASS | "the rumor is preceding the facts" |
| polite 75 | ✅ PASS | "the rumor is preceding the facts" |
| polite 100 | ⚠️ WARN | "It is evident" — 確信度=推測なのに「明白」は強すぎ。ただしFAILまでではない |
| business 25 | ✅ PASS | "rumor is somewhat premature" — 良い意訳 |
| business 50 | ✅ PASS | "ahead of its time" — ニュアンス微妙だが意味維持 |
| business 75 | ✅ PASS | "slightly ahead of its time" |
| business 100 | ✅ PASS | "slightly premature" |

**文189: PASS 7 / WARN 2 / FAIL 3** 😟

**casualで「先行」→「out of control/spiraling」への意味シフトが問題**。polite/businessでは "preceding the facts" / "premature" で正確に訳出。casual変換が英語イディオムに引きずられて意味を変えている。

---

### 文190:「今日は早めに切り上げたい。」
意図=願望 / 動作の意味=finish early / 願望=あり

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "looking to finish early" |
| casual 50 | ✅ PASS | "hoping to wrap up early" |
| casual 75 | ✅ PASS | "get outta here early" — カジュアル表現として自然 |
| casual 100 | ⚠️ WARN | "dyin' to get outta here" — 「切り上げたい」→「死ぬほど出たい」は増幅だがcasual_100の範囲 |
| polite 25 | ✅ PASS | "I'd like to finish early" |
| polite 50 | ✅ PASS | "I would appreciate finishing early" |
| polite 75 | ⚠️ WARN | "I would be grateful if we could wrap up" — 一人称の願望が依頼に変化（we could）|
| polite 100 | ⚠️ WARN | "conclude our proceedings at an earlier hour" — 過剰。"proceedings"は大袈裟 |
| business 25 | ✅ PASS | "looking to wrap up early" |
| business 50 | ✅ PASS | "would like to conclude early" |
| business 75 | ⚠️ WARN | "bring today's proceedings to a close ahead of schedule" — 過剰 |
| business 100 | ⚠️ WARN | "terminate today's proceedings prematurely" — "prematurely"はネガティブニュアンス。「早めに」とは異なる |

**文190: PASS 7 / WARN 5 / FAIL 0** 🎉

願望「〜したい」の維持は全トーンでOK。business_100の "prematurely" は「予定より早く中断する」というネガティブな含みがあり、原文の「早めに切り上げたい」とはニュアンスが違うが、FAIL判定まではいかない。

---

## Round 48 判定結果（文191-195）

### 文191:「その話、また今度にしよう。」
意図=提案 / モダリティ=提案 / 感情極性=neutral

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "discuss it another time" |
| casual 50 | ✅ PASS | "some other time" |
| casual 75 | ✅ PASS | "catch up on that later" |
| casual 100 | ✅ PASS | "catch up on that later, sound good?" |
| polite 25 | ✅ PASS | "discuss that at a later time" |
| polite 50 | ⚠️ WARN | "at a later juncture" — 冗長 |
| polite 75 | ⚠️ WARN | "might consider discussing" — 提案が曖昧になっている |
| polite 100 | ❌ FAIL | **ceremonial_framing + stance_shift**: "We would be well-advised to potentially deliberate on that subject at a subsequent juncture" — 「しよう」という軽い提案が重厚な審議提案に変質 |
| business 25 | ✅ PASS | "discuss that at a later time" |
| business 50 | ✅ PASS | "at a later date" |
| business 75 | ✅ PASS | "shall discuss that at a later date" |
| business 100 | ⚠️ WARN | "deliberate on that matter at a future juncture" — 過剰だが意味維持 |

**文191: PASS 8 / WARN 3 / FAIL 1** 

polite_100の "well-advised to potentially deliberate" は原文の軽い提案「しよう」から大きくかけ離れている。

---

### 文192:「今日、久々に外で食べた。」⭐ pleasure_polarity_flip テスト
意図=報告 / 感情極性=positive / 動作の意味=eat

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "finally eaten out" — 「久々に」→「やっと」は微ニュアンス差。「久々」は久しぶりの意味であり、待望していたとは限らない |
| casual 50 | ⚠️ WARN | "finally got to eat out" — 同上 |
| casual 75 | ❌ FAIL | **stance_amplification**: "chow down" + "!" — 原文は淡々とした報告。興奮表現は原文にない |
| casual 100 | ❌ FAIL | **stance_amplification**: "devour some grub outside today!!" — 「食べた」→「貪り食った」＋ダブル感嘆符。激しい増幅 |
| polite 25 | ✅ PASS | "dined outdoors...for the first time in quite a while" — 正確 |
| polite 50 | ❌ FAIL | **pleasure_polarity_flip**: "It was a pleasure to dine outdoors" — 報告が喜び表明に |
| polite 75 | ❌ FAIL | **pleasure_polarity_flip**: "a genuine pleasure to have dined" — 同上 + 強化 |
| polite 100 | ❌ FAIL | **pleasure_polarity_flip + ceremonial**: "an absolute delight...dine al fresco...considerable duration" — 🚨 完全な儀式化 |
| business 25 | ✅ PASS | "had the opportunity to eat outside" — 適切 |
| business 50 | ✅ PASS | "had the chance to dine outside" |
| business 75 | ⚠️ WARN | "It has been a while since I last had the opportunity" — 冗長だが意味維持 |
| business 100 | ⚠️ WARN | "availed myself of the opportunity" — 過剰だが pleasure flip なし |

**文192: PASS 3 / WARN 4 / FAIL 5** 😱

**文182と同じパターン再現！** positive感情 + 報告 → polite で pleasure/delight フレーミング発生。
- polite 50/75/100: pleasure_polarity_flip（3件）
- casual 75/100: stance_amplification（2件）

MEANING LOCK #12が効いていない。これで文172, 文182, 文192と3回連続でpositive報告文がpoliteでpleasure flipを起こしている。**確定的な再現パターン**。

---

### 文193:「悪いけど、そこは譲れない。」
意図=感想 / 動作の意味=yield / 感情極性=negative / 確信度=確定

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "not backing down" — 「譲れない」の意味維持 |
| casual 50 | ⚠️ WARN | "totally not backing down" — 「totally」は原文にないが casual として許容 |
| casual 75 | ✅ PASS | "not backing down, period" |
| casual 100 | ✅ PASS | "I'm good, I'm not backing down" |
| polite 25 | ✅ PASS | "must set a boundary" |
| polite 50 | ✅ PASS | "must regretfully draw a line" |
| polite 75 | ✅ PASS | "must draw the line" |
| polite 100 | ⚠️ WARN | "profound regret...establish a boundary" — 過剰。risk=medも妥当 |
| business 25 | ✅ PASS | "a point we cannot compromise on" — 適切 |
| business 50 | ✅ PASS | "unable to yield" |
| business 75 | ✅ PASS | "cannot yield" |
| business 100 | ✅ PASS | "concession is not feasible" — 硬いが意味正確 |

**文193: PASS 10 / WARN 2 / FAIL 0** 🎉

「悪いけど」→ "I'm sorry/regrettably/unfortunately" の対応が安定。「譲れない」の不可能性も全トーン維持。

---

### 文194:「正直、ちょっと納得いかない。」⭐ 程度テスト
程度=**none** ← 🚨「ちょっと」あるのにnone！

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "somewhat unconvinced" — 「ちょっと」を反映 |
| casual 50 | ✅ PASS | "still not totally sold" — 適切 |
| casual 75 | ✅ PASS | "kinda on the fence" — 「ちょっと」のニュアンス維持 |
| casual 100 | ⚠️ WARN | "super unsure" — 「ちょっと納得いかない」→「めっちゃ不安」は意味シフト。「納得いかない」≠「不安」|
| polite 25 | ✅ PASS | "somewhat skeptical" |
| polite 50 | ✅ PASS | "certain reservations" |
| polite 75 | ✅ PASS | "some reservations" |
| polite 100 | ✅ PASS | "harbor certain doubts" |
| business 25 | ✅ PASS | "not completely persuaded" |
| business 50 | ✅ PASS | "not entirely convinced" |
| business 75 | ✅ PASS | "certain reservations" |
| business 100 | ✅ PASS | "harbor certain misgivings" |

**文194: PASS 11 / WARN 1 / FAIL 0** 🎉

程度=noneにもかかわらず、翻訳自体は「ちょっと」を "somewhat/not totally/kinda" で反映できている。seedが "not really convinced" と適切だったため、トーン変換でも維持されたと思われる。**程度抽出は失敗しているが翻訳品質には影響なし**。

ただしcasual_100の "super unsure" は「納得いかない」→「不安」への意味シフト（unconvinced ≠ unsure）だが、程度維持はできているのでWARN止まり。

---

### 文195:「もし急ぎなら、先に対応する。」
意図=提案 / 条件マーカーあり / 動作の意味=respond

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "If you're in a rush, I'll go ahead and respond" — 条件維持 |
| casual 50 | ✅ PASS | "respond right away" |
| casual 75 | ✅ PASS | "shoot you a response ASAP" — カジュアル表現として自然 |
| casual 100 | ✅ PASS | "hook you up with a response pronto" |
| polite 25 | ✅ PASS | "If it's urgent, I will prioritize" |
| polite 50 | ✅ PASS | "I shall prioritize" |
| polite 75 | ⚠️ WARN | "accord the utmost priority" — 過剰 |
| polite 100 | ⚠️ WARN | "with the utmost haste" — 過剰だが条件+行動維持 |
| business 25 | ✅ PASS | "I will prioritize my response" |
| business 50 | ✅ PASS | "give priority to my response" |
| business 75 | ✅ PASS | "I shall prioritize" |
| business 100 | ✅ PASS | "requiring immediate attention...prioritize" |

**文195: PASS 10 / WARN 2 / FAIL 0** 🎉

条件マーカー「もし」→ "if" が全トーンで維持。「先に対応」→ "prioritize/respond first" も安定。

---

## Round 49 判定結果（文196-200）

### 文196:「それは今の状況だと難しい。」
意図=報告 / 動作の意味=be difficult / 感情極性=negative / 程度=none

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "tough right now" — reverse_translationが空、risk=high。意味自体はOK |
| casual 50 | ⚠️ WARN | "pretty tough" — 「かなり」は原文にない。軽い増幅 |
| casual 75 | ⚠️ WARN | "super tough" — 同上。casual_75として許容範囲 |
| casual 100 | ⚠️ WARN | "hella tough rn" — 同上 |
| polite 25 | ✅ PASS | "presents challenges" |
| polite 50 | ⚠️ WARN | "significant challenges" — 原文に「significant」に相当する語なし。程度増幅 |
| polite 75 | ⚠️ WARN | "considerable difficulties" — 同上 |
| polite 100 | ❌ FAIL | **stance_amplification**: "fraught with significant challenges" — 「難しい」→「重大な困難に満ちている」。原文は素朴な「難しい」であり、困難に「満ちている」わけではない |
| business 25 | ✅ PASS | "presents some challenges" — 「some」が適切な緩和 |
| business 50 | ✅ PASS | "poses certain difficulties" |
| business 75 | ⚠️ WARN | "considerable challenges" — risk=med。polite_75と同様の増幅 |
| business 100 | ⚠️ WARN | "significant challenges" — polite_50と同様 |

**文196: PASS 3 / WARN 8 / FAIL 1**

程度=none（原文に程度修飾なし）なのに、polite/businessの高レベルで "significant/considerable/fraught" と増幅される。polite_100は「難しい」→「困難に満ちている」で意味が変わりFAIL。

---

### 文197:「今日の資料、最新版に差し替えた。」
意図=報告 / 動作の意味=replace / 感情極性=neutral

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "updated...to the latest version" |
| casual 50 | ✅ PASS | "I've updated" |
| casual 75 | ✅ PASS | "gone ahead and updated" |
| casual 100 | ⚠️ WARN | 75%と完全同一。差分なし |
| polite 25 | ✅ PASS | "I have updated" |
| polite 50 | ✅ PASS | "I have updated" — 25%と同一だがOK |
| polite 75 | ✅ PASS | "accordingly" が追加。適切 |
| polite 100 | ✅ PASS | "taken the liberty of updating" — 丁寧表現として自然 |
| business 25 | ✅ PASS | "I have updated" |
| business 50 | ✅ PASS | polite_50と同一 |
| business 75 | ✅ PASS | "accordingly" |
| business 100 | ✅ PASS | "formally updated" — 報告として適切 |

**文197: PASS 11 / WARN 1 / FAIL 0** 🎉

「差し替えた」→ "updated/replaced" の意味が全トーンで安定。非常に良い結果。

---

### 文198:「ありがとう、確認ありがとう。」
意図=感謝 / 動作の意味=confirm / 感情極性=positive

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "Thanks a lot for checking" |
| casual 50 | ✅ PASS | "Thanks so much" |
| casual 75 | ✅ PASS | "Thanks a ton for checking in!" |
| casual 100 | ✅ PASS | "Big thanks for lookin' in!" |
| polite 25 | ✅ PASS | "I appreciate you confirming" |
| polite 50 | ✅ PASS | "express my gratitude for confirming" |
| polite 75 | ⚠️ WARN | "deeply grateful for having confirmed" — 文法やや不自然（"for having confirmed"の主語が曖昧）|
| polite 100 | ⚠️ WARN | "most sincerely grateful to have had the opportunity to confirm" — 過剰。「確認してくれて」が「確認する機会を得て」に変化 |
| business 25 | ✅ PASS | "Thank you very much for confirming" |
| business 50 | ✅ PASS | "I appreciate your confirmation" |
| business 75 | ✅ PASS | "I am grateful for your confirmation" |
| business 100 | ✅ PASS | "sincere appreciation for your confirmation" |

**文198: PASS 10 / WARN 2 / FAIL 0** 🎉

感謝文。pleasure_polarity_flip なし ✅（感謝の文脈ではpleasure表現が自然なので問題になりにくい）

---

### 文199:「それ、たぶん誤解されてる。」
意図=報告 / 動作の意味=なし / 確信度=推測 / 感情極性=neutral

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ✅ PASS | "might be a misunderstanding" — 推測維持 |
| casual 50 | ✅ PASS | "Might be a miscommunication" |
| casual 75 | ✅ PASS | "Could be a miscommunication, maybe?" |
| casual 100 | ✅ PASS | "idk" — カジュアル推測表現として自然 |
| polite 25 | ✅ PASS | "I believe there may be" — 推測維持 |
| polite 50 | ✅ PASS | "It appears that there could be" |
| polite 75 | ⚠️ WARN | "quite possible that...could occur" — 「誤解されてる」（既に発生）→「発生する可能性」に時制変化 |
| polite 100 | ⚠️ WARN | "highly plausible...may transpire" — 同上。「されてる」が未来形に |
| business 25 | ✅ PASS | "there's been a miscommunication" — 過去形で正確 |
| business 50 | ✅ PASS | "possibility of miscommunication" |
| business 75 | ⚠️ WARN | "potential for miscommunication" — 75と同じ時制問題 |
| business 100 | ✅ PASS | "there may be a possibility" |

**文199: PASS 9 / WARN 3 / FAIL 0** 🎉

確信度=推測の "may/might/could" が安定維持。polite高レベルで「既に誤解されている」→「誤解が起こりうる」への時制シフトがあるがWARN止まり。

---

### 文200:「今日はもう寝たい。」⭐ 最終文
意図=願望 / 動作の意味=want to sleep / 願望=あり / 感情極性=positive

| tone | % | 判定 | 理由 |
|------|---|------|------|
| casual 25 | ⚠️ WARN | "gonna take a nap" — 「寝たい」（願望）→「寝る」（意思）に変化。願望ニュアンスが弱い |
| casual 50 | ⚠️ WARN | "going to take a nap" — 同上 |
| casual 75 | ⚠️ WARN | "gonna take a snooze" — 同上 + nap=昼寝であり「寝る」とは微妙に違う |
| casual 100 | ⚠️ WARN | "catch some Z's" — 同上。ただしカジュアル表現として自然 |
| polite 25 | ✅ PASS | "I'd like to sleep now, please" — 願望維持 |
| polite 50 | ✅ PASS | "I would appreciate it if I could sleep" |
| polite 75 | ✅ PASS | "I would be grateful if I could retire" |
| polite 100 | ❌ FAIL | **pleasure_polarity_flip + ceremonial**: "It would be my greatest pleasure if I might retire to my slumber immediately" — 「寝たい」→「眠りにつくことが至上の喜び」。pleasure flip典型例 |
| business 25 | ⚠️ WARN | "take a nap right now" — 「寝る」→「昼寝」は微妙。ただし文脈次第 |
| business 50 | ⚠️ WARN | "appreciate taking a nap" — 同上 |
| business 75 | ✅ PASS | "grateful if I could take a nap" |
| business 100 | ⚠️ WARN | "afforded the opportunity to take a nap" — 過剰だが pleasure flip なし |

**文200: PASS 4 / WARN 7 / FAIL 1**

**polite_100でpleasure_polarity_flip発生**。「寝たい」（疲労による願望）が「greatest pleasure」（至上の喜び）に。

casualの「寝たい」→「寝る」変換は、願望を意思に変えている（want to → going to）がFAILまでではない。

---

## R47-R49 総合サマリ

### ラウンド別集計

| Round | 文 | PASS | WARN | FAIL | 計 |
|-------|-----|------|------|------|----|
| R47 | 文186-190 | 35 | 19 | 6 | 60 |
| R48 | 文191-195 | 42 | 12 | 6 | 60 |
| R49 | 文196-200 | 37 | 21 | 2 | 60 |
| **合計** | | **114** | **52** | **14** | **180** |

### 文別集計

| 文 | PASS | WARN | FAIL | 主な問題 |
|----|------|------|------|----------|
| 文186 | 9 | 3 | 0 | — |
| 文187 | 4 | 6 | 3 | predicate_meaning_shift (casual) |
| 文188 | 8 | 3 | 0 | — |
| 文189 | 7 | 2 | 3 | predicate_meaning_shift (casual) |
| 文190 | 7 | 5 | 0 | — |
| 文191 | 8 | 3 | 1 | ceremonial_framing (polite_100) |
| 文192 | 3 | 4 | 5 | pleasure_polarity_flip + stance_amplification |
| 文193 | 10 | 2 | 0 | — |
| 文194 | 11 | 1 | 0 | — |
| 文195 | 10 | 2 | 0 | — |
| 文196 | 3 | 8 | 1 | stance_amplification (polite_100) |
| 文197 | 11 | 1 | 0 | — |
| 文198 | 10 | 2 | 0 | — |
| 文199 | 9 | 3 | 0 | — |
| 文200 | 4 | 7 | 1 | pleasure_polarity_flip (polite_100) |

### FAIL パターン内訳（14件）

| パターン | 件数 | 該当文 |
|---------|------|--------|
| predicate_meaning_shift | 6 | 文187 casual(3), 文189 casual(3) |
| pleasure_polarity_flip | 4 | 文192 polite(3), 文200 polite_100(1) |
| stance_amplification | 3 | 文189 casual(重複カウント含む), 文192 casual(2), 文196 polite_100(1) |
| ceremonial_framing | 1 | 文191 polite_100(1) |

### PASS+WARN率

| Round | PASS+WARN率 |
|-------|-------------|
| R47 | 90% (54/60) |
| R48 | 90% (54/60) |
| R49 | 97% (58/60) |
| **R47-R49平均** | **92% (166/180)** |

### 重要な発見

**1. pleasure_polarity_flip は確定再現パターン**
- 文172 (R43) → 文182 (R46) → 文192 (R48) → 文200 (R49)
- **positive感情 + 報告** の組み合わせでpoliteが "pleasure/delight" を生成
- MEANING LOCK #12は効いていない
- 感謝文（文188, 文198）ではpleasure flipが起きない → **報告文特有**

**2. casual の predicate_meaning_shift は新パターン**
- 文187:「結論出なかった」→「終わらなかった」(wrap up/finish)
- 文189:「先行してる」→「制御不能」(out of control)
- casualトーン変換時に英語イディオムに引きずられて述語の意味が変わる
- polite/businessでは同じ文でも正確に訳出されている
- **casualトーン変換プロンプトの問題**の可能性

**3. 程度抽出はまだ不安定**
- 文194「ちょっと」→ none（構造解析の失敗）
- ただし翻訳品質には影響なかった（seedが適切だったため）

**4. 高レベル(75-100)での過剰表現はWARN集中地帯**
- polite_100, business_100 で頻繁にWARN
- "proceedings", "juncture", "fraught" など大袈裟な語彙
- 意味は維持されているのでFAILではないが、自然さの問題

---

## フェーズ2に向けた弱点テストセット候補

### 確定パターン（再現性あり・修正必要）

**P1: pleasure_polarity_flip**（最優先）
- トリガー: positive感情 + 報告 + polite
- 対象文: 文172, 文182, 文192, 文200
- テスト基準: polite 50/75/100 で "pleasure/delight/honor" が出なくなること

**P2: casual predicate_meaning_shift**（新発見）
- トリガー: 抽象的な日本語表現のcasual変換
- 対象文: 文187 (結論出なかった→終わらなかった), 文189 (先行→制御不能)
- テスト基準: seed の核心述語がcasualでも維持されること

**P3: 程度抽出 (ちょっと→none)**
- トリガー: 「ちょっと」「少し」を含む文
- 対象文: 文176, 文182, 文194
- テスト基準: 程度=slight で抽出されること

### API揺れの可能性あり（統計検証が必要）

- stance_amplification（casual高レベル）
- ceremonial_framing（polite_100単発）
- 高レベルでの過剰表現（WARN集中）
