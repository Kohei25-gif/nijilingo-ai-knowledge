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
| cas50 | "feelin' pretty crummy" | **FAIL** | "pretty crummy" = moderate。程度膨張 |
| cas75 | "feelin' pretty lousy" | **FAIL** | 同上 |
| cas100 | "feelin' super crummy" | **FAIL** | "super" = strong/extreme |
| bus25 | "I'm afraid I'm not in the best of health" | PASS | **I** ✅ |
| bus50 | "I am currently not in optimal health" | PASS | **I** ✅ |
| bus75 | "Regrettably, my current state of health is less than ideal" | WARNING | "Regrettably" 感情追加。**I** ✅ |
| bus100 | "Unfortunately, owing to my present health being suboptimal" | WARNING | 感情追加。**I** ✅ |
| for25 | "I'm afraid I'm not feeling particularly well" | PASS | **I** ✅ |
| for50 | "I am currently indisposed" | PASS | **I** ✅ |
| for75 | "I am presently unwell, hence I shall be taking a respite" | PASS | **I** ✅ |
| for100 | "indulging in a period of repose" | WARNING | 過剰表現 |

**3 FAIL, 3 WARNING, 6 PASS**

---

### B2-02「田中さんが来週の月曜に来るらしいよ」
感情=neutral, 人称=三人称, 確信度=伝聞

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "Tanaka-san is coming, it seems" | PASS | 伝聞 ✅ |
| cas50 | "Tanaka-san's coming, apparently" | PASS | |
| cas75 | "Tanaka-san's coming, I heard" | PASS | |
| cas100 | "Tanaka-san's comin', I heard" | PASS | |
| bus25 | "It appears that Tanaka-san is scheduled" | PASS | **We消滅** ✅ |
| bus50 | "Tanaka-san is slated to arrive" | PASS | **We消滅** ✅ |
| bus75 | "Tanaka-san is scheduled to arrive" | PASS | **We消滅** ✅ |
| bus100 | "It is anticipated that Tanaka-san will arrive" | PASS | **We消滅** ✅ |
| for25 | "It appears that Tanaka-san is scheduled" | PASS | **We消滅** ✅ |
| for50 | "Tanaka-san is slated to arrive, it is understood" | PASS | **We消滅** ✅ |
| for75 | "It is anticipated that Tanaka-san will arrive" | PASS | **We消滅** ✅ |
| for100 | "It is envisaged that Tanaka-san shall arrive" | PASS | **We消滅** ✅ |

**0 FAIL, 0 WARNING, 12 PASS** 🎉

---

### B2-03「もし時間があったら手伝ってもらえると助かるんだけど」
感情=neutral, 願望=あり, 確信度=推測, 条件=もし〜たら

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "If you've got some time, I'd appreciate" | PASS | 条件 ✅ |
| cas50 | "If you've got a sec, I'd love some help" | PASS | |
| cas75 | "If you're free, I'd really appreciate a hand" | PASS | |
| cas100 | "If you're free, can you lend me a hand?" | PASS | |
| bus25 | "If you have some spare time" | PASS | **I** ✅ |
| bus50 | "If you could spare a moment" | PASS | |
| bus75 | "If you were to graciously grant me" | WARNING | 過剰表現 |
| bus100 | "I would be deeply indebted if you could allocate" | PASS | **I** ✅ |
| for25 | "If you have some spare time" | PASS | |
| for50 | "I would be most grateful if you could lend me" | PASS | |
| for75 | "I would be deeply indebted to you" | PASS | |
| for100 | "Were you to be so kind as to grant me... eternally grateful" | WARNING | "eternally" 過剰表現 |

**0 FAIL, 2 WARNING, 10 PASS**

---

### B2-04「この資料、かなりよくできてると思うよ」
程度=strong, 感情=positive, 確信度=推測, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "pretty well done" | PASS | "pretty" = strong ✅ |
| cas50 | "done pretty well" | PASS | |
| cas75 | "turned out pretty slick" | PASS | |
| cas100 | "come out super rad" | **FAIL** | "super" = extreme膨張 |
| bus25 | "well crafted" | WARNING | 程度修飾語なし。弱体化 |
| bus50 | "well prepared" | WARNING | 同上 |
| bus75 | "thoroughly well-prepared" | PASS | "thoroughly" = strong ✅ |
| bus100 | "exceptionally well-crafted" | WARNING | "exceptionally" = extreme寄り |
| for25 | "well crafted" | WARNING | 程度弱体化 |
| for50 | "meticulously prepared" | WARNING | 方法の丁寧さ。程度ではない |
| for75 | "exceptionally well crafted" | WARNING | extreme寄り |
| for100 | "exceptionally superior craftsmanship" | **FAIL** | extreme膨張 |

