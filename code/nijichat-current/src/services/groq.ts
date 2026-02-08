// OpenAI API 翻訳サービス（翻訳フロー関数のみ）
// v2: 6次元全体地図ベースに再設計
// 型定義・ガード・プロンプト・i18n・APIは個別ファイルに分離済み

// 型定義を再エクスポート
export type { EntityType } from './types';
export type {
  NamedEntity, ExpandedStructure, TranslationResult,
  PartialTranslationResult, GuardedTranslationResult,
  ExplanationResult, TranslateOptions, InvariantCheckResult,
  FallbackDecision, PartialTranslationResponse,
  EmotionPolarity, EmotionType, Emotion,
  EvaluationValue, EvaluativeStance,
  CaseStructure,
} from './types';
export type { ModalityClass } from './types';

import type {
  CaseStructure,
  ExpandedStructure,
  NamedEntity,
  Emotion,
  EvaluativeStance,
  EmotionPolarity,
  EmotionType,
  EvaluationValue,
  TranslationResult,
  TranslateOptions,
  ExplanationResult,
  PartialTranslationResponse,
} from './types';

// API
import { MODELS, callGeminiAPI, parseJsonResponse } from './api';

// ガード関数
import {
  isTooSimilarText,
  shouldFallbackToFull,
  applyEvaluationWordGuard,
  applyReverseTranslationGuard,
  applyTranslationLanguageGuard,
  _internal as guardsInternal,
} from './guards';

// プロンプト
import {
  TONE_BOUNDARY_RULES,
  PARTIAL_SYSTEM_PROMPT,
  EXPANDED_STRUCTURE_PROMPT,
  getLanguageSpecificRules,
  getFullDifferenceInstruction,
  getToneInstruction,
  getReverseTranslationInstruction,
  structureToPromptText,
} from './prompts';

// i18n
import {
  getDifferenceFromText,
  getFailedToGenerateText,
  getNoChangeText,
  getLangNameFromCode,
} from './i18n';

// 再エクスポート（App.tsxからのimportを維持するため）
export { getDifferenceFromText, getNotYetGeneratedText, getFailedToGenerateText, getNoChangeText, getLangCodeFromName, getLangNameFromCode } from './i18n';
export { checkAlignmentScore } from './guards';
export { checkPolitenessGuard } from './guards';
export { structureToPromptText } from './prompts';
export { MODELS } from './api';

// テスト用エクスポート
export const _internal = guardsInternal;

// ============================================
// 構造化抽出 v2（6次元対応）- 定数・バリデーション
// ============================================

const structureCache = new Map<string, ExpandedStructure>();

// Ⅱ. 発話行為
const EXPRESSION_TYPES = ['平叙', '疑問', '命令', '感嘆', '祈願'] as const;
// Ⅲ. モダリティ
const EPISTEMIC_TYPES = ['確定', '推測', '可能性'] as const;
const EVIDENTIALITY_TYPES = ['直接経験', '推論', '伝聞'] as const;
const DEONTIC_TYPES = ['なし', '義務', '許可', '禁止', '能力'] as const;
const EXPLANATORY_TYPES = ['なし', '背景説明', '当然の帰結'] as const;

// Ⅳ. スタンス（日本語統一）
const EMOTION_POLARITY_TYPES: EmotionPolarity[] = ['肯定的', '否定的', '中立'];
const EMOTION_TYPES: EmotionType[] = [
  '喜び', '安心', '期待', '感謝', '満足',
  '悲しみ', '不安', '怒り', '後悔', '驚き', '不満',
  'なし'
];
const EVALUATION_VALUES: EvaluationValue[] = ['なし', '肯定的評価', '否定的評価'];
const DEGREE_LEVELS = ['なし', 'わずか', '中程度', '強い', '極端'] as const;

// Ⅴ. 対人的伝達
const PERSON_TYPES = ['一人称単数', '一人称複数', '二人称', '三人称'] as const;
const COMMUNICATIVE_TYPES = ['なし', '主張', '共有確認', '緩和'] as const;

