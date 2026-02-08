// プロンプト定数・ルール生成関数（groq.tsから分離）

import type { ExpandedStructure, EntityType, TranslateOptions } from './types';

// 不変条件（7項目 + stance_strength）のシステムプロンプト
export const INVARIANT_RULES = `
【不変条件】
1. entities - 数字・日付・時刻・金額・固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. modality_class - 依頼/義務/提案のクラスを変えない
5. question/statement - 質問/断定を変えない
6. condition markers - if/unless/when等を保持
7. commitment - 約束を勝手に追加しない
8. stance_strength - 同意や感情の強さを変えない
9. 意図・確信度・感情極性・モダリティは構造情報の値を固定

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;

export const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない（素敵/かわいい/きれい/良い等のカテゴリ維持）
2. 名詞カテゴリも変えない（犬→ワンちゃんはOK、犬→猫はNG）
3. トーン調整で変えていいのは「語彙の格式レベル・文体・丁寧さ」のみ
4. 意図を変えない（感謝→依頼にしない、報告→提案にしない）
5. 確信度を変えない（不確実→確実にしない）
6. 感情極性を変えない（ネガティブにポジティブ表現を追加しない）
`;

// PARTIAL用システムプロンプト（トーンレベル指示はuserPromptで渡す）
export const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo's tone editor in PARTIAL mode.
Edit current_translation to match the requested tone level. Do NOT translate from scratch.

CORE PRINCIPLE (non-negotiable):
- Style Strength (tone%) and Semantic Strength (degree_level) are TWO INDEPENDENT axes.
- Raising tone changes ONLY surface style (vocabulary formality, contractions, politeness markers, sentence structure).
- Raising tone must NEVER raise semantic intensity, certainty, or commitment strength.

═══ MEANING LOCK (never change) ═══
1. Entities: numbers, dates, times, amounts, proper nouns
2. Polarity: positive ↔ negative never flips
3. Subject: never change (1st person singular ≠ 1st person plural)
4. Question/statement type preserved
5. Condition markers (if/unless/when) preserved — never drop them
6. Commitment lock: do NOT weaken or strengthen commitments/promises/offers. Keep the same commitment class as Seed(0%).
7. Predicate meaning lock: keep the core action meaning from structure.動作の意味. Do not swap into a different achievement/evaluation verb.

═══ OUTPUT ═══
JSON only, no markdown: {"new_translation":"...","reverse_translation":"...(source lang)","risk":"low|med|high"}`;

// 言語固有ルール（10言語対応）
export function getLanguageSpecificRules(targetLang: string): string {
  switch (targetLang) {
    case '英語':
      return `
【人名の翻訳ルール - 英語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞（歌、絵等）と混同しない

【敬称のルール - 英語】
- 日本語で敬称なし → 英語でも Mr./Ms. をつけない
- 日本語で敬称あり → 英語で Mr./Ms. をつける

【「君」「あなた」の翻訳ルール - 英語】
- 「君」「あなた」は単純に "you" と訳す
- 余計な装飾を追加しない

【服の翻訳ルール - 英語】
- 服の一般語は clothes/outfit を使う
- "dress" は「ドレス/ワンピース」が明示された時だけ`;

    case '中国語':
      return `
【人名の翻訳ルール - 中国語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - 中国語】
- 日本語で敬称なし → 中国語でも敬称をつけない
- 日本語で敬称あり → 中国語で適切な敬称をつける`;

    case 'チェコ語':
      return `
【人名の翻訳ルール - チェコ語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - チェコ語】
- 日本語で敬称なし → チェコ語でも敬称をつけない
- 日本語で敬称あり → チェコ語で適切な敬称をつける`;

    case '韓国語':
      return `
【人名の翻訳ルール - 韓国語】
- ひらがな/カタカナの人名はローマ字または韓国語読みで表記
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - 韓国語】
- 日本語で敬称なし → 韓国語でも敬称をつけない
- 日本語で敬称あり → 韓国語で適切な敬称（씨等）をつける`;

    case 'フランス語':
      return `
