// OpenAI API 翻訳サービス

// モデル定義
export const MODELS = {
  FULL: 'gpt-4.1-nano',    // FULL翻訳・解説用
  PARTIAL: 'gpt-4.1-nano', // PARTIAL編集用
} as const;

// 翻訳結果の型定義
export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
}

export interface GuardedTranslationResult {
  result: TranslationResult;
  usedFull: boolean;
  fallbackReason?: string | null;
}

// 解説の型定義
export interface ExplanationResult {
  meaning: string;
  naturalExpression: string;
  usage: string;
  caution: string;
  wordNotes: string;
}

// 翻訳オプション
export interface TranslateOptions {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  isNative: boolean;
  tone?: string;
  toneLevel?: number;
  customTone?: string;
  variationInstruction?: string;
  // PARTIAL編集用：現在の翻訳結果
  currentTranslation?: string;
  // 差分生成用：前レベルの翻訳結果
  previousTranslation?: string;
  previousLevel?: number;
}

// 不変条件（7項目 + stance_strength）のシステムプロンプト
const INVARIANT_RULES = `
【不変条件 - 翻訳時に絶対守ること】
1. entities - 数字、日付、時刻、金額、固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. modality_class - 依頼/義務/提案のクラスを変えない
5. question/statement - 質問/断定を変えない
6. condition markers - if/unless/when等を保持
7. commitment - 約束を勝手に追加しない
8. stance_strength - 同意や感情の強さを勝手に変えない（例：OKをPerfectに変えない）

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;

const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない（例: 素敵/かわいい/きれい/良い は "nice/lovely/cute/beautiful" の同カテゴリで表現する）
2. cool/sick/dude/huh など評価軸を変える語は禁止
3. reverse_translation は意味を保持しつつ、トーン差を語尾・強調語で必ず表現する（英語が変わった場合は逆翻訳も必ず変える）
4. 服の一般語（洋服/服/服装/コーデ/装い）は clothes/outfit を使う。"dress" は「ドレス/ワンピース」が明示された時だけ使用可
`;

// ============================================
// サーバー側ガード機能
// ============================================

// 編集距離（レーベンシュタイン距離）を計算
function calculateEditDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 削除
          dp[i][j - 1] + 1,     // 挿入
          dp[i - 1][j - 1] + 1  // 置換
        );
      }
    }
  }
  return dp[m][n];
}

function normalizeForCompare(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[“”]/g, '"');
}

function isTooSimilarText(a: string, b: string): boolean {
  const normalizedA = normalizeForCompare(a);
  const normalizedB = normalizeForCompare(b);
  if (normalizedA === normalizedB) return true;

  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return true;
  const distance = calculateEditDistance(normalizedA, normalizedB);
  const distanceRatio = distance / maxLen;
  const lengthRatio = Math.abs(normalizedA.length - normalizedB.length) / maxLen;
  const shortThreshold = maxLen < 20 ? 2 : Math.floor(maxLen * 0.1);

  return distance <= shortThreshold || (distanceRatio <= 0.12 && lengthRatio <= 0.1);
}

// 編集距離の閾値（元テキストの長さに対する比率）
// トーン変更時は逆翻訳も変わりうるので、緩めに設定
const EDIT_DISTANCE_THRESHOLD = 0.95; // 95%以上変わったら怪しい

// 数字・日付・時刻・金額を抽出
function extractEntities(text: string): string[] {
  const patterns = [
    /\d+/g,                           // 数字
    /\d{1,2}[:/-]\d{1,2}/g,           // 時刻・日付形式
    /\$[\d,]+\.?\d*/g,                // ドル
    /¥[\d,]+/g,                       // 円
    /€[\d,]+\.?\d*/g,                 // ユーロ
    /\d+時/g,                         // 日本語時刻
    /\d+分/g,                         // 日本語分
    /\d+日/g,                         // 日本語日付
    /\d+月/g,                         // 日本語月
    /\d+年/g,                         // 日本語年
  ];

  const entities: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) entities.push(...matches);
  }
  return entities;
}

