// OpenAI API 翻訳サービス（翻訳フロー関数のみ）
// 型定義・ガード・プロンプト・i18n・APIは個別ファイルに分離済み

// 型定義を再エクスポート
export type { IntentType, CertaintyLevel, SentimentPolarity, ModalityType, DegreeLevel, EntityType, HonorificType } from './types';
export type { NamedEntity, ExpandedStructure, TranslationResult, PartialTranslationResult, GuardedTranslationResult, ExplanationResult, TranslateOptions, InvariantCheckResult, FallbackDecision, PartialTranslationResponse } from './types';
export type { ModalityClass } from './types';

import type {
  ExpandedStructure,
  NamedEntity,
  IntentType,
  SentimentPolarity,
  ModalityType,
  DegreeLevel,
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
  INVARIANT_RULES,
  TONE_AND_EVALUATION_RULES,
  PARTIAL_SYSTEM_PROMPT,
  JAPANESE_EDIT_SYSTEM_PROMPT,
  EXPANDED_STRUCTURE_PROMPT,
  getLanguageSpecificRules,
  getFullDifferenceInstruction,
  getToneInstruction,
  getReverseTranslationInstruction,
  getToneStyleForJapanese,
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
// 構造化M抽出 v2（拡張ハイブリッド版）- キャッシュ＆関数
// ============================================

const structureCache = new Map<string, ExpandedStructure>();

const INTENT_TYPES: IntentType[] = ['依頼', '確認', '報告', '質問', '感謝', '謝罪', '提案', '命令', 'その他'];
const POLARITY_TYPES: SentimentPolarity[] = ['positive', 'negative', 'neutral'];
const MODALITY_TYPES: ModalityType[] = ['報告', '依頼', '感謝', '質問', '感想', '提案', 'その他'];
const DEGREE_LEVELS: DegreeLevel[] = ['none', 'slight', 'moderate', 'strong', 'extreme'];

const isIntentType = (value: unknown): value is IntentType =>
  typeof value === 'string' && INTENT_TYPES.includes(value as IntentType);

const isSentimentPolarity = (value: unknown): value is SentimentPolarity =>
  typeof value === 'string' && POLARITY_TYPES.includes(value as SentimentPolarity);

const isModalityType = (value: unknown): value is ModalityType =>
  typeof value === 'string' && MODALITY_TYPES.includes(value as ModalityType);

const isDegreeLevel = (value: unknown): value is DegreeLevel =>
  typeof value === 'string' && DEGREE_LEVELS.includes(value as DegreeLevel);

const inferModalityFromIntent = (intent: IntentType): ModalityType => {
  switch (intent) {
    case '依頼':
    case '命令':
      return '依頼';
    case '確認':
    case '質問':
      return '質問';
    case '感謝':
      return '感謝';
    case '提案':
      return '提案';
    case '報告':
      return '報告';
    case '謝罪':
      return '感想';
    default:
      return 'その他';
  }
};

const inferPolarityFromText = (sourceText: string, intent: IntentType): SentimentPolarity => {
  if (intent === '感謝') return 'positive';
  if (intent === '謝罪') return 'negative';

  const positiveMarkers = ['ありがとう', '助か', '嬉', '良か', '最高', '好き', '安心', 'よかった'];
  const negativeMarkers = ['ない', '無理', 'だめ', '最悪', '遅れ', '疲', 'しんど', '不安', '限界', '厳し', 'できない', '嫌'];
  const hasPositive = positiveMarkers.some(marker => sourceText.includes(marker));
  const hasNegative = negativeMarkers.some(marker => sourceText.includes(marker));

  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  return 'neutral';
};

const inferDegreeFromText = (sourceText: string): DegreeLevel => {
  const extremeMarkers = ['完全に', '全然', 'めちゃくちゃ', '極めて', '猛烈に', '超'];
  const strongMarkers = ['かなり', 'めっちゃ', 'すごく', 'とても', 'だいぶ', 'ずいぶん', '非常に'];
  const moderateMarkers = ['割と', 'まあまあ', 'そこそこ', 'あんまり', 'あまり'];
  const slightMarkers = ['ちょっと', '少し', 'やや', '若干', '少々'];

  if (extremeMarkers.some(marker => sourceText.includes(marker))) return 'extreme';
  if (strongMarkers.some(marker => sourceText.includes(marker))) return 'strong';
  if (moderateMarkers.some(marker => sourceText.includes(marker))) return 'moderate';
  if (slightMarkers.some(marker => sourceText.includes(marker))) return 'slight';
  return 'none';
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

const inferSpeechActsFromText = (sourceText: string, intent: IntentType, modality: ModalityType): string[] => {
  const acts: string[] = [];

  const apologyMarkers = ['ごめん', 'すみません', 'すまん', '申し訳', '失礼', '悪いけど', '悪いが'];
  const gratitudeMarkers = ['ありがとう', '感謝', '助かる', '助かりました'];
  const requestMarkers = ['お願い', 'ください', 'してくれる', 'してもらえる', 'してほしい', 'して欲しい', '教えて', '見て', '確認して', '対応して', '頼む'];
  const questionMarkers = ['？', '?', 'かな', 'かね', 'の？', 'の?'];

  if (apologyMarkers.some(marker => sourceText.includes(marker))) acts.push('謝罪');
  if (gratitudeMarkers.some(marker => sourceText.includes(marker))) acts.push('感謝');
  if (intent === '依頼' || intent === '命令' || modality === '依頼' || requestMarkers.some(marker => sourceText.includes(marker))) acts.push('依頼');
  if (intent === '提案' || modality === '提案') acts.push('提案');
  if (intent === '質問' || intent === '確認' || modality === '質問' || questionMarkers.some(marker => sourceText.includes(marker))) acts.push('質問');
  if (modality === '感想') acts.push('感想');
  if (intent === '報告' || modality === '報告') acts.push('報告');

  // 謝罪+叙述の複合文を補足（例: 「ごめん、今は対応できない」）
  const hasApology = apologyMarkers.some(marker => sourceText.includes(marker));
  if (hasApology) {
    const segments = sourceText.split(/[、,。]/).map(s => s.trim()).filter(Boolean);
    const hasNonApologySegment = segments.some(segment =>
      !apologyMarkers.some(marker => segment.includes(marker))
    );
    if (hasNonApologySegment) acts.push('報告');
  }

  if (acts.length === 0) acts.push('報告');
  return Array.from(new Set(acts));
};

/**
 * 日本語テキストから構造を抽出（拡張ハイブリッド版・14項目）
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
    主題: 'なし',
    動作: 'なし',
    動作の意味: 'なし',
    意図: 'その他',
    感情極性: 'neutral',
    モダリティ: 'その他',
    主語: '省略',
    対象: 'なし',
    目的格: 'なし',
    願望: 'なし',
    人称: '一人称単数',
    確信度: '確定',
    程度: 'none',
    発話行為: ['報告'],
    固有名詞: []
  };

  try {
    const response = await callGeminiAPI(
      MODELS.JAPANESE_EDIT,  // nanoの方が精度高い
      EXPANDED_STRUCTURE_PROMPT,
      text,
      0.1,
      signal
    );

    console.log('[extractStructure] raw response:', response);

    let parsed: Partial<ExpandedStructure>;
    try {
      parsed = parseJsonResponse<ExpandedStructure>(response);
    } catch (parseError) {
      console.error('[extractStructure] JSON parse failed, using default:', parseError);
      return defaultStructure;
    }

    // 固有名詞の敬称をバリデート
    const validatedEntities: NamedEntity[] = Array.isArray(parsed.固有名詞)
      ? parsed.固有名詞.map(e => ({
          text: e.text || '',
          type: e.type || 'person',
          読み: e.読み,
          敬称: e.敬称 || 'なし'
        }))
      : [];

    const intent = isIntentType(parsed.意図) ? parsed.意図 : 'その他';
    const modality = isModalityType(parsed.モダリティ)
      ? parsed.モダリティ
      : inferModalityFromIntent(intent);
    const polarity = isSentimentPolarity(parsed.感情極性)
      ? parsed.感情極性
      : inferPolarityFromText(text, intent);
    const degree = isDegreeLevel(parsed.程度)
      ? parsed.程度
      : inferDegreeFromText(text);
    const parsedSpeechActs = normalizeSpeechActs(parsed.発話行為);
    const speechActs = parsedSpeechActs.length > 0
      ? parsedSpeechActs
      : inferSpeechActsFromText(text, intent, modality);

    const validated: ExpandedStructure = {
      主題: parsed.主題 || 'なし',
      動作: parsed.動作 || 'なし',
      動作の意味: parsed.動作の意味 || 'なし',
      意図: intent,
      感情極性: polarity,
      モダリティ: modality,
      主語: parsed.主語 || '省略',
      対象: parsed.対象 || 'なし',
      目的格: parsed.目的格 || 'なし',
      願望: parsed.願望 || 'なし',
      人称: parsed.人称 || '一人称単数',
      確信度: parsed.確信度 || '確定',
      程度: degree,
      発話行為: speechActs,
      固有名詞: validatedEntities
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
    console.error('[extractStructure] error:', error);
    return defaultStructure;
  }
}

// ============================================
// PARTIAL編集
// ============================================

export async function translatePartial(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, currentTranslation, sourceLang, targetLang, tone, customTone, structure } = options;
  const toneLevel = options.toneLevel ?? 0;

  if (!currentTranslation) {
    throw new Error('currentTranslation is required for PARTIAL mode');
  }

  const structureInfo = structure ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n` : '';
const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}（← 全て出力に残すこと）
- 動作の意味: ${structure.動作の意味 || 'なし'}（← 述語の意味カテゴリ。この範囲を逸脱する動詞に変えない）
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記7つの値が変わる翻訳は不合格。
` : '';
  const seedTranslation = options.seedTranslation
    ?? (options.previousLevel === 0 ? options.previousTranslation : undefined)
    ?? currentTranslation;
  const driftPrevention = `
【Seed（0%）= 意味・程度・確信度・コミットメントのアンカー】
Seed: "${seedTranslation}"
- Seedの意味を維持したまま口調のみ変更すること
- Seedより程度を強めない（Seedが"pretty"なら"totally"にしない）
- Seedより確信度を変えない（Seedが"will"なら"might"にしない）
- Seedより約束/意志を弱めない・強めない
- 意味・意図・確信度がSeedからズレていたら修正すること
`;

  let toneStyle = '';
  if (toneLevel < 25) {
    toneStyle = 'Original as-is (no style change)';
  } else {
    switch (tone) {
      case 'casual':
        if (toneLevel >= 100) {
          toneStyle =
            '親しい友人同士の砕けた会話。口語・俗語・砕けた文法を積極的に使う。語彙は最もくだけたものを選ぶ';
        } else if (toneLevel >= 75) {
          toneStyle =
            '友人とのくだけた会話。口語的な省略・短縮を多用し、強い強調表現を使う';
        } else if (toneLevel >= 50) {
          toneStyle =
            '友人との普通の会話。短縮形・軽い強調表現を使い、親しみのある語調にする';
        } else {
          toneStyle =
            '少しくだけた日常会話。基本的な短縮形を使う程度で、語彙は標準的なまま';
        }
        break;
      case 'business':
        if (toneLevel >= 100) {
          toneStyle =
            '重要な取引先への丁寧なビジネスメールの文体。最大限の敬意を込めつつ、受け手が自然に読めるビジネス文書の語彙と構造で書く。主語は構造分析の人称フィールドに従う';
        } else if (toneLevel >= 75) {
          toneStyle =
            '取引先へのビジネスメールの文体。丁寧な語彙選択、完全文、敬意を込めた表現を使う。主語は構造分析の人称フィールドに従う';
        } else if (toneLevel >= 50) {
          toneStyle =
            '社内の上司へのメール程度の文体。適度な敬意表現を使い、簡潔かつ丁寧に。主語は構造分析の人称フィールドに従う';
        } else {
          toneStyle =
            'やや丁寧な日常会話の文体。短縮形を控え、語彙をやや改まったものにする程度。主語は構造分析の人称フィールドに従う';
        }
        break;
      case 'formal':
        if (toneLevel >= 100) {
          toneStyle =
            '公式な式辞・丁寧な手紙の文体。最大限の敬意と謙譲を込め、格式ある語彙と文構造を使う';
        } else if (toneLevel >= 50) {
          toneStyle =
            '改まった場面の文体。敬意ある語彙選択と完全文で、品のある表現を使う';
        } else {
          toneStyle =
            'やや改まった場面の文体。基本的な敬意表現を使い、落ち着いた語調にする';
        }
        break;
      case 'custom':
        toneStyle = `"${customTone || ''}" style FULL POWER - 段階は無視して常に全力で表現。オジサン構文なら絵文字・カタカナ混ぜ、限界オタクなら感情爆発、ギャルならギャル語、赤ちゃん言葉なら幼児語`;
        break;
      default:
        toneStyle = 'Original as-is';
    }
  }

  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, targetLang, toneLevel, tone, customTone);

  const previousTranslation = options.previousTranslation;
  const previousLevel = options.previousLevel;
  const diffInstruction = previousTranslation ? `Previous (${previousLevel ?? 0}%): "${previousTranslation}"
→ Must differ from above. Change tone expression, not meaning.` : '';

  const finalChecklist = `
【FINAL CHECK（出力前に必ず確認）】
□ 程度（degree）: Seedと同じ強さか？強調語を追加していないか？
□ 確信度: Seedと同じモーダル動詞か？（will→might に変えていないか？）
□ コミットメント: 約束・意志表明の強さがSeedと同じか？
□ 発話行為: 構造情報の全発話行為が出力に含まれているか？
□ 条件節: 原文の条件表現（if/when等）が残っているか？
□ 追加事実: Seedにない理由・言い訳・評価を追加していないか？
`;

  const userPrompt = [
    `Current translation (${targetLang}): ${currentTranslation}`,
    `Tone: ${tone || 'none'} at ${toneLevel}%`,
    `Style: ${toneStyle}`,
    structureInfo || '',
    fixedValueDeclaration || '',
    driftPrevention,
    targetLang !== '英語' ? `★ new_translation must be in ${targetLang}. Do not output English.` : '',
    diffInstruction || '',
    options.variationInstruction ? `Additional: ${options.variationInstruction}` : '',
    reverseTranslationInstruction,
    finalChecklist,
    'Edit to match tone. Return JSON only.'
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
    partialResult = await translatePartial(options);
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
  const fixedValueDeclaration = structure ? `
【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
- 程度: ${structure.程度 || 'none'}（← semantic intensity。トーンではない。この値を超える強調は禁止）
- 発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}（← 全て出力に残すこと）
- 動作の意味: ${structure.動作の意味 || 'なし'}（← 述語の意味カテゴリ。この範囲を逸脱する動詞に変えない）
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記7つの値が変わる翻訳は不合格。
` : '';

  const langInfoOnly = !structure ? `
【出力言語 - 絶対遵守】
・翻訳の出力言語: ${targetLang}（translationフィールドは必ずこの言語で出力）
・逆翻訳の出力言語: ${sourceLang}（reverse_translationフィールドは必ずこの言語で出力）
` : '';

  const isBusinessOrFormal = options.tone === 'business' || options.tone === 'formal';
  const japaneseRule = (targetLang === '日本語' || sourceLang === '日本語') ? `
【日本語の敬語ルール】
- 二重敬語は禁止（例: ×おっしゃられる ×ご覧になられる ×お召し上がりになられる）
- 正しい敬語を使う（例: ○おっしゃる ○ご覧になる ○召し上がる）
${isBusinessOrFormal ? `- ビジネス/丁寧トーンでは、原文が敬語でなくても必ず敬語（です/ます/ございます）で出力すること
- 原文「行く」→ 翻訳/逆翻訳「行きます」「参ります」等` : ''}
` : '';

  const languageSpecificRules = getLanguageSpecificRules(targetLang);

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。

★ translation は必ず「${targetLang}」で出力 ★

${structureInfo}
${fixedValueDeclaration}
${langInfoOnly}
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}
${japaneseRule}

【翻訳ルール】
- "translation" は ${targetLang} のみ（${sourceLang}の文字は混ぜない）
- 語尾ルール（だね/じゃん/ですね等）は reverse_translation にのみ適用

${languageSpecificRules}

【固有名詞】構造情報に記載された読みをそのまま使用。トーンで変えない。

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使用。' : ''}

【トーン調整の原則】
トーンは「口調・語彙の格式レベル・文体」でのみ表現する。
意図・確信度・感情極性は変えない。

${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}
${variationInstruction}

【言語検出】
原文の言語を正確に判定し、detected_language に出力すること。
選択肢: 日本語, 英語, フランス語, スペイン語, ドイツ語, イタリア語, ポルトガル語, 韓国語, 中国語, チェコ語

JSON形式で出力：
{
  "translation": "${targetLang}のみ",
  "reverse_translation": "${sourceLang}のみ",
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
3. 文体: 必ず「です・ます調」で統一すること（「〜だ」「〜である」は使わない）

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

// ============================================
// 日本語ベース方式用の関数
// ============================================

export async function editJapaneseForTone(
  sourceText: string,
  tone: string,
  toneLevel: number,
  customTone?: string,
  signal?: AbortSignal,
  structure?: ExpandedStructure
): Promise<string> {
  if (toneLevel === 0) {
    return sourceText;
  }

  const toneStyle = getToneStyleForJapanese(tone, toneLevel, customTone);
  const structureInfo = structure ? `\n${structureToPromptText(structure)}\n` : '';

  const userPrompt = `元の日本語: ${sourceText}
${structureInfo}
トーン: ${tone}
トーンレベル: ${toneLevel}%
目標スタイル: ${toneStyle}

この日本語を${toneLevel}%の${tone}トーンに編集してください。JSONのみ返してください。
※ 構造情報がある場合、「意図」「確信度」「固有名詞」は必ず保持すること。`;

  const response = await callGeminiAPI(MODELS.JAPANESE_EDIT, JAPANESE_EDIT_SYSTEM_PROMPT, userPrompt, 0.7, signal);
  const parsed = parseJsonResponse<{ edited_japanese: string }>(response);

  let result = parsed.edited_japanese || sourceText;

  if (tone === 'business' || tone === 'formal') {
    result = result.replace(/([ぁ-んァ-ン一-龯]+)君/g, '$1さん');
    result = result.replace(/君/g, 'あなた');
    console.log(`[editJapaneseForTone] 君→あなた置換適用: ${result}`);
  }

  return result;
}
