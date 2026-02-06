# Step 5.5 v2 Round 1 Judgments (C-mode Manual)

- 判定方式: C（こでくんが全24出力を読んで判定）
- 判定API呼び出し: なし

## 101. 朝からコーヒーこぼして最悪だった。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach
- Reason: polite/businessの高トーン(75-100%)で英語・逆翻訳が過剰に儀礼化し、自然な日常文から離れる。

## 102. それって前に話してた件？
- Overall: PASS
- Checks: structure=PASS, naturalness=PASS, tone_difference=PASS
- Pattern tags: stable_question_modality
- Reason: 疑問文・確認のmodalityを維持し、トーン差も十分。

## 103. 悪いけど、今日中にこれ対応してもらえる？
- Overall: WARN
- Checks: structure=WARN, naturalness=PASS, tone_difference=PASS
- Pattern tags: apology_drop
- Reason: 原文の謝罪ニュアンス（「悪いけど」）が複数出力で脱落。依頼構造は保持。

## 104. なんかちょっとモヤっとするんだよね。
- Overall: FAIL
- Checks: structure=WARN, naturalness=FAIL, tone_difference=PASS
- Pattern tags: discomfort_semantic_drift, over_intensification
- Reason: 「モヤっとする」が一部で「気持ち悪い」等にずれ、曖昧な違和感→身体的不調へ意味が変質。文法不自然な出力も混在。
- FAIL detail: casual50で「モヤっとする」→「気持ち悪い」へ意味がずれ、違和感（曖昧）から身体症状（明示）へ変質。
- FAIL detail: casual100で英語の強調が過剰で、原文の弱い含みを超える。

## 105. もし間に合わなければ、先に共有だけでいいよ。
- Overall: WARN
- Checks: structure=WARN, naturalness=PASS, tone_difference=PASS
- Pattern tags: conditional_action_drift
- Reason: 条件文は維持されるが、business100で「共有」→「知らせる」に行為が変化。

## 106. 正直、その説明だと判断できない。
- Overall: WARN
- Checks: structure=WARN, naturalness=PASS, tone_difference=PASS
- Pattern tags: inability_to_request_shift
- Reason: 「判断できない（能力不足）」がbusiness高トーンで「追加説明の依頼」へ寄る出力がある。

## 107. 今日の会議、開始時間変わったから注意ね。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=WARN
- Pattern tags: over_formal_overreach, tone_jump_excess
- Reason: 高トーンで過剰な儀礼表現が入り、通知文として不自然。トーン勾配も急峻。

## 108. ありがとう、ちゃんと確認した。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: detail_loss, over_formal_overreach
- Reason: 「気づいてくれて」の要素が複数出力で消える。formal100は不自然に誇張。

## 109. それ、たぶん勘違いされてると思う。
- Overall: FAIL
- Checks: structure=FAIL, naturalness=WARN, tone_difference=PASS
- Pattern tags: certainty_flip, accusation_shift
- Reason: 推測的な「勘違いされてると思う」が、casual100で断定的な直接非難（You are wrong）に変化し確信度・対人トーンが崩壊。
- FAIL detail: casual100「You're totes wrong about that」で、推測（I think / maybe）が断定非難に反転。
- FAIL detail: 対人距離とmodalityが「確認/推測」から「断定指摘」へ変化。

## 110. 今日は外に出る気力ない。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: emotional_polarity_softened, over_formal_overreach
- Reason: 否定構造は維持されるが、高トーンで不自然に丁重・冗長化。

## 111. その件、まだ調整中らしい。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: hearsay_marker_drop, over_formal_overreach
- Reason: 伝聞「らしい」がbusiness系で情報源不明の断定寄り表現に弱化する出力がある。

## 112. それって誰が決めたの？
- Overall: PASS
- Checks: structure=PASS, naturalness=PASS, tone_difference=PASS
- Pattern tags: stable_question_modality
- Reason: 「誰が決めたか」の質問意図を安定して維持。

## 113. ごめん、今ちょっと集中したい。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: modality_soft_shift, over_formal_overreach
- Reason: 「集中したい」の自己要望が一部で許可依頼・婉曲依頼に寄る。formal高トーンは不自然。

## 114. 今日は久しぶりにゆっくりできた。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: tense_aspect_drift, over_formal_overreach
- Reason: 過去完了の経験談が現在進行/一般論に揺れる出力がある。高トーンで冗長化。

## 115. もし問題なければ、その方向で進めよう。
- Overall: WARN
- Checks: structure=PASS, naturalness=PASS, tone_difference=WARN
- Pattern tags: tone_gradient_flatten
- Reason: 条件・提案構造は維持。ただしcasual75と100の差分が小さくトーン勾配が平坦。

## 116. 正直、もう少し説明ほしい。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: register_mismatch, politeness_overshoot
- Reason: 「説明ほしい」が一部で強い命令調に寄る。polite100は逆翻訳が不自然（謝意化）。

## 117. 今日の資料、あとで送ります。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=WARN
- Pattern tags: temporal_detail_drop, tone_gradient_flatten
- Reason: 「今日」の時間情報や確定性が弱まる出力あり。casual50/75が近く差分不足。

## 118. ありがとう、気づいてくれて助かった。
- Overall: WARN
- Checks: structure=WARN, naturalness=PASS, tone_difference=PASS
- Pattern tags: detail_loss
- Reason: 「気づいてくれて」の根拠が薄れ、単なる感謝に簡略化される出力が多い。

## 119. それ、前にも似た話あったよね。
- Overall: PASS
- Checks: structure=PASS, naturalness=PASS, tone_difference=PASS
- Pattern tags: stable_reference_question
- Reason: 既往参照+確認疑問の構造を維持。

## 120. 今日はなんか調子出ない。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: grammar_degradation, over_formal_overreach
- Reason: casual100に文法崩れ（I'm feelin' super crap）。polite高トーンで過度に医療報告調。