【人名の翻訳ルール - フランス語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - フランス語】
- 日本語で敬称なし → フランス語でも M./Mme をつけない
- 日本語で敬称あり → フランス語で M./Mme をつける`;

    case 'スペイン語':
      return `
【人名の翻訳ルール - スペイン語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - スペイン語】
- 日本語で敬称なし → スペイン語でも Sr./Sra. をつけない
- 日本語で敬称あり → スペイン語で Sr./Sra. をつける`;

    case 'ドイツ語':
      return `
【人名の翻訳ルール - ドイツ語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ドイツ語】
- 日本語で敬称なし → ドイツ語でも Herr/Frau をつけない
- 日本語で敬称あり → ドイツ語で Herr/Frau をつける`;

    case 'イタリア語':
      return `
【人名の翻訳ルール - イタリア語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - イタリア語】
- 日本語で敬称なし → イタリア語でも Sig./Sig.ra をつけない
- 日本語で敬称あり → イタリア語で Sig./Sig.ra をつける`;

    case 'ポルトガル語':
      return `
【人名の翻訳ルール - ポルトガル語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ポルトガル語】
- 日本語で敬称なし → ポルトガル語でも Sr./Sra. をつけない
- 日本語で敬称あり → ポルトガル語で Sr./Sra. をつける`;

    case '日本語':
      return `
【人名の翻訳ルール - 日本語】
- 人名はそのまま維持する
- 敬称は原文に従う（なければつけない）

【敬称のルール - 日本語】
- 原文の敬称を維持する
- 勝手に「様」「さん」を追加しない`;

    default:
      // 未対応言語は汎用ルール
      return `
【人名の翻訳ルール - ${targetLang}】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ${targetLang}】
- 日本語で敬称なし → ${targetLang}でも敬称をつけない
- 日本語で敬称あり → ${targetLang}で適切な敬称をつける`;
  }
}

export const EXPANDED_STRUCTURE_PROMPT = `あなたは多言語対応の構造分析アシスタントです。
入力文を「翻訳で変えてはいけない意味骨格」に分解してJSONで返してください。

判定原則:
- 構造的定義を最優先する
- 典型パターンは補助としてのみ使う
- 省略情報は文脈から復元する
- 迷ったら「翻訳で意味が変わるかどうか」で判断する

【出力項目（15項目）】
1. 格構造
2. 主題
3. 動作
4. 動作の意味
5. 意図
6. 感情極性
7. モダリティ
8. 願望
9. 人称
10. 確信度
11. 程度
12. 発話行為
13. 固有名詞
14. 保持値
15. 条件表現

【格構造（最重要）】
次の14キーを必ず含めること。値が無いときは必ず「なし」。
- 誰が: 動作主体（省略なら復元して「私（省略）」等）
- 何を: 動作対象
- 誰に: 相手・受益者・伝達先
- 誰と: 共同行動の相手
- なんて: 引用内容（「〜と思う」「〜と言う」の中身）
- どこに: 場所の着点・存在地点
- どこで: 動作場所
- どこへ: 方向
- どこから: 場所の起点
- どこまで: 場所の終点
- いつ: 時点
- いつから: 時間の起点
- いつまで: 時間の終点
- どうやって: 手段・方法

【格構造の厳密ルール】
- 場所と時間を混同しない（「月曜に」は「いつ」、「駅前に」は「どこに」）
- 「よ」「ね」など終助詞がある場合は伝達相手を「誰に: あなた（省略）」として復元する
- 引用は必ず「なんて」に入れる
- 手段は必ず「どうやって」に入れる（理由と混同しない）
- 翻訳に不要でも格は保持する（意味骨格のため）

【その他項目の定義】
- 主題: 何について話しているか
- 動作: 何をする/どうなる
- 動作の意味: 英語の基本動詞句（go/come/give up/help など）
- 意図: 依頼/確認/報告/質問/感謝/謝罪/提案/命令/その他
- 感情極性: positive/negative/neutral
- モダリティ: 報告/依頼/感謝/質問/感想/提案/その他
- 願望: あり/なし
- 人称: 一人称単数/一人称複数/二人称/三人称
- 確信度: 確定/推測/可能性/伝聞
  - 「〜と思う」「〜んだけど」は推測
  - 「〜らしい」「〜そうだ」「〜って」は伝聞（推測より優先）
