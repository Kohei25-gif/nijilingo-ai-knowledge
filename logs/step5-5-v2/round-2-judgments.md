# Step 5.5 v2 Round 2 Judgments (C-mode Manual)

- 判定方式: C（こでくんが全24出力/文を読んで判定）
- 判定API呼び出し: なし

## 121. その話、今ここでする必要ある？
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, modality_soft_shift
- Reason: 必要性を問う疑問は維持されるが、polite/business高トーンで「儀礼的な依頼文」へ寄りすぎる。

## 122. 今日は在宅に変更するね。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, emotional_overintensification
- Reason: 在宅勤務への変更は維持。ただし高トーンで「光栄・喜び」など不要な感情増幅が混入。

## 123. 悪いけど、これ優先でお願い。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: apology_drop, over_formal_overreach
- Reason: 優先依頼は維持されるが、「悪いけど」の謝罪ニュアンスが複数出力で弱化/脱落。

## 124. 正直、ちょっと期待してた。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, register_mismatch
- Reason: 意味は概ね維持。ただし高トーンで不自然な語彙・文体（過剰な格式語）になる。

## 125. もし雨止んだら、散歩行こうかな。
- Overall: FAIL
- Checks: structure=FAIL, naturalness=WARN, tone_difference=PASS
- Pattern tags: conditional_modality_shift, certainty_upshift
- Reason: 原文の「条件付き・自分の控えめな意向」が、business/politeで「提案・高確度見込み」へ変質。
- FAIL detail: 「行こうかな」のtentativeが、複数出力で提案/通達モードに置換。
- FAIL detail: 「止んだら」の条件は維持するが、確信度が不必要に上がる。

## 126. それはさすがに無理があると思う。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: detail_loss, over_formal_overreach
- Reason: コア判断は残るが、一部出力（polite-50）が内容を短く落として根拠ニュアンスが薄れる。

## 127. 今日の進捗、簡単にまとめておいた。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach
- Reason: 進捗報告は保持。高トーンで「報告できて嬉しい」系の過剰儀礼が混入。

## 128. ありがとう、後で確認する。
- Overall: FAIL
- Checks: structure=FAIL, naturalness=WARN, tone_difference=PASS
- Pattern tags: subject_action_flip, gratitude_to_request_shift
- Reason: 原文は「感謝 + 自分が後で確認」。business 75/100で「相手に確認してほしい」へ主語/行為が反転。
- FAIL detail: business-100で self-action が listener-request に変化。
- FAIL detail: 感謝文の中心が依頼文へ変質。

## 129. それ、聞いた話だと違うみたい。
- Overall: WARN
- Checks: structure=WARN, naturalness=PASS, tone_difference=PASS
- Pattern tags: hearsay_marker_drop
- Reason: casual/politeでは伝聞が残る一方、business系列で「聞いた話」マーカーが抜ける出力あり。

## 130. 今日は早く寝るつもり。
- Overall: FAIL
- Checks: structure=FAIL, naturalness=FAIL, tone_difference=PASS
- Pattern tags: action_domain_shift, grammar_degradation
- Reason: 「早く寝る」が一部で「早めに退社する」にドリフト。casual-25英語も不自然（I'm gonna bed early）。
- FAIL detail: sleep plan が work-leaving action に置換される出力を確認。

## 131. その件、もう一回整理したほうがよさそう。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, modality_soft_shift
- Reason: 再整理提案は維持されるが、許可依頼/丁重依頼へ寄り、助言の距離感がぶれる。

## 132. それって今決めないとダメ？
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, question_modality_soft_shift
- Reason: 疑問の芯は維持されるが、polite高トーンで説明要求文・儀礼説明に過剰変形。

## 133. ごめん、今日は頭が回らない。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: apology_drop, over_formal_overreach
- Reason: 「ごめん」の謝罪が薄れやすく、高トーンで医学報告調に硬直。

## 134. 久しぶりにあの店行ったけど、やっぱ良かった。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, register_mismatch
- Reason: 再訪の好評価は維持。ただしpolite/business高トーンで日常回想から逸脱。

## 135. もし余裕あれば、これも見てほしい。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: request_strength_shift, over_intensification
- Reason: 条件付き依頼は残るが、casual高トーンで命令口調/誇張が強まりすぎる。

## 136. 正直、その案は微妙かも。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: certainty_upshift, nuance_hardening
- Reason: 原文の「微妙かも（低確度・弱い否定）」が、強否定（super sketchy）へ硬化する出力あり。

## 137. 今日の打ち合わせ、結論だけ共有します。
- Overall: WARN
- Checks: structure=PASS, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach
- Reason: 「結論だけ共有」は保持されるが、高トーンで儀礼化して実務文として重い。

## 138. ありがとう、すごく助かる。
- Overall: FAIL
- Checks: structure=FAIL, naturalness=WARN, tone_difference=PASS
- Pattern tags: gratitude_to_request_shift, modality_flip
- Reason: 感謝の表明が、polite 75/100で「支援依頼」へ反転する出力を確認。
- FAIL detail: gratitude statement -> assistance request へのモダリティ反転。

## 139. それ、噂レベルの話じゃない？
- Overall: PASS
- Checks: structure=PASS, naturalness=PASS, tone_difference=PASS
- Pattern tags: stable_rumor_question
- Reason: 「噂レベルか」という疑問構造と低確度ニュアンスを概ね維持。

## 140. 今日は何もしたくない日。
- Overall: WARN
- Checks: structure=WARN, naturalness=WARN, tone_difference=PASS
- Pattern tags: over_formal_overreach, emotional_intensification_drift
- Reason: 基本意味は保持するが、polite-100で「特別な日」など原文にない意味が混入。