// 肯定/否定マーカーを抽出
function extractPolarityMarkers(text: string): { positive: boolean; negative: boolean } {
  const negativePatterns = [
    /\bnot\b/i, /\bno\b/i, /\bnever\b/i, /\bdon't\b/i, /\bdoesn't\b/i,
    /\bwon't\b/i, /\bcan't\b/i, /\bwouldn't\b/i, /\bshouldn't\b/i,
    /ない/, /しない/, /できない/, /いない/, /なかった/
  ];
  const positivePatterns = [
    /\byes\b/i, /\bsure\b/i, /\bof course\b/i, /\bdefinitely\b/i,
    /はい/, /もちろん/, /できる/, /ある/, /いる/
  ];

  const hasNegative = negativePatterns.some(p => p.test(text));
  const hasPositive = positivePatterns.some(p => p.test(text));

  return { positive: hasPositive, negative: hasNegative };
}

// 疑問文かどうかを判定
function isQuestion(text: string): boolean {
  return /\?$/.test(text.trim()) || /[？]$/.test(text.trim()) ||
    /^(do|does|did|is|are|was|were|will|would|can|could|should|may|might|have|has|had)\s/i.test(text.trim()) ||
    /か[？?]?$/.test(text.trim());
}

// 条件マーカーを抽出
function extractConditionMarkers(text: string): string[] {
  const patterns = [
    /\bif\b/gi, /\bunless\b/gi, /\bwhen\b/gi, /\bwhile\b/gi,
    /\bprovided\b/gi, /\bassuming\b/gi, /\bin case\b/gi,
    /もし/, /ならば/, /なら/, /場合/, /とき/, /たら/
  ];

  const markers: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) markers.push(...matches);
  }
  return markers;
}

function hasJapaneseCharacters(text: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(text);
}

// 不変条件チェック結果の型
interface InvariantCheckResult {
  passed: boolean;
  violations: string[];
}