- 程度: none/slight/moderate/strong/extreme
  - none: 程度表現なし（強調語も修飾語もない素の文）
  - slight: ほんの少し。「ちょっと」「少し」「やや」「若干」「少々」
  - moderate: そこそこ。「割と」「まあまあ」「そこそこ」「あんまり」「あまり」
  - strong: かなり。「かなり」「すごく」「とても」「めっちゃ」「だいぶ」「ずいぶん」「非常に」
  - extreme: 極端。「めちゃくちゃ」「超」「完全に」「全然」「極めて」「猛烈に」「とんでもなく」
- 発話行為: 複合文なら配列で全行為を列挙（例: ["謝罪","報告"]）
  - 文頭1語の謝罪・感謝も見落とさない
- 固有名詞: [{text,type,敬称}]（必要なら読みも可）
- 保持値: 数値・日時・金額・数量など絶対保持値（固有名詞は除く）
- 条件表現: 条件/因果の論理マーカー（例: ["もし〜たら"], ["〜ので"]）

【出力JSON形式（説明文は不要）】
{
  "格構造": {
    "誰が": "...",
    "何を": "...",
    "誰に": "...",
    "誰と": "...",
    "なんて": "...",
    "どこに": "...",
    "どこで": "...",
    "どこへ": "...",
    "どこから": "...",
    "どこまで": "...",
    "いつ": "...",
    "いつから": "...",
    "いつまで": "...",
    "どうやって": "..."
  },
  "主題": "...",
  "動作": "...",
  "動作の意味": "...",
  "意図": "...",
  "感情極性": "...",
  "モダリティ": "...",
  "願望": "...",
  "人称": "...",
  "確信度": "...",
  "程度": "...",
  "発話行為": ["..."],
  "固有名詞": [],
  "保持値": [],
  "条件表現": []
}
`;


/**
 * 構造情報をプロンプト用テキストに変換
 */
export function structureToPromptText(structure: ExpandedStructure, targetLang?: string, sourceLang?: string): string {
  const entityTypeMap: Record<EntityType, string> = {
    person: '人名',
    place: '地名',
    org: '組織名',
    product: '製品名'
  };

  const entities = structure.固有名詞.length > 0
    ? structure.固有名詞.map(e => {
        const typeStr = entityTypeMap[e.type];
        const readingStr = e.読み ? `、読み: ${e.読み}` : '';
        const honorificStr = e.敬称 === 'なし'
          ? '、敬称なし（身内・親しい人→尊敬語不要）'
          : e.敬称 ? `、敬称: ${e.敬称}` : '';
        return `「${e.text}」は${typeStr}${readingStr}${honorificStr}`;
      }).join('、')
    : 'なし';

  // 言語情報（渡された場合のみ追加）
  const langInfo = targetLang ? `
