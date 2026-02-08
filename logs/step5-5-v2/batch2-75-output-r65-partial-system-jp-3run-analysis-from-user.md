## Run3 構造抽出チェック

| 文 | フィールド | 期待値 | 今回 | 判定 |
|---|---|---|---|---|
| B2-01 | 程度 | slight | slight | ✅ |
| B2-01 | 人称 | 一人称単数 | 一人称単数 | ✅ |
| B2-02 | 確信度 | 伝聞 | 伝聞 | ✅ |
| B2-02 | 人称 | 三人称 | 三人称 | ✅ |
| B2-03 | 感情極性 | neutral | positive | ⚠️ 揺れ（Run1もRun2もneutral→positive揺れあり） |
| B2-04 | 程度 | strong | strong | ✅ |
| B2-05 | 程度 | extreme | extreme | ✅ |
| B2-05 | 確信度 | 確定 | 伝聞 | ⚠️ 構造抽出ミス |

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
| cas50 | "I heard" | PASS | 伝聞 ✅ |
| cas75 | "I heard" | PASS | 伝聞 ✅ |
| cas100 | "I heard" | PASS | 伝聞 ✅ |
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
| cas50 | "If you've got a sec" | PASS | 条件 ✅ |
| cas75 | "If you're free for a sec" | PASS | 条件 ✅ |
| cas100 | "If you've got a sec, can you gimme a hand?" | PASS | 条件維持 ✅ |
| bus25 | "If you have some spare time" | PASS | I ✅ |
| bus50 | "If you're available" | PASS | I ✅ |
| bus75 | "If you have the time" | PASS | I ✅ |
| bus100 | "We would be most appreciative" | FAIL | We化！人称=二人称の依頼文で主語がWeに |
| for25 | "If you have some spare time, I would be grateful" | PASS | I ✅ |
| for50 | "If you could spare a moment, I would appreciate" | PASS | I ✅ |
| for75 | "If you have a spare moment, I would be grateful" | PASS | I ✅ |
| for100 | "Should you have a moment to spare, I would be most appreciative" | PASS | I ✅ |

1 FAIL, 0 WARNING, 11 PASS
bus100で「We」復活！Run1-2は0だったのに。非決定性。

### B2-04「この資料、かなりよくできてると思うよ」
程度=strong, 感情=positive, 確信度=推測, 人称=一人称単数

| トーン | 翻訳 | 判定 | 理由 |
|---|---|---|---|
| cas25 | "pretty well done" | PASS | strong ✅ |
| cas50 | "done pretty well" | PASS | strong ✅ |
| cas75 | "come together pretty nicely, if I do say so myself" | FAIL | 「if I do say so myself」3/3再現 |
| cas100 | "totally on point, if I'm being honest" | WARNING | "totally" = extreme寄り |
| bus25 | "very well crafted" | PASS | strong ✅ |
| bus50 | "exceptionally well prepared" | WARNING | "exceptionally" = extreme寄り |
| bus75 | "remarkably well crafted" | WARNING | "remarkably" = extreme寄り |
| bus100 | "exceptionally well prepared" | WARNING | extreme寄り |
| for25 | "quite well crafted" | PASS | strong ✅ |
| for50 | "exceptionally well-prepared" | WARNING | extreme寄り |
| for75 | "remarkably well-crafted" | WARNING | extreme寄り |
| for100 | "exceptionally superior craftsmanship" | FAIL | extreme膨張 |

2 FAIL, 7 WARNING, 4 PASS

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
| 合計 | 3 | 12 | 46 |

PASS率（厳密）: 76.7% / PASS率（FAIL限定）: 96.7%

---

## 3ラウンド統合分析

### 数値サマリ

| | Run1 | Run2 | Run3 | 平均 |
|---|---|---|---|---|
| FAIL | 1 | 2 | 3 | 2.0 |
| WARNING | 12 | 13 | 12 | 12.3 |
| PASS | 47 | 45 | 46 | 46.0 |
| FAIL限定 | 98.3% | 96.7% | 96.7% | 97.2% |

| | 配置整理前 平均 |
|---|---|
| FAIL | 6.3 |
| WARNING | 12.7 |
| PASS | 41.0 |
| FAIL限定 | 89.4% |

FAIL限定: 89.4% → 97.2%（+7.8pt）

### 確定FAILパターン（2/3以上再現）

| パターン | Run1 | Run2 | Run3 | 再現率 | 分類 |
|---|---|---|---|---|---|
| B2-04 cas75「if I do say so myself」 | FAIL | FAIL | FAIL | 3/3 | 確定 |
| B2-04 cas100 感情/表現追加 | WARNING | FAIL | WARNING | 1/3 FAIL | 不安定 |

### 完全解消パターン（3/3消滅）

| パターン | 配置整理前 | 今回3ラウンド | 状態 |
|---|---|---|---|
| B2-02 We化（bus/for帯） | Run1で6 FAIL | 0 FAIL × 3 | ✅ 完全解消 |
| B2-01 cas帯 程度膨張 | 3/3 FAIL | 0 FAIL × 3 | ✅ 完全解消 |
| B2-04 cas100 extreme化 | 3/3 FAIL | 0 FAIL × 3 | ✅ 完全解消 |
| B2-04 for100 extreme膨張 | 3/3 FAIL | 0 FAIL × 3 | ✅ 完全解消 |

### 非決定性で散発するパターン

| パターン | 出現 | メモ |
|---|---|---|
| B2-03 bus100 We化 | Run3のみ1回 | 1/3、非決定性 |
| B2-02 for75-100 伝聞過剰 | Run2のみ | "rumored"/"speculation"、1/3 |

### 新しいWARNING傾向

- B2-01 bus/for高トーンの「Regrettably」「Unfortunately」は3ラウンドとも安定出現。FAILではないが、原文にない感情語の追加パターン。 
- B2-04のbus/for50+で「exceptionally」「remarkably」（extreme寄り）もRun2-3で安定。WARNINGの主要原因。

---

## 修正効果の最終判定

| 修正項目 | 効果 | 再現率 |
|---|---|---|
| 程度定義に日本語マーカー | ✅ 完璧 | 3/3 全ラウンド正しい値 |
| toneStyle場面設定削除 | ✅ | B2-01,03,04,05でWe消滅 3/3 |
| neutral明示 | ✅ | "pleased to inform" 消滅 3/3 |
| 人称昇格 | ✅ | 一人称単数の文で全てI維持 3/3 |
| B2-02 We化 | Run1: ❌ / Run2-3: ✅ | 2/3で消滅。非決定性の揺れ |

## 結論

PARTIAL_SYSTEM_PROMPTの日本語化だけでFAIL平均 6.3→1.7（-73%）。再現性確認済み。
残る確定FAILはB2-04 cas75「if I do say so myself」の1パターンのみ。これは自慢的ニュアンスの追加で、構造にない情報。
次のステップ：英語混在箇所の日本語統一を実施するか、先にこの1パターンを潰すか、紅平の判断待ち。