// 固有名詞
const ENTITY_TYPES = ['人名', '地名', '組織名', '製品名'] as const;

// 格構造
const CASE_KEYS = [
  '誰が', '何を', '誰に', '誰と', 'なんて',
  'どこに', 'どこで', 'どこへ', 'どこから', 'どこまで',
  'いつ', 'いつから', 'いつまで', 'どうやって',
] as const;

const DEFAULT_CASE_STRUCTURE: CaseStructure = {
  誰が: '省略',
  何を: 'なし',
  誰に: 'なし',
  誰と: 'なし',
  なんて: 'なし',
  どこに: 'なし',
  どこで: 'なし',
  どこへ: 'なし',
  どこから: 'なし',
  どこまで: 'なし',
  いつ: 'なし',
  いつから: 'なし',
  いつまで: 'なし',
  どうやって: 'なし',
};

// ============================================
// バリデーション関数
// ============================================

const isInArray = <T extends string>(arr: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (arr as readonly string[]).includes(value);

const normalizeCaseStructure = (value: unknown): CaseStructure => {
  if (!value || typeof value !== 'object') return DEFAULT_CASE_STRUCTURE;

  const src = value as Record<string, unknown>;
  const normalized = { ...DEFAULT_CASE_STRUCTURE };

  for (const key of CASE_KEYS) {
    const raw = src[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      normalized[key] = raw.trim();
    }
  }

  return normalized;
};

const normalizeSpeechActs = (value: unknown): string[] => {
  const rawActs = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[+,、/／]/)
      : [];

  const normalized = rawActs
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return Array.from(new Set(normalized));
};

// 後方互換マップ（旧英語値→新日本語値）
const EMOTION_POLARITY_COMPAT: Record<string, EmotionPolarity> = {
  positive: '肯定的',
  negative: '否定的',
  neutral: '中立',
};

const DEGREE_COMPAT: Record<string, string> = {
  none: 'なし',
  slight: 'わずか',
  moderate: '中程度',
  strong: '強い',
  extreme: '極端',
};

const ENTITY_TYPE_COMPAT: Record<string, string> = {
  person: '人名',
  place: '地名',
  org: '組織名',
  product: '製品名',
};

const normalizeEmotion = (value: unknown): Emotion => {
  const defaultEmotion: Emotion = { 極性: '中立', 種類: 'なし' };

  if (!value || typeof value !== 'object') {
    // 後方互換: 旧形式の文字列が来た場合
    if (typeof value === 'string') {
      const mapped = EMOTION_POLARITY_COMPAT[value];
      if (mapped) return { 極性: mapped, 種類: 'なし' };
      if (isInArray(EMOTION_POLARITY_TYPES, value)) return { 極性: value, 種類: 'なし' };
    }
    return defaultEmotion;
  }

  const src = value as Record<string, unknown>;

  // 極性の正規化（後方互換含む）
  let polarity: EmotionPolarity = '中立';
  if (typeof src.極性 === 'string') {
    const mapped = EMOTION_POLARITY_COMPAT[src.極性];
    if (mapped) polarity = mapped;
    else if (isInArray(EMOTION_POLARITY_TYPES, src.極性)) polarity = src.極性;
  }

  const type = isInArray(EMOTION_TYPES, src.種類) ? src.種類 : 'なし';

  // 中立の場合は種類を強制的に「なし」
  if (polarity === '中立') {
    return { 極性: '中立', 種類: 'なし' };
  }

  return { 極性: polarity, 種類: type };
};