・翻訳の出力言語: ${targetLang}（translationフィールドは必ずこの言語で出力）
・逆翻訳の出力言語: ${sourceLang || '日本語'}（reverse_translationフィールドは必ずこの言語で出力）` : '';

  const caseEntries = Object.entries(structure.格構造 || {})
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0 && value.trim() !== 'なし');
  const caseInfoText = caseEntries.length > 0
    ? caseEntries.map(([key, value]) => `・${key}: ${value}`).join('\n')
    : '・（指定なし）';
  const enhancedFields: string[] = [];
  const degreeMap: Record<string, string> = {
    slight: 'slight — ほんの少し、ちょっとだけ',
    moderate: 'moderate — そこそこ、まあまあ',
    strong: 'strong — かなり、相当',
    extreme: 'extreme — 極めて、とんでもなく',
  };
  if (structure.程度 && structure.程度 !== 'none' && degreeMap[structure.程度]) {
    enhancedFields.push(`【程度: ${degreeMap[structure.程度]}】`);
  }

  const certaintyMap: Record<string, string> = {
    確定: '確定 — 事実として断言している',
    推測: '推測 — 個人的にそう思っている',
    可能性: '可能性 — ありえる、かもしれない',
    伝聞: '伝聞 — 他から聞いた話、自分では未確認',
  };
  if (structure.確信度 && certaintyMap[structure.確信度]) {
    enhancedFields.push(`【確信度: ${certaintyMap[structure.確信度]}】`);
  }

  const emotionMap: Record<string, string> = {
    positive: 'positive — 肯定的・前向き・嬉しい',
    negative: 'negative — 否定的・後ろ向き・残念',
  };
  if (structure.感情極性 && emotionMap[structure.感情極性]) {
    enhancedFields.push(`【感情: ${emotionMap[structure.感情極性]}】`);
  }

  const modalityMap: Record<string, string> = {
    報告: '報告 — 事実・状況を伝えている',
    依頼: '依頼 — お願いしている',
    感謝: '感謝 — ありがとうと伝えている',
    質問: '質問 — 問いかけている',
    感想: '感想 — 個人的な感想を述べている',
    提案: '提案 — 提案・勧めている',
  };
  if (structure.モダリティ && modalityMap[structure.モダリティ]) {
    enhancedFields.push(`【モダリティ: ${modalityMap[structure.モダリティ]}】`);
  }

  if (structure.願望 === 'あり') {
    enhancedFields.push('【願望: あり — 〜したい・〜してほしいという気持ちがある】');
  }

  const enhancedFieldsText = enhancedFields.length > 0
    ? `\n${enhancedFields.join('\n')}`
    : '';
  const fixedValues = structure.保持値 && structure.保持値.length > 0
    ? structure.保持値.join(', ')
    : 'なし';
  const conditionMarkers = structure.条件表現 && structure.条件表現.length > 0
    ? structure.条件表現.join(', ')
    : 'なし';
  const speechActs = structure.発話行為 && structure.発話行為.length > 0
    ? structure.発話行為.join('+')
    : 'なし';
  const objectValue = structure.格構造?.何を && structure.格構造.何を !== 'なし'
    ? structure.格構造.何を
    : 'なし';

  return `【格構造（文の骨格）- ここにない情報は補完するな】
${caseInfoText}
${enhancedFieldsText}

【構造情報（参考）】
・動作: ${structure.動作}
・動作の意味: ${structure.動作の意味}（この意味を保持すること）
・人称: ${structure.人称 || '一人称単数'}
・意図: ${structure.意図}
・発話行為: ${speechActs}
・固有名詞: ${entities}
・保持値: ${fixedValues}
・条件表現: ${conditionMarkers}${langInfo}

【翻訳ルール】
- 単語は変えていいが、意味は変えないこと（特に動作の意味）
- 「意図」「モダリティ」「感情極性」「確信度」「願望」「人称」を翻訳で必ず保持すること
- 敬称なしの人名は身内・親しい人なので、尊敬語を使わない（例: 寝る→sleeps、NOT: お休みになる）
- 固有名詞の読みがある場合はその読みで翻訳する
- 一般名詞（電車、車、家など）はローマ字にせず普通に翻訳する（電車→train、NOT: densha）

【格構造ルール - 重要】
- 上記の格構造で指定された役割のみ反映する
- 記載されていない格情報を勝手に補完しない
- 条件表現・保持値はそのまま残す

【目的格ルール - 重要】
- 目的格: 格構造の「何を」を目的語として保持（値: ${objectValue}）

【願望ルール - 重要】
- 願望: 構造情報の願望を保持（「あり」なら want to / 〜したい を維持）

【人称ルール - 絶対遵守】
- 人称: 構造情報の人称を厳守（MEANING LOCK #3参照）

【条件節ルール - 絶対遵守】
- 原文に「もし / 〜たら / 〜なら / 〜れば」がある場合、条件節を削除しない
- target=en の場合、if/when を必ず含める
- ❌ 「電車が止まってたら」→ "The train stopped"（条件欠落）は禁止`;

}

export function getFullDifferenceInstruction(
  toneLevel: number,
  previousTranslation?: string,
  previousLevel?: number,
  tone?: string
): string {
  const isBusinessOrFormal = tone === 'business' || tone === 'formal';

  if (!previousTranslation) {
    if (toneLevel === 50) {
      return `【差分推奨】
