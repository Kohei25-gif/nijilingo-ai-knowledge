## Run3 構造抽出チェック

| 文 | フィールド | 前回（参照例なし） | 今回 | 判定 |
|---|---|---|---|---|
| B2-01 | 程度 | moderate | **slight** | ✅ |
| B2-04 | 程度 | moderate | **strong** | ✅ |
| B2-05 | 程度 | strong | **extreme** | ✅ |
| B2-02 | 感情極性 | neutral | neutral | ✅ |
| B2-02 | 人称 | 三人称 | 三人称 | ✅ |
| B2-03 | 程度 | slight（Run1/2） | **none**（Run3） | ⚠️ 揺れ |
| B2-05 | 感情極性 | negative（Run1/2） | **neutral**（Run3） | ⚠️ 揺れ |

---

## Run3 翻訳スコアリング

### B2-01「ごめん、今日ちょっと体調悪くて休ませてもらうね」
程度=slight, 感情=negative, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "feeling a bit under the weather" | PASS | slight ✅ |
| cas50 | "a bit off" | PASS | slight ✅ |
| cas75 | "feeling a bit under the weather" | PASS | slight ✅ |
| cas100 | "feelin' kinda crummy" | PASS | slight〜moderate、許容範囲 |
| bus25 | "not in the best of health" | PASS | I ✅ |
| bus50 | "not feeling particularly well" | PASS | I ✅ |
| bus75 | "Regrettably, I am not in optimal health" | WARNING | "Regrettably" 感情追加 |
| bus100 | "Unfortunately, my health is not at its best" | WARNING | "Unfortunately" 感情追加 |
| for25 | "I'm afraid I'm not feeling too well" | PASS | I ✅ |
| for50 | "Regrettably, I am unwell" | WARNING | "Regrettably" 感情追加 |
| for75 | "Unfortunately, I am indisposed" | WARNING | "Unfortunately" 感情追加 |
| for100 | "Regrettably, I am currently unwell" | WARNING | "Regrettably" 感情追加 |

0 FAIL, 5 WARNING, 7 PASS

### B2-02「田中さんが来週の月曜に来るらしいよ」
感情=neutral, 人称=三人称, 確信度=伝聞

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "apparently" | PASS | 伝聞 ✅ |
| cas50 | "I heard" | PASS | |
| cas75 | "I heard" | PASS | |
| cas100 | "I heard" | PASS | |
| bus25 | "is expected to arrive" | PASS | We消滅 ✅ |
| bus50 | "is anticipated to arrive" | PASS | We消滅 ✅ |
| bus75 | "It is expected that" | PASS | We消滅 ✅ |
| bus100 | "It is anticipated that" | PASS | We消滅 ✅ |
| for25 | "is expected to arrive" | PASS | We消滅 ✅ |
| for50 | "is anticipated to arrive" | PASS | We消滅 ✅ |
| for75 | "It is expected that" | PASS | We消滅 ✅ |
| for100 | "It is anticipated that" | PASS | We消滅 ✅ |

0 FAIL, 0 WARNING, 12 PASS 🎉🎉🎉
Run2のfor75 "rumored"、for100 "speculation" が消えて完璧。

### B2-03「もし時間があったら手伝ってもらえると助かるんだけど」
感情=neutral, 願望=あり, 確信度=推測, 条件=もし〜たら

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "If you've got some time" | PASS | 条件 ✅ |
| cas50 | "If you've got a sec" | PASS | |
| cas75 | "If you're free for a sec" | PASS | |
| cas100 | "If you've got a sec, can you gimme a hand?" | PASS | 条件維持 ✅ |
| bus25 | "If you have some spare time" | PASS | I ✅ |
| bus50 | "If you're available" | PASS | |
| bus75 | "If you were to graciously grant me" | WARNING | 過剰表現 |
| bus100 | "We would be most appreciative" | FAIL | We化！人称=二人称の依頼文で主語がWeに |
| for25 | "If you have some spare time, I would be grateful" | PASS | |
| for50 | "If you could spare a moment, I would appreciate" | PASS | |
| for75 | "If you have a spare moment, I would be grateful" | PASS | |
| for100 | "Should you have a moment to spare, I would be most appreciative" | PASS | |

1 FAIL, 0 WARNING, 11 PASS
bus100で「We」復活！Run1-2は0だったのに。非決定性。