const normalizeEvaluativeStance = (value: unknown): EvaluativeStance => {
  const defaultStance: EvaluativeStance = { 評価: 'なし', 対象: 'なし' };

  if (!value || typeof value !== 'object') return defaultStance;

  const src = value as Record<string, unknown>;
  const evalValue = isInArray(EVALUATION_VALUES, src.評価) ? src.評価 : 'なし';
  const target = typeof src.対象 === 'string' && src.対象.trim().length > 0 ? src.対象.trim() : 'なし';

  // 評価が「なし」なら対象も強制的に「なし」
  if (evalValue === 'なし') {
    return { 評価: 'なし', 対象: 'なし' };
  }

  return { 評価: evalValue, 対象: target };
};

// 程度の正規化（後方互換含む）
const normalizeDegree = (value: unknown): string => {
  if (typeof value !== 'string') return 'なし';
  const mapped = DEGREE_COMPAT[value];
  if (mapped) return mapped;
  if (isInArray(DEGREE_LEVELS, value)) return value;
  return 'なし';
};

// EntityTypeの正規化（後方互換含む）
const normalizeEntityType = (value: unknown): string => {
  if (typeof value !== 'string') return '人名';
  const mapped = ENTITY_TYPE_COMPAT[value];
  if (mapped) return mapped;
  if (isInArray(ENTITY_TYPES, value)) return value;
  return '人名';
};

// ============================================
// 構造抽出メイン
// ============================================

/**
 * テキストから構造を抽出（v2: 6次元・19項目）
 */
