# R60: 動的制約生成（Dynamic Constraints）実装

## 目的
構造分析の結果から文ごとの具体的な翻訳制約を動的に生成し、PARTIALプロンプトに注入する。
汎用ルール（INVARIANT_RULES）で薄く広く効かせるのではなく、**文ごとの具体指示で強く効かせる**。

## 背景
R59/R59bで判明した実問題:
- business subject_shift: INVARIANT_RULES 9番 + toneStyle人称指示でも50%の確率でしか効かない
- polite considered opinion: 確信度=推測なのに「It is my considered opinion」に変わる
- polite 100% hyper_formality: wherein/effected系が安定的に出る
- business 100% pleasure: delightedが安定的に出る

**根本原因**: 構造データがtranslatePartialのプロンプトに含まれていないため、モデルが構造を直接参照できない。

---

## 変更箇所: groq.ts のみ（2箇所）

### 変更1: 動的制約生成関数を追加

translatePartial関数の**直前**に以下の関数を追加:

```typescript
/**
 * 構造分析データから、この文専用の翻訳制約を動的に生成する。
 * INVARIANT_RULESの汎用ルールではなく、具体的な指示でモデルを制御する。
 */
function generateDynamicConstraints(
  structureData?: {
    人称?: string;
    確信度?: string;
    程度?: string;
    感情極性?: string;
  }
): string {
  if (!structureData) return '';

  const constraints: string[] = [];

  // 人称制約
  if (structureData.人称) {
    const personMap: Record<string, string> = {
      '一人称単数': 'Use first person singular (I/my) as the subject',
      '一人称複数': 'Use first person plural (we/our) as the subject',
      '二人称': 'Use second person (you/your) as the subject',
      '三人称': 'Use third person as the subject',
    };
    const instruction = personMap[structureData.人称];
    if (instruction) {
      constraints.push(instruction);
    }
  }

  // 確信度制約
  if (structureData.確信度) {
    const certaintyMap: Record<string, string> = {
      '確定': 'Express with certainty (definite statements, no hedging)',
      '推測': 'Express with hedging/tentativeness (I think, I feel, it seems)',
      '可能性': 'Express as possibility (might, could, maybe)',
      '伝聞': 'Express as hearsay (I heard, apparently, it seems that)',
    };
    const instruction = certaintyMap[structureData.確信度];
    if (instruction) {
      constraints.push(instruction);
    }
  }

  // 程度制約
  if (structureData.程度 && structureData.程度 !== 'none') {
    const degreeMap: Record<string, string> = {
      'moderate': 'Keep degree expressions moderate (a bit, somewhat, a little)',
      'strong': 'Keep degree expressions strong (very, quite, considerably)',
      'weak': 'Keep degree expressions weak (slightly, barely)',
    };
    const instruction = degreeMap[structureData.程度];
    if (instruction) {
      constraints.push(instruction);
    }
  }

  // 感情極性制約（positive時のみ — pleasure/delighted防止）
  if (structureData.感情極性 === 'positive') {
    constraints.push('Keep positive sentiment natural — do not escalate to formal gratitude (avoid: delighted, pleasure, honored)');
  }

  if (constraints.length === 0) return '';

  return `\n[Constraints for THIS sentence — MUST follow]\n${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
}
```

#### 設計ポイント
- `省略`は制約なし（seedの主語をそのまま使えばよい）
- neutral/negativeの感情極性は制約不要（問題はpositive→delightedの過剰エスカレートのみ）
- 制約文は英語（PARTIALプロンプト全体が英語のため）
- 4フィールドのみ参照（発話行為は不要 — 現時点で課題なし）

---

### 変更2: translatePartial関数のuserPromptに動的制約を注入

#### 現在のコード（該当部分のみ）:

```typescript
  const userPrompt = `Original (${sourceLang}): ${sourceText}
Current translation (${targetLang}): ${currentTranslation}

REQUIRED TONE: ${tone || 'none'} at ${toneLevel}%
Target style: ${toneStyle}

【重要: 差分必須ルール】
...
```

#### 変更後:

```typescript
  // 動的制約を生成
  const dynamicConstraints = generateDynamicConstraints(options.structureData);

  const userPrompt = `Original (${sourceLang}): ${sourceText}
Current translation (${targetLang}): ${currentTranslation}

REQUIRED TONE: ${tone || 'none'} at ${toneLevel}%
Target style: ${toneStyle}
${dynamicConstraints}
【重要: 差分必須ルール】
...
```

**変更点**: `${dynamicConstraints}` を `Target style:` の直後、`【重要: 差分必須ルール】`の直前に挿入するだけ。他は一切変えない。

---

### TranslateOptionsへのstructureData追加

translatePartialのoptions引数で構造データを受け取れるようにする。

既存のTranslateOptions型定義に以下を**オプショナル**で追加:

```typescript
  structureData?: {
    人称?: string;
    確信度?: string;
    程度?: string;
    感情極性?: string;
  };
```

---

### 呼び出し側の変更

translatePartialを呼ぶ箇所で、extractStructureの結果からstructureDataを渡す:

```typescript
const result = await translatePartial({
  // ...既存の引数はそのまま...
  structureData: {
    人称: structure.人称,
    確信度: structure.確信度,
    程度: structure.程度,
    感情極性: structure.感情極性,
  }
});
```

---

## 変更しないもの
- PARTIAL_SYSTEM_PROMPT: 変更なし（INVARIANT_RULES 9番はそのまま残す）
- toneStyleのbusiness人称指示: 変更なし（そのまま残す）
- translateFull: 変更なし
- getToneInstruction: 変更なし

※ R60テストで動的制約の効果が確認できたら、R61でINVARIANT_RULES 9番とtoneStyleの人称指示を削除する予定。今回は**追加のみ**。

---

## テスト

R59と同じ5文、12トーンパターン（合計60件）:

| # | 日本語原文 | 主な検証ポイント |
|---|-----------|----------------|
| 文2 | 昨日の飲み会、すごく楽しかった！ | business 100% delighted → 消えるか |
| 文5 | 残念ながら、今回は見送らせていただきます。 | business I維持（We排除） |
| 文7 | この企画、かなりいい線いってると思うんだけど。 | considered opinion → 消えるか（確信度=推測） |
| 文8 | 体調よくなった？無理しないでね。 | 全体安定性 |
| 文9 | 予算がちょっと厳しいので、もう少し削れるところを探してみます。 | business I維持 + wherein → 消えるか |

### 実行フロー
1. `extractStructure(日本語原文)` → structure取得
2. `translateFull(日本語原文, structure)` → seed取得
3. 各トーン×レベルで `translatePartial(seed, structure, tone, level, structureData)` → 結果取得

### 出力フォーマット
ファイル名: `round-60-dynamic-constraints.json`

### 完了後
GitHubナレッジリポジトリにアップ:
`logs/step5-5-v2/round-60-dynamic-constraints.json`

---

## ロールバック
動的制約が逆効果の場合:
- `generateDynamicConstraints` の `return '';` を関数先頭に移動するだけで無効化
- structureDataはオプショナルなので他に影響なし