// 不変条件をチェック
function checkInvariantConditions(
  originalText: string,
  translatedText: string,
  reverseTranslation: string
): InvariantCheckResult {
  const violations: string[] = [];

  // 1. entities - 数字等が保持されているか
  const originalEntities = extractEntities(originalText);
  const translatedEntities = extractEntities(translatedText);
  const reverseEntities = extractEntities(reverseTranslation);

  // 数字が原文にあるのに翻訳・逆翻訳に含まれていない場合
  for (const entity of originalEntities) {
    const numericValue = entity.replace(/[^\d]/g, '');
    const foundInTranslated = translatedEntities.some(e => e.replace(/[^\d]/g, '') === numericValue);
    const foundInReverse = reverseEntities.some(e => e.replace(/[^\d]/g, '') === numericValue);
    if (!foundInTranslated && !foundInReverse) {
      violations.push(`entities: ${entity} が失われている可能性`);
    }
  }

  // 2. polarity - 肯定/否定が変わっていないか
  const originalPolarity = extractPolarityMarkers(originalText);
  const reversePolarity = extractPolarityMarkers(reverseTranslation);
  if (originalPolarity.negative && !reversePolarity.negative) {
    violations.push('polarity: 否定が失われている可能性');
  }
  if (!originalPolarity.negative && reversePolarity.negative) {
    violations.push('polarity: 否定が追加されている可能性');
  }

  // 5. question/statement - 疑問文/平叙文が変わっていないか
  const originalIsQuestion = isQuestion(originalText);
  const reverseIsQuestion = isQuestion(reverseTranslation);
  if (originalIsQuestion !== reverseIsQuestion) {
    violations.push('question/statement: 疑問文/平叙文が変わっている可能性');
  }

  // 6. condition markers - 条件マーカーが保持されているか
  const originalConditions = extractConditionMarkers(originalText);
  const reverseConditions = extractConditionMarkers(reverseTranslation);
  if (originalConditions.length > 0 && reverseConditions.length === 0) {
    violations.push('condition_markers: 条件表現が失われている可能性');
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// フォールバック判定結果の型
interface FallbackDecision {
  shouldFallback: boolean;
  reason: string | null;
}

// ビジネス/超丁寧の敬語チェック
function checkPolitenessGuard(
  tone: string | undefined,
  reverseTranslation: string
): { passed: boolean; reason: string | null } {
  if (tone !== 'business' && tone !== 'formal') {
    return { passed: true, reason: null };
  }

  const text = reverseTranslation.trim();

  // 敬語の必須パターン（です/ます/ございます等で終わるか含む）
  const politePatterns = [
    /です[。！!]?$/,
    /ます[。！!]?$/,
    /ございます/,
    /いただ/,
    /くださ/,
  ];

  // 禁止パターン（カジュアルすぎる語尾・強調語）
  const casualPatterns = [
    /だね[。！!]?$/,      // 「だね」で終わる
    /じゃん/,             // 「じゃん」（位置に関係なく）
    /だよ[ね]?[。！!]?$/, // 「だよ」「だよね」で終わる
    /めっちゃ/,           // 「めっちゃ」（位置に関係なく）
    /超[^丁寧]/,          // 「超」（超丁寧以外）
    /ヤバ/,               // 「ヤバ」（位置に関係なく）
    /マジ/,               // 「マジ」（位置に関係なく）
    /ガチ/,               // 「ガチ」（位置に関係なく）
    /！{2,}/,             // 感嘆符2つ以上
    /!{2,}/,              // 半角感嘆符2つ以上
  ];

  // 禁止パターンが含まれていたらNG
  for (const pattern of casualPatterns) {
    if (pattern.test(text)) {
      return { passed: false, reason: `politeness_violation: casual pattern found` };
    }
  }

  // 敬語パターンが1つも含まれていなかったらNG
  const hasPolitePattern = politePatterns.some(p => p.test(text));
  if (!hasPolitePattern) {
    return { passed: false, reason: `politeness_violation: no polite ending found` };
  }

  return { passed: true, reason: null };
}

// フォールバックが必要かどうかを判定
function shouldFallbackToFull(
  originalText: string,
  result: TranslationResult | null,
  parseError: boolean = false,
  currentTranslation?: string,
  requireJapaneseReverse: boolean = false,
  toneLevel: number = 0,
  tone?: string
): FallbackDecision {
  // 1. JSONパース失敗
  if (parseError || !result) {
    return { shouldFallback: true, reason: 'json_parse_error' };
  }

  // 2. reverse_translation が日本語でない/空の場合
  if (requireJapaneseReverse) {
    const reverseText = result.reverse_translation?.trim() ?? '';
    if (!reverseText || !hasJapaneseCharacters(reverseText)) {
      return { shouldFallback: true, reason: 'reverse_translation_invalid' };
    }
    if (toneLevel > 0 && isTooSimilarText(reverseText, originalText)) {
      return { shouldFallback: true, reason: 'reverse_translation_too_similar' };
    }
  }

  // 3. 編集距離が大きすぎる（8Bが翻訳し直した疑い）
  const editDistanceBase = currentTranslation ?? originalText;
  const editDistance = calculateEditDistance(editDistanceBase, result.translation);
  const threshold = Math.floor(editDistanceBase.length * EDIT_DISTANCE_THRESHOLD);
  if (editDistance > threshold) {
    return { shouldFallback: true, reason: 'edit_distance_too_large' };
  }

  // 4. 不変条件NG
  const invariantCheck = checkInvariantConditions(
    originalText,
    result.translation,
    result.reverse_translation
  );
  if (!invariantCheck.passed) {
    return { shouldFallback: true, reason: `invariant_violation: ${invariantCheck.violations.join(', ')}` };
  }

  // 5. risk=high
  if (result.risk === 'high') {
    return { shouldFallback: true, reason: 'high_risk' };
  }

  // 6. ビジネス/超丁寧の敬語チェック
  if (requireJapaneseReverse && result) {
    const politeCheck = checkPolitenessGuard(tone, result.reverse_translation);
    if (!politeCheck.passed) {
      return { shouldFallback: true, reason: politeCheck.reason };
    }
  }

  return { shouldFallback: false, reason: null };
}

// PARTIAL用システムプロンプト（トーンレベル指示はuserPromptで渡す）
const PARTIAL_SYSTEM_PROMPT = `You are NijiChat in PARTIAL mode.
Your job is to EDIT the given current_translation to match the requested tone level. Do NOT translate from scratch.

ABSOLUTE RULE: Do not re-translate. Edit current_translation only.

[Hard invariants - must preserve]
1. entities - numbers, dates, times, amounts, proper nouns must stay identical
2. polarity - positive/negative must not flip
3. locked_terms - glossary terms must be used as-is
4. modality_class - request/obligation/suggestion class must not change
5. question/statement - question vs statement must not change
6. condition markers - if/unless/when must be preserved
7. commitment - do not add promises that weren't there
8. stance_strength - do not change intensity of agreement/emotion (e.g., OK → Perfect is forbidden)

${TONE_AND_EVALUATION_RULES}

[Tone Level Guide - MUST follow strictly]
- 0-24%: Original as-is - No style change, natural translation
- 25-49%: Slightly styled - Light application of the selected tone
- 50-74%: Standard styled - Normal application of the selected tone
- 75-99%: Strong styled - Heavy application of the selected tone
- 100%: Maximum styled - Extreme application of the selected tone

The style depends on the selected tone type (casual/business/formal).

Allowed edits (surface-level only):
- Tone: politeness level, contractions, punctuation, honorifics, hedging

Forbidden edits:
- Any change that alters meaning
- Creative idioms or metaphors not in original
- If risk=high, output new_translation identical to current_translation
- reverse_translation must be Japanese, and must show at least one tone-level-specific change (ending/particle/emphasis/punctuation) per tone level

Return ONLY valid JSON (no markdown, no explanation).
Use exactly these 3 keys (no extra keys):
{"new_translation":"...","reverse_translation":"...(Japanese)","risk":"low|med|high"}`;

function applyEvaluationWordGuard(
  sourceText: string,
  result: TranslationResult
): TranslationResult {
  if (sourceText.includes('素敵') && !result.reverse_translation.includes('素敵')) {
    return { ...result, risk: 'high' };
  }
  const generalClothingTerms = ['洋服', '服装', '服', 'コーデ', '装い'];
  const explicitDressTerms = ['ドレス', 'ワンピース'];
  const hasGeneralClothing = generalClothingTerms.some(term => sourceText.includes(term));
  const hasExplicitDress = explicitDressTerms.some(term => sourceText.includes(term));
  if (hasGeneralClothing && !hasExplicitDress && /dress/i.test(result.translation)) {
    return { ...result, risk: 'high' };
  }
  return result;
}

function applyReverseTranslationGuard(
  sourceLang: string,
  result: TranslationResult
): TranslationResult {
  if (sourceLang !== '日本語') {
    return result;
  }
  const reverseText = result.reverse_translation?.trim() ?? '';
  if (!reverseText || !hasJapaneseCharacters(reverseText)) {
    return { ...result, risk: 'high' };
  }
  return result;
}

// translationフィールドに日本語が混入していないかチェック
function applyTranslationLanguageGuard(
  targetLang: string,
  result: TranslationResult
): TranslationResult {
  // ターゲットが日本語の場合はチェック不要
  if (targetLang === '日本語') {
    return result;
  }
  // translationに日本語が混入していたらrisk=highにする
  const hasJapanese = /[ぁ-んァ-ン一-龯]/.test(result.translation);
  if (hasJapanese) {
    console.warn('[applyTranslationLanguageGuard] Japanese detected in translation:', result.translation);
    // 日本語部分を除去して返す
    const cleanedTranslation = result.translation.replace(/[ぁ-んァ-ン一-龯！？。、]+/g, '').trim();
    return {
      ...result,
      translation: cleanedTranslation || result.translation,
      risk: 'high'
    };
  }
  return result;
}

interface PartialTranslationResponse {
  new_translation?: string;
  reverse_translation?: string;
  risk?: 'low' | 'med' | 'high';
}

// PARTIAL編集を実行（8Bモデル）
export async function translatePartial(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, currentTranslation, sourceLang, targetLang, tone, customTone } = options;
  const toneLevel = options.toneLevel ?? 0;

  if (!currentTranslation) {
    throw new Error('currentTranslation is required for PARTIAL mode');
  }

  // トーンスタイル×レベルに応じた説明
  let toneStyle = '';
  if (toneLevel < 25) {
    toneStyle = 'Original as-is (no style change)';
  } else {
    const intensityMap: Record<string, string> = {
      '25': 'slightly',
      '50': 'standard',
      '75': 'strongly',
      '100': 'maximum'
    };
    const bucket = toneLevel < 50 ? '25' : toneLevel < 75 ? '50' : toneLevel < 100 ? '75' : '100';
    const intensity = intensityMap[bucket];

    switch (tone) {
      case 'casual':
        toneStyle = toneLevel >= 100
          ? 'Maximum casual (slang, gonna/wanna/gotta, very friendly)'
          : `${intensity} casual (friendly, contractions OK)`;
        break;
      case 'business':
        toneStyle = toneLevel >= 100
          ? 'Maximum business/formal (very polite, no contractions, professional)'
          : `${intensity} business (polite, professional tone)`;
        break;
      case 'formal':
        toneStyle = toneLevel >= 100
          ? 'Maximum formal (highest politeness, honorifics, humble expressions)'
          : `${intensity} formal (polite, respectful)`;
        break;
      case 'custom':
        toneStyle = `${intensity} "${customTone || ''}" style`;
        break;
      default:
        toneStyle = 'Original as-is';
    }
  }

  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, toneLevel, tone);
  const userPrompt = `Original (${sourceLang}): ${sourceText}
Current translation (${targetLang}): ${currentTranslation}

REQUIRED TONE: ${tone || 'none'} at ${toneLevel}%
Target style: ${toneStyle}
${reverseTranslationInstruction}

Edit the current_translation to match the tone level ${toneLevel}%. ${toneLevel < 25 ? 'Keep it as natural translation without style changes.' : `Apply ${toneStyle} to the translation.`} Return JSON only.`;

  console.log('[translatePartial] ===== API CALL =====');
  console.log('[translatePartial] tone:', tone);
  console.log('[translatePartial] toneLevel:', toneLevel);
  console.log('[translatePartial] toneStyle:', toneStyle);
  console.log('[translatePartial] userPrompt:', userPrompt);

  const response = await callOpenAIAPI(MODELS.PARTIAL, PARTIAL_SYSTEM_PROMPT, userPrompt, 0);
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

// ガード付き翻訳
// Native=ON → 常にFULL
// Native=OFF かつ currentTranslation あり → PARTIAL → フォールバック判定
export async function translateWithGuard(
  options: TranslateOptions
): Promise<GuardedTranslationResult> {
  const { isNative, currentTranslation } = options;
  const toneLevel = options.toneLevel ?? 0;
  const useFullLevels = toneLevel === 0 || toneLevel === 75 || toneLevel === 100;
  const usePartialLevels = toneLevel === 25 || toneLevel === 50;

  // Native=ON または FULLレベル → FULL
  if (isNative || useFullLevels) {
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: isNative ? 'native' : 'full_level',
    };
  }

  if (!usePartialLevels || !currentTranslation) {
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: !currentTranslation ? 'missing_current_translation' : 'unsupported_tone_level',
    };
  }

  // Native=OFF かつ PARTIALレベル → PARTIAL編集を試みる
  let partialResult: TranslationResult | null = null;
  let parseError = false;

  try {
    partialResult = await translatePartial(options);
  } catch (error) {
    console.log('[Guard] PARTIAL parse error:', error);
    parseError = true;
  }

  // フォールバック判定
  const decision = shouldFallbackToFull(
    options.sourceText,
    partialResult,
    parseError,
    options.currentTranslation,
    options.sourceLang === '日本語',
    toneLevel,
    options.tone
  );

  // 必要ならフォールバック
  if (decision.shouldFallback) {
    console.log(`[Guard] Fallback to FULL: ${decision.reason}`);
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: decision.reason,
    };
  }

  // PARTIAL結果を返す
  return {
    result: partialResult!,
    usedFull: false,
    fallbackReason: null,
  };
}