export async function extractStructure(
  text: string,
  signal?: AbortSignal
): Promise<ExpandedStructure> {
  const cached = structureCache.get(text);
  if (cached) {
    console.log('[extractStructure] cache hit');
    return cached;
  }

  const defaultStructure: ExpandedStructure = {
    // Ⅰ. 命題的内容
    格構造: DEFAULT_CASE_STRUCTURE,
    動作: 'なし',
    動作の意味: 'なし',
    極性: '肯定',
    // Ⅱ. 発話行為
    表現類型: '平叙',
    発話行為: ['報告'],
    // Ⅲ. モダリティ
    認識的モダリティ: '確定',
    証拠性: '直接経験',
    義務的モダリティ: 'なし',
    説明のモダリティ: 'なし',
    願望: 'なし',
    // Ⅳ. スタンス
    感情: { 極性: '中立', 種類: 'なし' },
    評価態度: { 評価: 'なし', 対象: 'なし' },
    程度: 'なし',
    // Ⅴ. 対人的伝達
    人称: '一人称単数',
    伝達態度: 'なし',
    // Ⅵ. テクスト
    固有名詞: [],
    保持値: [],
    条件表現: [],
  };

  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callGeminiAPI(
        MODELS.FULL,
        EXPANDED_STRUCTURE_PROMPT,
        text,
        0.1,
        signal
      );

      console.log(`[extractStructure] attempt ${attempt} raw response:`, response);

      let parsed: Record<string, unknown>;
      try {
        parsed = parseJsonResponse<Record<string, unknown>>(response);
      } catch (parseError) {
        console.error(`[extractStructure] attempt ${attempt} JSON parse failed:`, parseError);
        if (attempt < MAX_RETRIES) {
          console.log('[extractStructure] retrying...');
          continue;
        }
        return defaultStructure;
      }

      // 固有名詞のバリデート
      const validatedEntities: NamedEntity[] = Array.isArray(parsed.固有名詞)
        ? (parsed.固有名詞 as Array<Record<string, unknown>>).map(e => ({
            text: (e.text as string) || '',
            type: normalizeEntityType(e.type) as NamedEntity['type'],
            読み: e.読み as string | undefined,
            敬称: (e.敬称 as string) || 'なし'
          }))
        : [];

      // 証拠性と認識的モダリティの共起制約を適用
      let epistemicValue = isInArray(EPISTEMIC_TYPES, parsed.認識的モダリティ)
        ? parsed.認識的モダリティ : '確定';
      const evidentialityValue = isInArray(EVIDENTIALITY_TYPES, parsed.証拠性)
        ? parsed.証拠性 : '直接経験';

      // 共起制約: 伝聞 → 確定にならない
      if (evidentialityValue === '伝聞' && epistemicValue === '確定') {
        epistemicValue = '推測';
      }

      const parsedSpeechActs = normalizeSpeechActs(parsed.発話行為);

      const validated: ExpandedStructure = {
        // Ⅰ. 命題的内容
        格構造: normalizeCaseStructure(parsed.格構造),
        動作: (parsed.動作 as string) || 'なし',
        動作の意味: (parsed.動作の意味 as string) || 'なし',
        極性: parsed.極性 === '否定' ? '否定' : '肯定',

        // Ⅱ. 発話行為
        表現類型: isInArray(EXPRESSION_TYPES, parsed.表現類型) ? parsed.表現類型 : '平叙',
        発話行為: parsedSpeechActs.length > 0 ? parsedSpeechActs : ['報告'],

        // Ⅲ. モダリティ
        認識的モダリティ: epistemicValue,
        証拠性: evidentialityValue,
        義務的モダリティ: isInArray(DEONTIC_TYPES, parsed.義務的モダリティ) ? parsed.義務的モダリティ : 'なし',
        説明のモダリティ: isInArray(EXPLANATORY_TYPES, parsed.説明のモダリティ) ? parsed.説明のモダリティ : 'なし',
        願望: parsed.願望 === 'あり' ? 'あり' : 'なし',

        // Ⅳ. スタンス
        感情: normalizeEmotion(parsed.感情),
        評価態度: normalizeEvaluativeStance(parsed.評価態度),
        程度: normalizeDegree(parsed.程度) as ExpandedStructure['程度'],

        // Ⅴ. 対人的伝達
        人称: isInArray(PERSON_TYPES, parsed.人称) ? parsed.人称 : '一人称単数',
        伝達態度: isInArray(COMMUNICATIVE_TYPES, parsed.伝達態度) ? parsed.伝達態度 : 'なし',

        // Ⅵ. テクスト
        固有名詞: validatedEntities,
        保持値: Array.isArray(parsed.保持値)
          ? (parsed.保持値 as unknown[]).filter((v): v is string => typeof v === 'string')
          : [],
        条件表現: Array.isArray(parsed.条件表現)
          ? (parsed.条件表現 as unknown[]).filter((v): v is string => typeof v === 'string')
          : [],
      };

      // キャッシュサイズ制限（500件）
      if (structureCache.size >= 500) {
        const firstKey = structureCache.keys().next().value;
        if (firstKey) structureCache.delete(firstKey);
      }
      structureCache.set(text, validated);

      console.log('[extractStructure] extracted:', validated);
      return validated;
    } catch (error) {
      console.error(`[extractStructure] attempt ${attempt} error:`, error);
      if (attempt < MAX_RETRIES) {
        console.log('[extractStructure] retrying...');
        continue;
      }
      return defaultStructure;
    }
  }

  return defaultStructure;
}

// ============================================
// PARTIAL編集
// ============================================

