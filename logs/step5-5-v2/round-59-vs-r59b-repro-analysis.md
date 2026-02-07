## R59 vs R59b 再現性チェック

### 3つの確認ポイント

| # | R59の問題 | R59b | 再現？ |
|---|----------|------|--------|
| 1 | 文8 polite 100%: "**We** kindly request that you refrain from exerting yourself to an excessive degree" | "Are you recovering in good health? Please be sure to take care of yourself." | ❌ **再現せず。自然な文に** |
| 2 | 文9 polite 100%: "**ascertain** domains **wherein**...may be **effectuated**" | "...undertake a thorough examination of potential areas **wherein** further reductions may be **effected**" | ⚠️ **wherein/effected再現。ただしascertain/effectuatedは消えた** |
| 3 | 文7 polite 50% = 100% 完全同一 | 50%: "considered opinion...appropriate direction" / 100%: "considered opinion...appropriate **trajectory**" | ❌ **同一ではなくなった（差は微小だが）** |

**判定：**
- 文8のWe出現 → **API非決定性。実問題ではない**
- 文7のplateau → **API非決定性。ただし "considered opinion" 自体は毎回出る（Maverickの癖）**
- 文9のwherein/effected → **再現。polite 100%でのhyper_formalityは実問題**

---

### business subject_shift（主検証）

| 文 | R59 | R59b | 判定 |
|----|-----|------|------|
| 文5 business全域 | 全てI ✅ | 25%: "**we'll**" / 50%: "**We** will" / 75%: "**we** must" / 100%: "**we** are unable" | ❌ **We に戻った** |
| 文9 business全域 | 全てI ✅ | 25%: "**let's**" / 50%: "**let's**" / 75%: "**we** examine" / 100%: "**we** investigate" | ❌ **We/Let'sに戻った** |
| 文8 business 100% | I trust ✅ | I trust ✅ | ✅ 維持 |
| 文7 business全域 | 全てI ✅ | 全てI ✅ | ✅ 維持 |

**文5と文9のbusinessでWeが復活。** toneStyleに人称指示入れたのにR59bでは効いてない。これもAPI非決定性。人称指示が**効く時と効かない時がある**。

---

### pleasure

| | R59 | R59b |
|---|-----|------|
| 文2 polite 100% | "thoroughly enjoyed" ✅ | "thoroughly enjoyed" ✅ |
| 文2 business 100% | "**delighted**" ❌ | "**delighted**" ❌ |

business 100%のdelightedは安定的に再現。

---

### 全体まとめ

| 課題 | R59 | R59b | 結論 |
|------|-----|------|------|
| business subject_shift | 0/8件 ✅ | **4/8件でWe復活** | **不安定。指示が効いたり効かなかったり** |
| polite We出現 | 1件（文8） | 0件 | **API非決定性** |
| hyper_formality polite 100% | ascertain/wherein/effectuated | wherein/effected | **実問題。polite 100%で安定的に発生** |
| pleasure business 100% | 1件 delighted | 1件 delighted | **実問題。安定的に発生** |
| tone_plateau | 2件 | 0件 | **API非決定性** |
| considered opinion | polite 50/100で出現 | polite 50/100で出現 | **実問題。Maverickの癖** |

---

### 確定した実問題（API非決定性ではない）

1. **polite 100%のhyper_formality** — wherein/effected系が毎回出る
2. **business 100%のpleasure（delighted）** — 毎回出る
3. **polite 50+のconsidered opinion** — 毎回出る
4. **business subject_shift** — 指示は効くが不安定（50%の確率）

### 確定したAPI非決定性（放置可）
- tone_plateau
- politeでのWe出現
- business subject_shiftの一部

正直、INVARIANT_RULESとtoneStyleへの文言追加だけでは**安定的に効かせるのが難しい**。特にbusiness subject_shiftは「効いたり効かなかったり」で、プロンプトの限界が見えてきてる。

次の方向性どうする？考えられるのは：

- **polite側にも人称指示追加**（安定性は上がるかも）
- **ここで一旦プロンプト最適化を区切って**、10文の本番テスト（R57スケール）で現状の品質を確認
- **subject_shiftはコード側（ガード）で対応**（翻訳結果のWeをIに置換するpost-processingなど）