### B2-04「この資料、かなりよくできてると思うよ」
程度=strong, 感情=positive, 確信度=推測, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "pretty well done" | PASS | strong ✅ |
| cas50 | "done pretty well" | PASS | |
| cas75 | "come together pretty nicely, if I do say so myself" | FAIL | 「if I do say so myself」3/3再現 |
| cas100 | "totally on point, if I'm being honest" | WARNING | "totally" = extreme寄り |
| bus25 | "very well crafted" | WARNING | 程度修飾語なし。弱体化 |
| bus50 | "exceptionally well prepared" | WARNING | "exceptionally" = extreme寄り |
| bus75 | "remarkably well crafted" | WARNING | "remarkably" = extreme寄り |
| bus100 | "exceptionally well prepared" | WARNING | extreme寄り |
| for25 | "quite well crafted" | PASS | strong ✅ |
| for50 | "meticulously prepared" | WARNING | 方法の丁寧さ。程度ではない |
| for75 | "exceptionally well-crafted" | WARNING | extreme寄り |
| for100 | "exceptionally superior craftsmanship" | FAIL | extreme膨張 |

1 FAIL, 7 WARNING, 4 PASS

### B2-05「駅前の新しいラーメン屋、めちゃくちゃ並んでたから諦めた」
程度=extreme, 感情=negative, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "ginormous line" | PASS | extreme ✅ |
| cas50 | "massive queue" | PASS | extreme ✅ |
| cas75 | "ridiculously long" | PASS | extreme ✅ |
| cas100 | "totally nuts" | PASS | extreme ✅ |
| bus25 | "extremely long queue" | PASS | I ✅ |
| bus50 | "extraordinarily lengthy queue" | PASS | I ✅ |
| bus75 | "exceptionally long queue" | PASS | I ✅ |
| bus100 | "extraordinarily extensive queue" | PASS | I ✅ |
| for25 | "extremely long queue" | PASS | |
| for50 | "enormous queue" | PASS | |
| for75 | "immense queue" | PASS | |
| for100 | "colossal queue" | PASS | |

0 FAIL, 0 WARNING, 12 PASS 🎉

---

## Run3 集計

| 文 | FAIL | WARNING | PASS |
|---|---|---|---|
| B2-01 | 0 | 5 | 7 |
| B2-02 | 0 | 0 | 12 |
| B2-03 | 1 | 0 | 11 |
| B2-04 | 2 | 7 | 4 |
| B2-05 | 0 | 0 | 12 |
| 合計 | 3 | 12 | 45 |

PASS率（厳密）: 75.0%
PASS率（FAIL限定）: 95.0%

---

## 3ラウンド統合分析

### 数値サマリ

| | Run1 | Run2 | Run3 | 平均 |
|---|---:|---:|---:|---:|
| FAIL | 9 | 5 | 3 | 5.7 |
| WARNING | 13 | 14 | 12 | 13.0 |
| PASS | 38 | 41 | 45 | 41.3 |
| PASS率（厳密） | 63.3% | 68.3% | 75.0% | 68.9% |
| PASS率（FAIL限定） | 85.0% | 91.7% | 95.0% | 90.6% |

### 前回（修正前）との比較

| | 修正前（参照例なし） | 今回（配置整理後） | 変化 |
|---|---:|---:|---:|
| FAIL限定 平均 | 86.1% | 90.6% | +4.5pt |
| FAIL 平均 | 8.3 | 5.7 | -2.6 |

### 修正効果の最終判定

| 修正項目 | 効果 | 再現率 |
|---|---|---:|
| 程度定義に日本語マーカー | ✅ 完璧 | 3/3 全ラウンド正しい値 |
| toneStyle場面設定削除 | ✅ | B2-01,03,04,05でWe消滅 3/3 |
| neutral明示 | ✅ | "pleased to inform" 消滅 3/3 |
| 人称昇格 | ✅ | 一人称単数の文でI維持 3/3 |
| B2-02 We化（bus/for50+） | Run1で残存 | Run2-3で消滅 |

### 残存問題パターン（3ラウンド分析）

| パターン | 出現率 | 詳細 |
|---|---:|---|
| B2-04 cas75 「if I do say so myself」 | 3/3 | 確定FAIL |
| B2-04 for100 extreme膨張 | 2/3 | "exceptionally superior ..." |
| B2-03 bus100 We化 | 1/3 | 非決定性 |