function getToneStyle(
  level: number,
  tone: string | undefined,
  structure?: ExpandedStructure,
  customTone?: string,
): string {
  const toneKey = tone ? `${tone.substring(0, 3)}${level}` : '';
  const baseMap: Record<string, string> = {
    cas25: '少しくだけた日常会話。基本的な短縮形を使う程度で、語彙は標準的なまま',
    cas50: '友人との普通の会話。短縮形を使い、親しみのある語彙を選ぶ',
    cas75: '友人とのくだけた会話。口語的な省略・短縮を多用し、くだけた語彙を選ぶ',
    cas100: '親しい友人同士の砕けた会話。口語・俗語・スラングを積極的に使う。語彙は最もくだけたものを選ぶ',
    bus25: 'やや丁寧な文体。短縮形を控え、語彙をやや改まったものにする程度',
    bus50: '丁寧な文体。適度な敬意表現を使い、簡潔かつ丁寧に',
    bus75: '格式高い文体。丁寧な語彙選択、完全文、改まった表現を使う',
    bus100: '最も格式高い文体。最高レベルのビジネス語彙と構造で書く。構造情報にある感情と評価のみ反映する',
    for25: 'やや改まった文体。基本的な敬意表現を使い、落ち着いた語調にする',
    for50: '改まった文体。敬意ある語彙選択と完全文で、品のある表現を使う',
    for75: '格式高い文体。敬意ある語彙選択と完全文で、品格のある表現を使う',
    for100: '最も格式高い文体。最高レベルの語彙と文構造を使う。構造情報にある感情と評価のみ反映する',
  };

  if (level < 25) {
    return 'Original as-is (no style change)';
  }
  if (tone === 'custom') {
    return `"${customTone || ''}" style FULL POWER - 段階は無視して常に全力で表現。オジサン構文なら絵文字・カタカナ混ぜ、限界オタクなら感情爆発、ギャルならギャル語、赤ちゃん言葉なら幼児語`;
  }

  const base = baseMap[toneKey] || 'Original as-is';
  const guards: string[] = [];

  const degree = structure?.程度;
  const epistemic = structure?.認識的モダリティ;

  if (tone === 'casual' && level >= 75 && degree && degree !== 'なし') {
    guards.push(`程度=${degree}を維持`);
  }
  if (
    (tone === 'business' || tone === 'formal') &&
    level >= 50 &&
    epistemic &&
    epistemic !== '確定'
  ) {
    guards.push(`認識的モダリティ=${epistemic}を維持`);
  }

  const evidentiality = structure?.証拠性;
  if (evidentiality && evidentiality !== '直接経験') {
    guards.push(`証拠性=${evidentiality}を維持`);
  }

  const communicative = structure?.伝達態度;
  if (communicative && communicative !== 'なし') {
    guards.push(`伝達態度=${communicative}を維持`);
  }

  return guards.length > 0 ? `${base}（${guards.join('、')}）` : base;
}

export async function translatePartial(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, currentTranslation, sourceLang, targetLang, tone, customTone, structure } = options;
  const toneLevel = options.toneLevel ?? 0;

  if (!currentTranslation) {
    throw new Error('currentTranslation is required for PARTIAL mode');
  }

  const structureInfo = structure ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n` : '';
  const seedTranslation = options.seedTranslation
    ?? (options.previousLevel === 0 ? options.previousTranslation : undefined)
    ?? currentTranslation;

  const toneStyle = getToneStyle(toneLevel, tone, structure, customTone);

  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, targetLang, toneLevel, tone, customTone);

  const previousTranslation = options.previousTranslation;
  const previousLevel = options.previousLevel;
  const diffInstruction = previousTranslation ? `前レベル(${previousLevel ?? 0}%): "${previousTranslation}"