- 25%の出力と明確に差を出す（意味は変えない）
- 語彙・構文のトーンを段階的に変える
- 意図・確信度・感情極性は元のまま固定`;
    }
    if (toneLevel === 75 || toneLevel === 100) {
      return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
- ${previousLevel ?? 50}%の出力と同一/ほぼ同一は禁止
- 語彙・構文で差を出す（意味は変えない）
- 意図・確信度・感情極性は元のまま固定`;
    }
    return '';
  }

  return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
前レベル(${previousLevel ?? 0}%): "${previousTranslation}"
- 上記と同一/ほぼ同一は禁止
- 語彙・構文で差を出す（意味は変えない）
- 意図・確信度・感情極性は元のまま固定`;
}

// トーン指示を生成
export function getToneInstruction(options: TranslateOptions): string {
  const { tone, toneLevel = 0, customTone } = options;

  if (!tone || toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】自然に翻訳。スタイル変更なし。`;
  }

  const intensityMap: Record<string, [string, string]> = {
    '25': ['多少', '軽く'],
    '50': ['', '標準的に'],
    '75': ['結構', 'しっかり'],
    '100': ['めちゃくちゃ', '最大限に'],
  };

  const bucket = toneLevel < 50 ? '25' : toneLevel < 75 ? '50' : toneLevel < 100 ? '75' : '100';
  const [intensityLabel, intensityDesc] = intensityMap[bucket];

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 省略形・スラングを積極的に使用
- 最もくだけた語彙を選ぶ`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${intensityDesc}くだけた表現に
- 省略形OK
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス語彙
- 省略形は一切使わない
- 最も格式の高い表現を選ぶ`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}ビジネス】
- ${intensityDesc}ビジネスライクに
- 省略形は避ける
- プロフェッショナルなトーン`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃ丁寧（最大級の敬語・謙譲語）】
- 最も格式の高い語彙と表現
- 謙譲語・尊敬語を最大限に使用
- 最上級の格式で書く`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}丁寧】
- ${intensityDesc}丁寧な表現に
- 敬意を込めた言い回し
- 礼儀正しいトーン`;

    case 'custom':
      return `【カスタムトーン: "${customTone || ''}" FULL POWER】
- 段階は無視して常に全力で表現
- 意味は絶対に変えない`;

    default:
      return `【トーンレベル: ${toneLevel}%】自然に翻訳。`;
  }
}

// 2026-02-02 多言語バグ修正v2: targetLangを追加
export function getReverseTranslationInstruction(
  sourceLang: string,
  targetLang: string,
  _toneLevel: number,  // 新方式では未使用（英語側でトーン調整するため）
  tone?: string,
  _customTone?: string  // 新方式では未使用
): string {
  // 日本語以外が原文の場合
  if (sourceLang !== '日本語') {
    return `【逆翻訳 - 絶対ルール】
- reverse_translation は必ず ${sourceLang} で出力すること
- ${sourceLang}以外の言語は絶対に使わない
- トーン調整後の${targetLang}を${sourceLang}に訳す
- 翻訳先言語（${targetLang}）を逆翻訳に混ぜない`;
  }

  // 日本語が原文の場合：敬語かどうかだけ指定
  // ※英語翻訳でトーン調整済みなので、そのニュアンスを日本語に反映する
  const usePolite = tone === 'business' || tone === 'formal';

  return `【逆翻訳】
- reverse_translation は日本語で出力
- トーン調整後の翻訳を${usePolite ? '敬語で' : '敬語を使わず'}日本語に訳す
- トーン調整で追加された表現の差分を必ず反映すること（各パーセンテージ間の逆翻訳が同じトーンにならないように）
- 二重敬語は禁止（例: ×おっしゃられる ×ご覧になられる ×お召し上がりになられる）
- 人名に敬称を勝手に追加しない（原文で敬称なし→逆翻訳でも敬称なし。例:「ごんた」→「ごんた様」❌）
${usePolite ? '- 原文が敬語でなくても、必ず敬語（です/ます/ございます）で出力すること' : ''}`;
}