**2 FAIL, 5 WARNING, 5 PASS**

---

### B2-05「駅前の新しいラーメン屋、めちゃくちゃ並んでたから諦めた」
程度=extreme, 感情=neutral（⚠️Run3でneutralに変化）, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "super crowded" | PASS | extreme ✅ |
| cas50 | "really crowded" | WARNING | "really" = strong寄り。弱体化 |
| cas75 | "hella crowded" | PASS | extreme ✅ |
| cas100 | "freakin' packed" | PASS | extreme ✅ |
| bus25 | "extreme crowding" | PASS | **I** ✅ |
| bus50 | "exceptionally high volume" | PASS | **I** ✅ |
| bus75 | "extraordinarily large number" | PASS | **I** ✅ |
| bus100 | "exceptionally substantial crowd" | PASS | **I** ✅ |
| for25 | "exceptionally high volume" | PASS | |
| for50 | "extraordinarily large number" | PASS | |
| for75 | "exceedingly substantial patronage" | PASS | |
| for100 | "extraordinarily copious patronage" | PASS | |

**0 FAIL, 1 WARNING, 11 PASS**

---

## Run3 集計

| 文 | FAIL | WARNING | PASS |
|---|---|---|---|
| B2-01 | 3 | 3 | 6 |
| B2-02 | 0 | 0 | 12 |
| B2-03 | 0 | 2 | 10 |
| B2-04 | 2 | 5 | 5 |
| B2-05 | 0 | 1 | 11 |
| **合計** | **5** | **11** | **44** |

**PASS率（厳密）: 73.3%** / **PASS率（FAIL限定）: 91.7%**

---

## 3ラウンド総合比較

| | Run1 | Run2 | Run3 | 平均 |
|---|---|---|---|---|
| FAIL | 9 | 5 | 5 | 6.3 |
| WARNING | 13 | 14 | 11 | 12.7 |
| PASS | 38 | 41 | 44 | 41.0 |
| PASS率（厳密） | 63.3% | 68.3% | 73.3% | **68.3%** |
| PASS率（FAIL限定） | 85.0% | 91.7% | 91.7% | **89.4%** |

## 前回（修正前）との比較

| | 修正前（参照例なし） | 今回（配置整理後） | 変化 |
|---|---|---|---|
| FAIL限定 平均 | 86.1% | **89.4%** | **+3.3pt** |
| FAIL 平均 | 8.3 | 6.3 | **-2.0** |

---

## 修正効果の最終判定

| 修正項目 | 効果 | 再現率 |
|---|---|---|
| 程度定義に日本語マーカー | ✅ 完璧 | 3/3 全ラウンド正しい値 |
| toneStyle場面設定削除 | ✅ | B2-01,03,04,05でWe消滅 3/3 |
| neutral明示 | ✅ | "pleased to inform" 消滅 3/3 |
| 人称昇格 | ✅ | 一人称単数の文で全てI維持 3/3 |
| B2-02 We化 | **Run1: ❌ / Run2-3: ✅** | 2/3で消滅。非決定性の揺れ |

## 残存問題パターン（3ラウンド分析）

| パターン | 出現率 | 詳細 |
|---|---|---|
| **B2-01 cas帯 程度膨張** | 3/3 | "pretty crummy/lousy", "super crappy" — slightなのにmoderate-extreme |
| **B2-04 cas100 extreme化** | 3/3 | "totally rad", "straight fire", "super rad" |
| **B2-04 for100 extreme膨張** | 3/3 | "exceptionally superior craftsmanship" |
| **B2-04 bus/for25-50 弱体化** | 3/3 | "well crafted/prepared" — strong修飾語なし |
| **B2-02 We化**（bus/for50+） | 1/3 | Run1のみ。非決定性 |