→ 上記と明確に差をつける。トーン表現を変え、意味は保持する。` : '';

  const userPrompt = [
    `現在の翻訳 (${targetLang}): ${currentTranslation}`,
    `トーン: ${tone || 'なし'} / ${toneLevel}%`,
    `スタイル: ${toneStyle}`,
    `Seed (0%): "${seedTranslation}"`,
    'Seedが構造値を正しく表現している。トーン調整はその表面だけを変える。',
    structureInfo || '',
    targetLang !== '英語' ? `★ new_translation は必ず ${targetLang} で出力すること` : '',
    diffInstruction || '',
    options.variationInstruction ? `追加指示: ${options.variationInstruction}` : '',
    reverseTranslationInstruction,
    'トーンに合わせて編集し、JSONのみで出力。'
  ].filter(Boolean).join('\n\n');

  console.log('[translatePartial] ===== API CALL =====');
  console.log('[translatePartial] tone:', tone);
  console.log('[translatePartial] toneLevel:', toneLevel);
  console.log('[translatePartial] toneStyle:', toneStyle);
  console.log('[translatePartial] userPrompt:', userPrompt);

  const response = await callGeminiAPI(MODELS.PARTIAL, PARTIAL_SYSTEM_PROMPT, userPrompt, 0);
  console.log('[translatePartial] response:', response);

  const parsed = parseJsonResponse<PartialTranslationResponse>(response);
  if (!parsed.new_translation) {
    const result = applyTranslationLanguageGuard(
      targetLang,
      applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, {
        translation: currentTranslation,
        reverse_translation: parsed.reverse_translation ?? '',
        risk: 'high',
      }))
    );
    console.log('[translatePartial] parsed result:', result);
    return result;
  }

  const result = applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, {
      translation: parsed.new_translation,
      reverse_translation: parsed.reverse_translation ?? '',
      risk: parsed.risk ?? 'high',
    }))
  );
  console.log('[translatePartial] parsed result:', result);

  return result;
}

// ============================================
// ガード付き翻訳
// ============================================

export async function translateWithGuard(
  options: TranslateOptions
): Promise<import('./types').GuardedTranslationResult> {
  const { isNative, currentTranslation } = options;
  const toneLevel = options.toneLevel ?? 0;

  const useFullLevels = toneLevel === 0;
  const usePartialLevels =
    toneLevel === 25 || toneLevel === 50 || toneLevel === 75 || toneLevel === 100;

  if (isNative || useFullLevels) {
    const result = await translateFull(options);
    return { result, usedFull: true, fallbackReason: isNative ? 'native' : 'level_0_full' };
  }

  if (!currentTranslation) {
    const result = await translateFull(options);
    return { result, usedFull: true, fallbackReason: 'missing_current_translation' };
  }

  if (!usePartialLevels) {
    const result = await translateFull(options);
    return { result, usedFull: true, fallbackReason: 'unsupported_tone_level' };
  }

  let partialResult: TranslationResult | null = null;
  let parseError = false;

  try {
    partialResult = await translatePartial({
      ...options,
    });
  } catch (error) {
    console.log('[Guard] PARTIAL parse error:', error);
    parseError = true;
  }

  const decision = shouldFallbackToFull(
    options.sourceText,
    partialResult,
    parseError,
    options.currentTranslation,
    options.sourceLang === '日本語',
    toneLevel,
    options.tone
  );

  if (decision.shouldFallback) {
    console.log(`[Guard] Fallback triggered: ${decision.reason}`);

    if (partialResult && partialResult.translation !== currentTranslation) {
      const translationChanged = !isTooSimilarText(partialResult.translation, currentTranslation!);
      if (translationChanged) {
        console.log(`[Guard] Returning PARTIAL with fallback flag (reason: ${decision.reason})`);
        return { result: partialResult, usedFull: false, fallbackReason: decision.reason };
      }
    }

    console.log(`[Guard] Fallback to current: ${decision.reason}`);
    const safeFallback: TranslationResult = {
      translation: currentTranslation!,
      reverse_translation: options.currentReverseTranslation ?? '',
      risk: 'high',
    };
    return { result: safeFallback, usedFull: false, fallbackReason: `partial_failed_returned_current:${decision.reason}` };
  }

  return { result: partialResult!, usedFull: false, fallbackReason: null };
}

// ============================================
// FULL翻訳
// ============================================

export async function translateFull(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, sourceLang, targetLang, isNative, previousTranslation, previousLevel, structure } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction(options);
  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, targetLang, toneLevel, options.tone, options.customTone);
  const differenceInstruction = getFullDifferenceInstruction(toneLevel, previousTranslation, previousLevel, options.tone);
  const variationInstruction = options.variationInstruction ? `\n${options.variationInstruction}` : '';
  const structureInfo = structure ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n` : '';
  const hasEntities = structure ? structure.固有名詞.length > 0 : false;

  // 構造情報がない場合のみ出力言語を別途指定（構造情報ありの場合は冒頭宣言でカバー済み）
  const langInfoOnly = !structure ? `
【出力言語】
・translation: ${targetLang}
・reverse_translation: ${sourceLang}
` : '';

  const isBusinessOrFormal = options.tone === 'business' || options.tone === 'formal';
  const japaneseRule = (targetLang === '日本語' || sourceLang === '日本語') ? `
【日本語の敬語ルール】
- 正しい敬語を使う（おっしゃる、ご覧になる、召し上がる等）
- 二重敬語を避け、正しい単一の敬語形を使う
${isBusinessOrFormal ? `- ビジネス/丁寧トーンでは必ず敬語（です/ます/ございます）で出力する` : ''}
` : '';

  const languageSpecificRules = getLanguageSpecificRules(targetLang, hasEntities);

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。
${structureInfo}${langInfoOnly}
${TONE_BOUNDARY_RULES}
${japaneseRule}
${languageSpecificRules}

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使用。' : ''}