// エクスポート（テスト用）
export const _internal = {
  calculateEditDistance,
  extractEntities,
  extractPolarityMarkers,
  isQuestion,
  extractConditionMarkers,
  checkInvariantConditions,
  shouldFallbackToFull,
};

// APIキー取得
const getApiKey = (): string => {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('VITE_OPENAI_API_KEY is not set');
  }
  return key;
};

class OpenAIApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = 'OpenAIApiError';
    this.status = status;
    this.details = details;
  }
}

const getOpenAIErrorMessage = (status: number): string => {
  if (status === 401) {
    return 'OpenAI API の認証に失敗しました（401）。APIキーを確認してください。';
  }
  if (status === 403) {
    return 'OpenAI API へのアクセスが拒否されました（403）。APIキー設定をご確認ください。';
  }
  if (status === 429) {
    return 'OpenAI API のレート制限に到達しました（429）。しばらく待ってから再試行してください。';
  }
  if (status >= 500) {
    return `OpenAI API のサーバーエラーが発生しました（${status}）。時間をおいて再試行してください。`;
  }
  return `OpenAI API エラーが発生しました（${status}）。`;
};

// OpenAI API呼び出し
async function callOpenAIAPI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OpenAIApiError(response.status, getOpenAIErrorMessage(response.status), error);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// JSONをパース（マークダウンコードブロックも対応）
function parseJsonResponse<T>(text: string): T {
  // ```json ... ``` を除去
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// トーンスタイル×レベルに応じた指示を生成
function getToneStyleInstruction(tone: string | undefined, toneLevel: number, customTone?: string): string {
  // 0-24%: 原文そのまま
  if (toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし`;
  }

  // トーンが選択されていない場合
  if (!tone) {
    return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }

  // 強度の説明
  let intensityLabel = '';
  let intensityDesc = '';
  if (toneLevel < 50) {
    intensityLabel = '多少';
    intensityDesc = '軽く';
  } else if (toneLevel < 75) {
    intensityLabel = '';
    intensityDesc = '標準的に';
  } else if (toneLevel < 100) {
    intensityLabel = '結構';
    intensityDesc = 'しっかり';
  } else {
    intensityLabel = 'めちゃくちゃ';
    intensityDesc = '最大限に';
  }

  // スタイル別の指示
  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 省略形を積極的に使用（gonna, wanna, gotta）
- 文法より勢い重視`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${intensityDesc}くだけた表現に
- 省略形OK（I'm, don't, can't）
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス敬語
- 省略形は一切使わない
- 例: "I would be most grateful if...", "It is my pleasure to inform you that...", "I sincerely appreciate your consideration."
- 格式高く丁重な表現`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}ビジネス】
- ${intensityDesc}ビジネスライクに
- 省略形は避ける（I am, do not, cannot）
- 例: "Thank you for your time.", "I would suggest...", "Please let me know."
- プロフェッショナルなトーン`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃ丁寧（最大級の敬語・謙譲語）】
- 最上級の敬意を示す表現
- 謙譲語・尊敬語を最大限に使用
- 例: "I would be deeply honored...", "Your esteemed presence...", "I humbly request..."
- 最高の礼儀と敬意`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}丁寧】
- ${intensityDesc}丁寧な表現に
- 敬意を込めた言い回し
- 例: "I appreciate your help.", "Would you mind...", "I am grateful for..."
- 礼儀正しいトーン`;

    case 'custom':
      return `【トーンレベル: ${toneLevel}% - カスタム: ${customTone || '指定なし'}】
- 「${customTone || ''}」のスタイルを${intensityDesc}適用
- 強度: ${toneLevel}%`;

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

function getFullDifferenceInstruction(
  toneLevel: number,
  previousTranslation?: string,
  previousLevel?: number
): string {
  // 前レベルの結果がない場合は従来通り
  if (!previousTranslation) {
    if (toneLevel === 75) {
      return `【FULL(75) 差分必須】
- 意味は固定したまま、構文・語順・言い回しを積極的に変える
- 50%の出力と同一/ほぼ同一は禁止（言い換え・語順変更・別の自然表現）
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- casual の場合は勢いを上げる（テンション高めの表現）`;
    }
    if (toneLevel === 100) {
      return `【FULL(100) 差分必須】
- 75%よりさらに「パンチ強く/感嘆」などで明確に別物にする
- 50%/75%と同一/ほぼ同一は禁止
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- casual の場合は勢いMAX（テンション高め + 強めの感嘆）`;
    }
    return '';
  }

  // 前レベルの結果がある場合は具体的に示す
  if (toneLevel === 75) {
    return `【FULL(75) 差分必須 - 重要】
■ 前レベル(${previousLevel ?? 50}%)の翻訳結果:
"${previousTranslation}"

■ 上記と必ず異なる表現にすること:
- 上記の翻訳と同一/ほぼ同一は絶対禁止
- 意味は固定したまま、以下のいずれかを必ず変える:
  1. 語順を入れ替える
  2. 能動態⇔受動態を変える
  3. 異なる同義語を使う
  4. 文の構造を変える
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- casual の場合は勢いを上げる（テンション高めの表現）`;
  }

  if (toneLevel === 100) {
    return `【FULL(100) 差分必須 - 最重要】
■ 前レベル(${previousLevel ?? 75}%)の翻訳結果:
"${previousTranslation}"

■ 上記と大幅に異なる表現にすること:
- 上記の翻訳と同一/ほぼ同一は絶対禁止
- 75%よりさらにパンチ強く:
  1. 感嘆詞を追加（Wow!, Oh!, Amazing!など）
  2. より強い表現に置き換え
  3. 文の構造を完全に変える
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- casual の場合は勢いMAX（スラング・強調表現をフル活用）`;
  }

  return '';
}

// トーン指示を生成
function getToneInstruction(options: TranslateOptions): string {
  const { tone, toneLevel = 0, customTone } = options;
  return getToneStyleInstruction(tone, toneLevel, customTone);
}

function getReverseTranslationInstruction(sourceLang: string, toneLevel: number, tone?: string): string {
  if (sourceLang !== '日本語') {
    return '';
  }

  // ビジネス/formal用の署名ルール（敬語のみ）
  const businessFormalSignature = `
【逆翻訳の語尾署名ルール - ビジネス/formal専用】
※ 語尾は以下から「1つだけ」選んで文末に使用すること

- 0%: 「〜です。」または「〜ます。」（どちらか1つ）
- 25%: 「〜ですね。」または「〜ございます。」（どちらか1つ）
- 50%: 「〜でございます。」
- 75%: 「〜でございますね。」
- 100%: 「〜でございます。」または「〜いただければ幸いです。」（どちらか1つ）

【絶対禁止 - 二重語尾】
❌「ですね。ございます。」「ます。です。」「だね。ますね。」
→ このような語尾の重複・連結は絶対禁止
→ 元の文の語尾に追加で敬語を足すことも禁止

【強調語 - ビジネス/formal専用】
- 全レベル共通: 「大変」「誠に」「非常に」のみ使用可
- 禁止語: 「マジ」「めっちゃ」「超」「ガチ」「ヤバ」は絶対禁止
- 感嘆符: 「！」は1つまで。「！！」は禁止

【禁止語尾 - ビジネス/formal専用】
- 「だね」「じゃん」「だよ」「よね」は全レベルで禁止
- 必ず「です/ます/ございます」系で終えること`;

  // カジュアル用の署名ルール
  const casualSignature = `
【逆翻訳の語尾署名ルール - casual専用】
※ 語尾は以下から「1つだけ」選んで文末に使用すること

- 0%: 「〜です。」または「〜ます。」（どちらか1つ）
- 25%: 「〜ですね。」または「〜ますね。」（どちらか1つ）
- 50%: 「〜だね！」または「〜よね！」（どちらか1つ）
- 75%: 「〜じゃん！」または「〜だよ！」（どちらか1つ）
- 100%: 「〜じゃん！！」または「〜だよね！！」（どちらか1つ）

【絶対禁止 - 二重語尾】
❌「だね！じゃん！」「ますね。ですね。」
→ 語尾の重複・連結は絶対禁止

【強調語の段階化 - casual専用】
- 0%: とても、大変
- 25%: とっても、かなり
- 50%: すごく、けっこう
- 75%: めっちゃ、超
- 100%: マジで、ガチで、めっちゃ`;

  const isBusinessOrFormal = tone === 'business' || tone === 'formal';
  const endingSignature = isBusinessOrFormal ? businessFormalSignature : casualSignature;

  const toneHints = tone === 'casual'
    ? `【casualトーン】
- 口語OK、友達口調
- 75%以上はテンション高めに`
    : tone === 'business'
      ? `【businessトーン - 重要】
- 全レベルで「です/ます/ございます」で終える
- 「マジ」「めっちゃ」「超」「じゃん」「だよ」「！！」は絶対禁止
- 強調語は「大変」「誠に」「非常に」のみ
- ビジネス敬語を維持すること`
      : tone === 'formal'
        ? `【formalトーン（超丁寧） - 重要】
- 全レベルで最上級敬語「ございます」「でいらっしゃいます」を使用
- 「マジ」「めっちゃ」「超」「じゃん」「だよ」「！！」は絶対禁止
- 強調語は「誠に」「大変」「非常に」のみ
- 最高の敬意を示す表現を使うこと`
        : `【customトーン】
- 指定トーンに合わせて語尾・強調語・句読点で差を作る`;

  return `【逆翻訳ルール（日本語固定）】
- reverse_translation は必ず日本語で出力（英語混入禁止、空禁止）
- tone_level=${toneLevel}% に応じて、下記の署名ルールを必ず守る
- 隣接レベル(25%と50%等)で同一の逆翻訳は絶対禁止。必ず最低1箇所は変える

${endingSignature}

${toneHints}`;
}

// FULL翻訳を実行
export async function translateFull(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, sourceLang, targetLang, isNative, previousTranslation, previousLevel } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction(options);
  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, toneLevel, options.tone);
  const differenceInstruction = getFullDifferenceInstruction(toneLevel, previousTranslation, previousLevel);
  const variationInstruction = options.variationInstruction ? `\n${options.variationInstruction}` : '';

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【絶対ルール - translation フィールド】
- "translation" は ${targetLang} のみで出力すること
- ${sourceLang}の文字は絶対に混ぜない
- 語尾の「だね」「じゃん」「ですね」「ございます」等は translation には絶対に入れない
- これらの語尾ルールは reverse_translation にのみ適用する

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使ってください。' : ''}

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}
${variationInstruction}

必ず以下のJSON形式で出力してください：
{
  "translation": "${targetLang}のみの翻訳（${sourceLang}の文字は絶対に含めない）",
  "reverse_translation": "${sourceLang}のみの逆翻訳（語尾ルールはここにのみ適用）",
  "risk": "low|med|high"
}

riskの判定基準：
- low: 意味が正確に伝わる
- med: 微妙なニュアンスの違いがある可能性
- high: 誤解を招く可能性がある`;

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

  const response = await callOpenAIAPI(MODELS.FULL, systemPrompt, userPrompt);
  console.log('[translateFull] response:', response);

  const parsed = parseJsonResponse<TranslationResult>(response);
  const result = applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, parsed))
  );
  console.log('[translateFull] parsed result:', result);

  return result;
}

// 解説の英語混入をチェック・修正
function sanitizeExplanation(explanation: ExplanationResult): ExplanationResult {
  const sanitizeField = (text: string): string => {
    if (!text) return text;

    // 引用符で囲まれた英語（例文）は許可
    // それ以外の英単語を検出
    const englishWordPattern = /(?<![""'「『])\b[A-Za-z]{3,}\b(?![""'」』])/g;

    // 英語が多く含まれている場合は警告ログ
    const matches = text.match(englishWordPattern);
    if (matches && matches.length > 2) {
      console.warn('[sanitizeExplanation] English words detected:', matches);
    }

    return text;
  };

  return {
    meaning: sanitizeField(explanation.meaning),
    naturalExpression: sanitizeField(explanation.naturalExpression),
    usage: sanitizeField(explanation.usage),
    caution: sanitizeField(explanation.caution),
    wordNotes: sanitizeField(explanation.wordNotes),
  };
}

// 解説を生成
export async function generateExplanation(
  translatedText: string,
  sourceLang: string,
  targetLang: string
): Promise<ExplanationResult> {
  const systemPrompt = `あなたは${targetLang}の表現の専門家です。
翻訳結果の${targetLang}表現についてNANI翻訳風に簡潔に解説してください。

【重要ルール】
- ${targetLang}の翻訳結果について解説する（${sourceLang}の原文の解説ではない！）
- すべて日本語で記述（英語混入は禁止。例文引用のときだけ英語OK）
- 各項目は1〜2行で超簡潔に

必ず以下のJSON形式で出力：
{
  "meaning": "意味の要約（日本語）",
  "naturalExpression": "自然な言い回しの特徴（日本語）",
  "usage": "使う場面（日本語）",
  "caution": "注意点（なければ空文字）",
  "wordNotes": "単語メモ（なければ空文字）"
}

【出力例】「I'm super happy」の解説：
{
  "meaning": "とても嬉しいという強い感情を表す",
  "naturalExpression": "カジュアルで勢いのある言い方",
  "usage": "友達同士の会話向け",
  "caution": "ビジネスには不向き",
  "wordNotes": "super = とても"
}

【出力例】「Thank you for your time」の解説：
{
  "meaning": "時間を取ってくれたことへのお礼",
  "naturalExpression": "丁寧で落ち着いた表現",
  "usage": "ビジネスやフォーマルな場面",
  "caution": "",
  "wordNotes": "time = 時間"
}`;

  const userPrompt = `${targetLang}翻訳: ${translatedText}

この${targetLang}表現について解説して。`;

  const response = await callOpenAIAPI(MODELS.FULL, systemPrompt, userPrompt);
  const parsed = parseJsonResponse<ExplanationResult>(response);

  // 英語混入チェックを追加
  return sanitizeExplanation(parsed);
}

// 相手のメッセージを翻訳（外国語→日本語）
export async function translatePartnerMessage(
  text: string,
  partnerLang: string
): Promise<TranslationResult & { explanation: ExplanationResult }> {
  // まず翻訳
  const translationResult = await translateFull({
    sourceText: text,
    sourceLang: partnerLang,
    targetLang: '日本語',
    isNative: false,
  });

  // 解説を生成
  const explanation = await generateExplanation(
    translationResult.translation,
    partnerLang,
    '日本語'
  );

  return {
    ...translationResult,
    explanation,
  };
}