${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}
${variationInstruction}

【言語検出】
原文の言語を正確に判定し、detected_language に出力すること。
選択肢: 日本語, 英語, フランス語, スペイン語, ドイツ語, イタリア語, ポルトガル語, 韓国語, 中国語, チェコ語

JSON形式で出力：
{
  "translation": "...",
  "reverse_translation": "...",
  "risk": "low|med|high",
  "detected_language": "言語名"
}`;

  const toneDesc = options.tone
    ? `${options.tone}スタイル、強度${toneLevel}%`
    : '自然な翻訳';

  const userPrompt = `以下のテキストを翻訳してください（${toneDesc}）：

${sourceText}`;

  console.log('[translateFull] ===== API CALL =====');
  console.log('[translateFull] tone:', options.tone);
  console.log('[translateFull] toneLevel:', toneLevel);
  console.log('[translateFull] toneInstruction:', toneInstruction);
  console.log('[translateFull] userPrompt:', userPrompt);

  const model = options.tone === 'custom' ? MODELS.JAPANESE_EDIT : MODELS.FULL;
  const response = await callGeminiAPI(model, systemPrompt, userPrompt, 0.3, options.signal);
  console.log('[translateFull] model:', model);
  console.log('[translateFull] response:', response);

  const parsed = parseJsonResponse<TranslationResult>(response);
  const result = applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, parsed))
  );
  console.log('[translateFull] parsed result:', result);

  return result;
}

// ============================================
// 解説生成
// ============================================

function sanitizeExplanation(explanation: ExplanationResult): ExplanationResult {
  return {
    point: explanation.point || '',
    explanation: explanation.explanation || '',
  };
}

export async function generateExplanation(
  translatedText: string,
  _sourceLang: string,
  targetLang: string,
  outputLangCode: string = 'ja'
): Promise<ExplanationResult> {
  const outputLangName = getLangNameFromCode(outputLangCode)
  const targetLangName = getLangNameFromCode(targetLang) || targetLang

  let systemPrompt: string
  let userPrompt: string

  if (outputLangCode === 'ja') {
    systemPrompt = `あなたは${targetLangName}表現の専門家です。
翻訳結果について解説してください。

【出力ルール】
1. point: 核となる単語やフレーズを「${targetLangName}表現 = 日本語の意味」形式で1つ書く
2. explanation: どんなニュアンスか、どんな場面で使えるかを自然な文章で2〜3文書く。項目分けしない。
3. 文体: 必ず「です・ます調」で統一すること

必ず以下のJSON形式で出力：
{
  "point": "${targetLangName}表現 = 意味",
  "explanation": "です・ます調で2〜3文の解説"
}`
    userPrompt = `${targetLangName}翻訳: ${translatedText}

この${targetLangName}表現について日本語（です・ます調）で解説して。`
  } else {
    systemPrompt = `You are an expert in ${targetLangName} expressions.
Explain the translation result.

【Output Rules - Write everything in ${outputLangName}】
1. point: Write the key word/phrase in "${targetLangName} expression = meaning in ${outputLangName}" format
2. explanation: Write 2-3 sentences about the nuance and usage scenarios. No bullet points.

Output ONLY valid JSON:
{
  "point": "${targetLangName} expression = meaning",
  "explanation": "2-3 sentences explanation in ${outputLangName}"
}`
    userPrompt = `${targetLangName} translation: ${translatedText}

Explain this ${targetLangName} expression in ${outputLangName}.`
  }

  const response = await callGeminiAPI(MODELS.FULL, systemPrompt, userPrompt);
  const parsed = parseJsonResponse<ExplanationResult>(response);
  return sanitizeExplanation(parsed);
}

export async function generateToneDifferenceExplanation(
  previousTranslation: string,
  currentTranslation: string,
  previousLevel: number,
  currentLevel: number,
  tone: string,
  sourceLang: string
): Promise<ExplanationResult> {
  const langName = getLangNameFromCode(sourceLang)

  if (previousTranslation === currentTranslation) {
    return {
      point: getDifferenceFromText(sourceLang, previousLevel),
      explanation: getNoChangeText(sourceLang)
    };
  }

  void tone;

  const prevLabel = `${previousLevel}%`;
  const currLabel = `${currentLevel}%`;

  let systemPrompt: string;
  let userPrompt: string;

  if (sourceLang === 'ja') {
    systemPrompt = `あなたは翻訳のニュアンス解説の専門家です。

【出力形式】
1文目: ${currLabel}では${prevLabel}に比べて〜という表現に変化しました。（変化を簡潔に、全文引用しない）
2文目: 相手には〜のように伝わります。（具体的に: 相手がどう感じるか、どんな関係性の相手に適切か、相手にどういう印象を与えるか）

【ルール】
- 上記の形式で2文出力
- 「1文目」「2文目」のラベルは付けない
- 必ず「です・ます調」で統一すること
- JSON不要、テキストのみ

【禁止】
- 「丁寧」「フォーマル」「カジュアル」だけで終わらせない
- 抽象的な形容詞だけの説明は禁止`;
    userPrompt = `${prevLabel}: "${previousTranslation}"
${currLabel}: "${currentTranslation}"

${prevLabel}から${currLabel}への変化を解説してください。`;
  } else {
    systemPrompt = `You are an expert in translation nuance explanation.

【Output Format - Write everything in ${langName}】
Sentence 1: At ${currLabel}, compared to ${prevLabel}, the expression changed to... (briefly describe the change, do not quote the entire sentence)
Sentence 2: The recipient will perceive this as... (be specific: how will they feel, what relationship is this appropriate for, what impression does it give)

【Rules】
- Output exactly 2 sentences in the format above
- Do not add labels like "Sentence 1" or "Sentence 2"
- Keep the description of changes brief (do not quote the full text)
- No JSON, plain text only
- MUST write in ${langName}

【Forbidden】
- Do not end with just "polite", "formal", or "casual"
- Abstract adjectives alone are not allowed`;
    userPrompt = `${prevLabel}: "${previousTranslation}"
${currLabel}: "${currentTranslation}"

Explain the change from ${prevLabel} to ${currLabel} in ${langName}.`;
  }

  const pointText = getDifferenceFromText(sourceLang, previousLevel);

  try {
    const response = await callGeminiAPI(MODELS.FULL, systemPrompt, userPrompt);
    return { point: pointText, explanation: response.trim() };
  } catch (error) {
    console.error('[generateToneDifferenceExplanation] error:', error);
    return { point: pointText, explanation: getFailedToGenerateText(sourceLang) };
  }
}

// ============================================
// 相手メッセージ翻訳
// ============================================

export async function translatePartnerMessage(
  text: string,
  partnerLang: string
): Promise<TranslationResult & { explanation: ExplanationResult }> {
  const translationResult = await translateFull({
    sourceText: text,
    sourceLang: partnerLang,
    targetLang: '日本語',
    isNative: false,
  });

  const explanation = await generateExplanation(text, '日本語', partnerLang);

  return { ...translationResult, explanation };
}
