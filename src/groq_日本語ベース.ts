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
  point: string;
  explanation: string;
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
  currentReverseTranslation?: string;
  // 差分生成用：前レベルの翻訳結果
  previousTranslation?: string;
  previousLevel?: number;
  // キャンセル用
  signal?: AbortSignal;
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

// modality_class を抽出（request/confirmation/suggestion/obligation判定）
type ModalityClass = 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'statement';

function extractModalityClass(text: string): ModalityClass {
  const normalized = text.trim().toLowerCase();

  // request（依頼）パターン - 「してくれる？」「してもらえる？」など
  const requestPatterns = [
    /^can you\b/i,
    /^could you\b/i,
    /^would you\b/i,
    /^will you\b/i,
    /\bplease\b.*\?$/i,
    /^would you mind\b/i,
    /してくれ/,
    /してもらえ/,
    /お願い/,
    /していただ/,
    /くれる[？?]$/,
    /もらえる[？?]$/,
    /いただける[？?]$/,
  ];

  // confirmation（確認）パターン - 「〜するの？」「〜なの？」など
  const confirmationPatterns = [
    /^are you\b.*\?$/i,
    /^is it\b.*\?$/i,
    /^is this\b.*\?$/i,
    /^is that\b.*\?$/i,
    /^did you\b.*\?$/i,
    /^do you\b.*\?$/i,
    /^does\b.*\?$/i,
    /^have you\b.*\?$/i,
    /^has\b.*\?$/i,
    /するの[？?]$/,
    /なの[？?]$/,
    /ですか[？?]?$/,
    /ますか[？?]?$/,
    /でしょうか/,
  ];

  // suggestion（提案）パターン
  const suggestionPatterns = [
    /^how about\b/i,
    /^why don't (we|you)\b/i,
    /^let's\b/i,
    /^shall we\b/i,
    /^what if\b/i,
    /しよう[？?]?$/,
    /しない[？?]$/,
    /どう[？?]$/,
  ];

  // obligation（義務）パターン
  const obligationPatterns = [
    /\bmust\b/i,
    /\bhave to\b/i,
    /\bneed to\b/i,
    /\bshould\b/i,
    /しなければ/,
    /しないと/,
    /べき/,
    /なくてはいけない/,
  ];

  // パターンマッチング（優先度順）
  if (requestPatterns.some(p => p.test(normalized))) return 'request';
  if (confirmationPatterns.some(p => p.test(normalized))) return 'confirmation';
  if (suggestionPatterns.some(p => p.test(normalized))) return 'suggestion';
  if (obligationPatterns.some(p => p.test(normalized))) return 'obligation';

  return 'statement';
}

// modality_classの一貫性チェック
function checkModalityConsistency(
  originalText: string,
  translatedText: string
): { passed: boolean; reason: string | null } {
  const originalModality = extractModalityClass(originalText);
  const translatedModality = extractModalityClass(translatedText);

  // statementは緩い判定（他のクラスがより重要）
  if (originalModality === 'statement' || translatedModality === 'statement') {
    return { passed: true, reason: null };
  }

  // request/confirmationの混同は特に危険
  if (
    (originalModality === 'request' && translatedModality === 'confirmation') ||
    (originalModality === 'confirmation' && translatedModality === 'request')
  ) {
    return {
      passed: false,
      reason: `modality_violation: ${originalModality} → ${translatedModality}`
    };
  }

  // その他のmodality変更もチェック
  if (originalModality !== translatedModality) {
    return {
      passed: false,
      reason: `modality_violation: ${originalModality} → ${translatedModality}`
    };
  }

  return { passed: true, reason: null };
}

// フォールバック判定結果の型
interface FallbackDecision {
  shouldFallback: boolean;
  reason: string | null;
}

// ビジネス/超丁寧の敬語チェック
export function checkPolitenessGuard(
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

  // 7. modality_class一貫性チェック（request/confirmation混同防止）
  if (currentTranslation) {
    const modalityCheck = checkModalityConsistency(currentTranslation, result.translation);
    if (!modalityCheck.passed) {
      return { shouldFallback: true, reason: modalityCheck.reason };
    }
  }

  // 8. originalTextとresult.translationのmodality_class一貫性チェック
  const originalModalityCheck = checkModalityConsistency(originalText, result.translation);
  if (!originalModalityCheck.passed) {
    return { shouldFallback: true, reason: `original_${originalModalityCheck.reason}` };
  }

  return { shouldFallback: false, reason: null };
}

// PARTIAL用システムプロンプト（トーンレベル指示はuserPromptで渡す）
const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo in PARTIAL mode.
Your job is to EDIT the given current_translation to match the requested tone level. Do NOT translate from scratch.

ABSOLUTE RULE: Do not re-translate. Edit current_translation only.

[Hard invariants - must preserve]
1. entities - numbers, dates, times, amounts, proper nouns must stay identical
2. polarity - positive/negative must not flip
3. locked_terms - glossary terms must be used as-is
4. modality_class - request/obligation/suggestion class must not change
   ★★★ CRITICAL: This is the MOST IMPORTANT rule for tone editing. ★★★
   ★ The modality_class of the ORIGINAL text must be preserved in the output.
   - "request" (asking someone to do something): "Could you...?", "Please...", "Would you mind...?"
   - "confirmation" (checking/confirming facts): "Is it...?", "Are you...?", "Did you...?"
   - "suggestion" (proposing an idea): "How about...?", "Why don't we...?", "Let's..."
   - "obligation" (expressing necessity): "You must...", "You need to...", "You have to..."
   ★ NEVER change a request into a confirmation or vice versa.
   ★ NEVER change the original modality_class even when editing for tone.
   ★ Example: "Can you come at 3?" (request) → "Will you come at 3?" (request) ✓
   ★ Example: "Can you come at 3?" (request) → "Are you coming at 3?" (confirmation) ✗ FORBIDDEN
   ★ Example: "それできる？" (request) → "それできますか？" (request) ✓
   ★ Example: "それできる？" (request) → "それしますか？" (confirmation) ✗ FORBIDDEN
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

// 二重語尾を修正する後処理関数
function fixDoubleEnding(text: string): string {
  return text
    // カジュアル系（25%付近）
    .replace(/ですねね[。！!]?$/, 'ですね。')
    .replace(/ますねね[。！!]?$/, 'ますね。')
    .replace(/だね[！!]+ですね[。]?$/, 'だね！')
    .replace(/だよ[！!]+ですね[。]?$/, 'だよ！')
    .replace(/よね[！!]+ですね[。]?$/, 'よね！')
    .replace(/じゃん[！!]+ですね[。]?$/, 'じゃん！')
    .replace(/ございますございます/, 'ございます')
    // カジュアル系（75%, 100%用）
    .replace(/だよね?じゃん[！!]*$/, 'じゃん！')
    .replace(/じゃん[！!]*だよね?[！!]*$/, 'じゃん！！')
    .replace(/だよ[！!]+じゃん[！!]*$/, 'じゃん！')
    .replace(/じゃん[！!]+だよ[！!]*$/, 'じゃん！！')
    .replace(/よね[！!]+じゃん[！!]*$/, 'じゃん！')
    .replace(/じゃん[！!]+よね[！!]*$/, 'じゃん！！')
    // カジュアル系の混合パターン
    .replace(/だね[！!]+じゃん[！!]*$/, 'じゃん！')
    .replace(/だよ[！!]+だね[！!]*$/, 'だね！')
    .replace(/よね[！!]+だね[！!]*$/, 'だね！')
    .replace(/だね[！!]+だよ[！!]*$/, 'だよ！')
    .replace(/ですね[。]?だね[！!]*$/, 'だね！')
    .replace(/ますね[。]?だね[！!]*$/, 'だね！')
    // 「よ」+「じゃん」等の二重語尾パターン
    .replace(/よじゃん[！!]*$/, 'じゃん！')
    .replace(/ないよじゃん[！!]*$/, 'ないじゃん！')
    .replace(/だよじゃん[！!]*$/, 'じゃん！')
    .replace(/よ[！!]+じゃん[！!]*$/, 'じゃん！')
    // ビジネス・フォーマル系
    .replace(/ですねでございます[。]?$/, 'でございます。')
    .replace(/ますねでございます[。]?$/, 'でございます。')
    .replace(/ですねございます[。]?$/, 'でございます。')
    .replace(/ですでございます[。]?$/, 'でございます。')
    .replace(/ますでございます[。]?$/, 'でございます。')
    .replace(/ですねですね[。]?$/, 'ですね。')
    .replace(/ますねますね[。]?$/, 'ますね。')
    // ビジネス系の混合パターン
    .replace(/ございますね[。]?でございます[。]?$/, 'でございます。')
    .replace(/でございます[。]?ございますね[。]?$/, 'でございますね。')
    // 「ません」+「です/ございます」の二重語尾パターン
    .replace(/ませんですね[。]?$/, 'ませんね。')
    .replace(/ませんでございます[。]?$/, 'ません。')
    .replace(/ございませんでございます[。]?$/, 'ございません。')
    .replace(/ないねですね[。]?$/, 'ないですね。')
    .replace(/いいえいいえ[、,]?/, 'いいえ、')
    // 汎用パターン（カスタム等で発生する可能性のある二重語尾）
    .replace(/です[。]?です[。]?$/, 'です。')
    .replace(/ます[。]?ます[。]?$/, 'ます。')
    .replace(/ですね[。]?ますね[。]?$/, 'ますね。')
    .replace(/ますね[。]?ですね[。]?$/, 'ですね。');
}

function applyReverseTranslationGuard(
  sourceLang: string,
  result: TranslationResult
): TranslationResult {
  if (sourceLang !== '日本語') {
    return result;
  }
  let reverseText = result.reverse_translation?.trim() ?? '';

  // 二重語尾を修正
  reverseText = fixDoubleEnding(reverseText);

  if (!reverseText || !hasJapaneseCharacters(reverseText)) {
    return { ...result, reverse_translation: reverseText, risk: 'high' };
  }
  return { ...result, reverse_translation: reverseText };
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

  // トーンスタイル×レベルに応じた説明（25%と50%で明確な差を出す）
  let toneStyle = '';
  if (toneLevel < 25) {
    toneStyle = 'Original as-is (no style change)';
  } else {
    switch (tone) {
      case 'casual':
        if (toneLevel >= 100) {
          toneStyle =
            'Maximum casual (slang OK, gonna/wanna/gotta, very friendly; keep meaning exact)';
        } else if (toneLevel >= 75) {
          toneStyle =
            'strong casual (more contractions, a bit more playful; add mild intensifiers like "really/so", allow "kinda", "lol/haha")';
        } else if (toneLevel >= 50) {
          toneStyle =
            'standard casual (use contractions like "I\'ll", "it\'s"; friendly phrasing; light intensifiers)';
        } else {
          toneStyle =
            'slightly casual (use basic contractions like "it\'s", "that\'s"; keep relatively neutral)';
        }
        break;
      case 'business':
        if (toneLevel >= 100) {
          toneStyle =
            'Maximum business (very polite, no contractions, highly professional; avoid slang)';
        } else if (toneLevel >= 75) {
          toneStyle =
            'strong business (more deference: "Could you kindly...", "I would be grateful if..."; still concise)';
        } else if (toneLevel >= 50) {
          toneStyle =
            'standard business (use "I would suggest...", "Please note that...", avoid contractions)';
        } else {
          toneStyle =
            'slightly business (polite tone, minimal contractions, but not overly formal)';
        }
        break;
      case 'formal':
        if (toneLevel >= 100) {
          toneStyle = 'Maximum formal (highest politeness, honorifics, humble expressions)';
        } else if (toneLevel >= 50) {
          toneStyle = 'standard formal (use "I would be most pleased...", "It is with great pleasure...", highest politeness)';
        } else {
          toneStyle = 'slightly formal (polite and respectful, use "indeed", "certainly", but not maximally formal)';
        }
        break;
      case 'custom':
        toneStyle = `"${customTone || ''}" style FULL POWER - 段階は無視して常に全力で表現。オジサン構文なら絵文字・カタカナ混ぜ、限界オタクなら感情爆発、ギャルならギャル語、赤ちゃん言葉なら幼児語`;
        break;
      default:
        toneStyle = 'Original as-is';
    }
  }

  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, toneLevel, tone, customTone);
  const userPrompt = `Original (${sourceLang}): ${sourceText}
Current translation (${targetLang}): ${currentTranslation}

REQUIRED TONE: ${tone || 'none'} at ${toneLevel}%
Target style: ${toneStyle}

【重要: 差分必須ルール】
- current_translation と同一の文章を返すのは禁止（translation / reverse_translation ともに）
- toneLevel が上がるほど、口調の変化（丁寧さ/カジュアルさ/強調/句読点/語尾/縮約）を段階的に強めること
- 意味・主語/目的語・否定・条件・数値・時制は絶対に変えない
- translation を変えたら reverse_translation も必ず変える（同一禁止）

${options.variationInstruction ? '【追加の差分指示】\n' + options.variationInstruction + '\n' : ''}${reverseTranslationInstruction}

Edit the current_translation to match the tone level ${toneLevel}%. Return JSON only.`;

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

// ガード付き翻訳
// Native=ON → 常にFULL
// toneLevel=0 → FULL
// toneLevel=25-100 → PARTIAL（意味固定優先）
export async function translateWithGuard(
  options: TranslateOptions
): Promise<GuardedTranslationResult> {
  const { isNative, currentTranslation } = options;
  const toneLevel = options.toneLevel ?? 0;

  const useFullLevels = toneLevel === 0;
  const usePartialLevels =
    toneLevel === 25 || toneLevel === 50 || toneLevel === 75 || toneLevel === 100;

  // Native=ON または toneLevel=0 → FULL
  if (isNative || useFullLevels) {
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: isNative ? 'native' : 'level_0_full',
    };
  }

  // PARTIALはアンカー必須。なければFULL（アンカーなしで意味固定できないため）
  if (!currentTranslation) {
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: 'missing_current_translation',
    };
  }

  // 想定外toneLevelは保険でFULL
  if (!usePartialLevels) {
    const result = await translateFull(options);
    return {
      result,
      usedFull: true,
      fallbackReason: 'unsupported_tone_level',
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

  // 必要ならフォールバック（FULLではなくcurrentTranslationを返す）
  if (decision.shouldFallback) {
    console.log(`[Guard] Fallback triggered: ${decision.reason}`);

    // PARTIAL結果があり、翻訳が変わっている場合は結果を返す（フラグ付き）
    // 呼び出し元で最終判断する
    if (partialResult && partialResult.translation !== currentTranslation) {
      const translationChanged = !isTooSimilarText(
        partialResult.translation,
        currentTranslation!
      );

      if (translationChanged) {
        console.log(`[Guard] Returning PARTIAL with fallback flag (reason: ${decision.reason})`);
        return {
          result: partialResult,
          usedFull: false,
          fallbackReason: decision.reason,  // フラグとして理由を残す
        };
      }
    }

    // 翻訳が変わってない場合はフォールバック
    console.log(`[Guard] Fallback to current: ${decision.reason}`);
    const safeFallback: TranslationResult = {
      translation: currentTranslation!,
      reverse_translation: options.currentReverseTranslation ?? '',
      risk: 'high',
    };
    return {
      result: safeFallback,
      usedFull: false,
      fallbackReason: `partial_failed_returned_current:${decision.reason}`,
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

// OpenAI API呼び出し（Vercel Serverless Function経由）
async function callGeminiAPI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      systemPrompt,
      userPrompt,
      temperature,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OpenAIApiError(
      response.status,
      error.error || getOpenAIErrorMessage(response.status),
      error.details
    );
  }

  const data = await response.json();
  return data.content;
}

// JSONをパース（マークダウンコードブロックも対応）
function parseJsonResponse<T>(text: string): T {
  // ```json ... ``` を除去
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// トーンスタイル×レベルに応じた指示を生成
function getToneStyleInstruction(tone: string | undefined, toneLevel: number, customTone?: string): string {
  // カスタムトーンは段階無視で常にLv5全力 → 最初に処理
  if (tone === 'custom') {
    // プリセット別に分岐（混同防止のため個別に返す）
    if (customTone === 'オジサン構文') {
      return `【オジサン構文 - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 呼びかけを1回（例：〇〇ちゃん/〇〇さん/君〜）
- 絵文字を3〜8個（😊😅✨💦👍💓❄️😂）- 翻訳・逆翻訳の両方に必須
- 「…」を2回以上
- 改行を1回以上入れて"手紙感"を出す
- 気遣いフレーズを1つ（例：無理しないでね/疲れてない？/体調大丈夫？）
- 最後に柔らかい締め（例：またね😊/返信待ってるね✨）
- 「〜かな？😅」または「〜だよ😊」を最低1回
- 軽い自分語りを1回（例：昔は〜/おじさんも〜）
- 感嘆符・疑問符を合計3回以上（！！/！？/？？）
- 英語にも絵文字 例: "Nice outfit! 😊✨ Are you doing okay? 💦"

【絶対禁止】
- 絵文字ゼロ
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉
- 堅い敬語`;
    }

    if (customTone === '限界オタク') {
      return `【限界オタク - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 冒頭に感情トリガー（例：え、待って / 無理 / は？好き）を1つ以上
- 「？？？？？」か「！！！！！！」を必ず1回
- 「！」「？」「……」を合計3回以上
- 短文連打を1回（例：待って。無理。好き。ほんとに。）
- 括弧リアクションを1回（例：（情緒）（死）（助けて）（無理））
- 結論系の〆を1回（例：結論：優勝 / はい神 / つまり：尊い / 解散）
- 絵文字を1〜4個（🙏✨🔥😭😇）
- 擬音を1回（ﾋｪ… / ｱｯ / ﾝ゛ｯ 等）
- 自己崩壊ワード（情緒 / 脳が追いつかん / 語彙死んだ / 助けて / 好きすぎて無理）
- 英語も感情爆発（I CAN'T... TOO PRECIOUS... HELP... wait what??? / OMG??? / literally dying）

【絶対禁止】
- 冷静な表現
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉
- 堅い敬語`;
    }

    if (customTone === '赤ちゃん言葉') {
      return `【赤ちゃん言葉 - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 語尾を赤ちゃん化を最低2箇所（「です」→「でしゅ」、「ます」→「ましゅ」、「だよ」→「でしゅよ〜」）
- 擬音/感情語を最低1つ（えーん / えへへ / むぎゅ / ぷんぷん / ねむねむ / うぇぇ）
- 反復を最低1回（すきすき / おいちいおいちい / してほちい...してほちいの）
- 短文を最低1回（やだ。むり。ねむい。）
- 括弧感情を1回（（えへへ）（ぷんぷん）（しょんぼり）（どきどき））
- 赤ちゃん結論で〆る（おわりなの。/ がんばったの。/ えらいの。）
- 音の幼児化：「すごい」→「しゅごい」、「して」→「してほちい」、「だめ」→「だめぇ」
- 「しゅ/でしゅ/ましゅ/ほちい/よちよち」系を合計3回以上
- 英語も幼児っぽく（pwease / sowwy / vewy nice / dis is so good）

【絶対禁止】
- 大人っぽい硬い表現
- オタク語（情緒、優勝、尊い等）
- ギャル語（まじ、やばい等）`;
    }

    if (customTone === 'ギャル') {
      return `【ギャル - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 冒頭に導入フレーズを1つ（例：え、まって / てか / それな）
- 「え、まって」を必ず1回入れる
- 強調語を2つ以上（例：まじ / ガチ / 超 / 鬼 / えぐい / やば）
- 相槌・共感を1回（例：わかる / それな / ほんとそれ）
- 記号を合計3回以上使う（！/？/w/笑）
- 絵文字を2〜6個入れる（例：💅✨🥺💕🔥）
- 「〜すぎ」「〜案件」「〜しか勝たん」のいずれかを必ず1回
- 短文を1回連打（例：無理。好き。優勝。）
- 最後は軽い結論で締める（例：結論：優勝 / 〜しか勝たん / 最高じゃん？）
- 英語もギャルっぽく（like, totally, omg, so cute, literally, vibes, slay）

【絶対禁止】
- 堅い表現・敬語
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉`;
    }

    // 自由入力の場合（プリセット以外）
    return `【カスタムトーン: ${customTone || '指定なし'}】
■ 絶対ルール: このトーンは「Lv5（最大誇張）」で表現すること。控えめは禁止。
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【ヒント - 自由入力の例】
- ラッパー風なら: 韻を踏む、ライム、フロウ、Yo、Check it、韻で繋げる
- 武士風なら: 〜でござる、〜なり、拙者、某、〜いたす
- お嬢様風なら: 〜ですわ、〜ですの、ごきげんよう、お〜になる

ユーザー指定「${customTone || ''}」の特徴を最大限に誇張して表現すること`;
  }

  // 0-24%: 原文そのまま（カスタム以外）
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
        // 既存のまま変更しない
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス敬語
- 省略形は一切使わない
- 例: "I would be most grateful if...", "It is my pleasure to inform you that...", "I sincerely appreciate your consideration."
- 格式高く丁重な表現`;
      } else if (toneLevel >= 75) {
        return `【トーンレベル: ${toneLevel}% - かなりのビジネス表現】
- 省略形は使わない
- 丁寧な依頼・感謝表現を使う
- 例: "Would you be so kind as to...", "I would greatly appreciate..."
- フォーマルなトーン`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: ${toneLevel}% - 標準のビジネス表現】
- 省略形は避ける
- 丁寧語を使う
- 例: "Could you please...", "I would like to..."
- プロフェッショナルなトーン`;
      } else {
        return `【トーンレベル: ${toneLevel}% - 軽めのビジネス表現】
- 基本的に省略形は避ける
- シンプルな丁寧表現
- 例: "Please...", "Thank you for..."
- 丁寧だが堅すぎない`;
      }

    case 'formal':
      if (toneLevel >= 100) {
        // 既存のまま変更しない
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃ丁寧（最大級の敬語・謙譲語）】
- 最上級の敬意を示す表現
- 謙譲語・尊敬語を最大限に使用
- 例: "I would be deeply honored...", "Your esteemed presence...", "I humbly request..."
- 最高の礼儀と敬意`;
      } else if (toneLevel >= 75) {
        return `【トーンレベル: ${toneLevel}% - かなりの丁寧表現】
- 敬意を込めた表現
- 例: "It would be my pleasure...", "May I kindly ask..."
- 礼儀正しいフォーマル`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: ${toneLevel}% - 標準の丁寧表現】
- 丁寧な言い回し
- 例: "Would you mind...", "I appreciate..."
- 敬意あるトーン`;
      } else {
        return `【トーンレベル: ${toneLevel}% - 軽めの丁寧表現】
- 基本的な丁寧表現
- 例: "Please...", "Thank you..."
- シンプルに丁寧`;
      }

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

function getFullDifferenceInstruction(
  toneLevel: number,
  previousTranslation?: string,
  previousLevel?: number,
  tone?: string
): string {
  const isBusinessOrFormal = tone === 'business' || tone === 'formal';

  // 前レベルの結果がない場合は従来通り
  if (!previousTranslation) {
    if (toneLevel === 75) {
      if (isBusinessOrFormal) {
        return `【FULL(75) 差分必須 - ビジネス/フォーマル】
- 意味は固定したまま、構文・語順・言い回しを丁寧に変える
- 50%の出力と同一/ほぼ同一は禁止
- より丁寧な敬語表現に変える
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- スラング・感嘆詞は絶対禁止`;
      }
      return `【FULL(75) 差分必須】
- 意味は固定したまま、構文・語順・言い回しを積極的に変える
- 50%の出力と同一/ほぼ同一は禁止（言い換え・語順変更・別の自然表現）
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- casual の場合は勢いを上げる（テンション高めの表現）`;
    }
    if (toneLevel === 100) {
      if (isBusinessOrFormal) {
        return `【FULL(100) 差分必須 - ビジネス/フォーマル】
- 75%よりさらに格式高く、最上級の敬語表現にする
- 50%/75%と同一/ほぼ同一は禁止
- 謙譲語を追加（「〜させていただく」「〜賜る」等）
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- スラング・感嘆詞は絶対禁止`;
      }
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
    if (isBusinessOrFormal) {
      return `【FULL(75) 差分必須 - ビジネス/フォーマル】
■ 前レベル(${previousLevel ?? 50}%)の翻訳結果:
"${previousTranslation}"

■ 上記と必ず異なる表現にすること:
- 上記の翻訳と同一/ほぼ同一は絶対禁止
- より丁寧な敬語表現に変える:
  1. 敬語のレベルを上げる
  2. より丁重な言い回しに変える
  3. 謙譲表現を加える
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- スラング・感嘆詞は絶対禁止`;
    }
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
    if (isBusinessOrFormal) {
      return `【FULL(100) 差分必須 - ビジネス/フォーマル】
■ 前レベル(${previousLevel ?? 75}%)の翻訳結果:
"${previousTranslation}"

■ 上記と明確に異なる表現にすること:
- 上記の翻訳と同一/ほぼ同一は絶対禁止
- 75%よりさらに格式高く:
  1. 最上級の敬語表現に変える
  2. 謙譲語を追加（「〜させていただく」「〜賜る」等）
  3. 文の構造を最も丁寧な形に変える
- 評価語カテゴリ・名詞カテゴリは絶対に変えない
- スラング・感嘆詞は絶対禁止`;
    }
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

// ============================================
// 新しいシンプル版（実験）
// ============================================
function getReverseTranslationInstruction(
  sourceLang: string,
  toneLevel: number,
  tone?: string,
  customTone?: string
): string {
  if (sourceLang !== '日本語') {
    return '';
  }

  const toneDescription =
    tone === 'casual' ? '友達に話すようなカジュアルな口調' :
    tone === 'business' ? 'ビジネスシーンで使う敬語' :
    tone === 'formal' ? '最上級の丁寧な敬語（ございます等）' :
    tone === 'custom' ? `「${customTone}」のスタイル全開（オジサン構文なら絵文字・カタカナ混ぜ、限界オタクなら感情爆発、ギャルならギャル語、赤ちゃん言葉なら幼児語）` :
    '自然な口調';

  const levelInstruction = tone === 'custom'
    ? '段階は無視して常に全力で表現すること'
    : `レベル${toneLevel}%: 0%が最も控えめ、100%が最も強い表現`;

  return `【逆翻訳ルール】
- ${toneDescription}で表現すること
- ${levelInstruction}

【最重要：全レベル異なる表現にすること】
全5レベル（0%, 25%, 50%, 75%, 100%）は必ず全て異なる表現にすること。
1つでも同じ表現があってはならない。
- 英語（translation）も各レベルで必ず変える
- 逆翻訳（reverse_translation）も各レベルで必ず変える
- 差のつけ方：語彙、強調語、感嘆符、口調の強さ

【基本ルール】
- 疑問文は疑問文のまま（？で終わる）
- 平叙文は平叙文のまま
- 自然な日本語であること
- 意味は原文と同じに保つ`;
}

// ============================================
// 旧バージョン（バックアップ）- 品質が悪ければ戻す
// ============================================
/*
function getReverseTranslationInstruction_OLD(sourceLang: string, toneLevel: number, tone?: string, customTone?: string): string {
  if (sourceLang !== '日本語') {
    return '';
  }

  // ビジネス/formal用の署名ルール（敬語のみ）
  const businessFormalSignature = `
【逆翻訳の語尾署名ルール - ビジネス/formal専用】
※ 元の文の語尾を「削除」してから、以下の語尾を「1つだけ」付けること
※ 元の文が「〜ですね」「〜ます」等で終わっていても、一度語尾を取り除いてから新しい語尾を付ける

- 0%: 「〜です。」または「〜ます。」（どちらか1つ）
- 25%: 「〜ですね。」または「〜ございます。」（どちらか1つ）
- 50%: 「〜でございます。」
- 75%: 「〜でございますね。」または「〜かと存じます。」（どちらか1つ）
- 100%: 「〜いただければ幸甚に存じます。」「〜賜りますようお願い申し上げます。」「〜させていただきます。」（最上級敬語）

【絶対禁止 - 二重語尾】
❌「ですねね」「ますねね」「ございますございます」「ですね。ございます。」
→ 語尾が2回続くのは絶対禁止
→ 元の文の語尾を残したまま新しい語尾を追加するのも禁止

【正しい変換例】
元の文「素敵な洋服ですね」→ 語尾を取る「素敵な洋服」→ 新語尾「ですね。」→「素敵な洋服ですね。」✅
元の文「素敵な洋服ですね」→ そのまま「ですね。」追加 →「素敵な洋服ですねね。」❌

【強調語の段階化 - ビジネス/formal専用】
- 0%: とても
- 25%: 大変
- 50%: 誠に
- 75%: 非常に
- 100%: 心より、誠に〜でございます（最上級の敬語表現）
- 禁止語: 「マジ」「めっちゃ」「超」「ガチ」「ヤバ」は絶対禁止
- 感嘆符: 「！」は1つまで。「！！」は禁止

【禁止語尾 - ビジネス/formal専用】
- 「だね」「じゃん」「だよ」「よね」は全レベルで禁止
- 必ず「です/ます/ございます」系で終えること`;

  // カジュアル用の署名ルール
  const casualSignature = `
【逆翻訳の語尾署名ルール - casual専用】
※ 元の文の語尾を「削除」してから、以下の語尾を「1つだけ」付けること
※ 元の文が「〜ですね」「〜ます」等で終わっていても、一度語尾を取り除いてから新しい語尾を付ける

- 0%: 「〜です。」または「〜ます。」（どちらか1つ）
- 25%: 「〜ですね。」または「〜ますね。」（どちらか1つ）
- 50%: 「〜だね！」または「〜よね！」（どちらか1つ）
- 75%: 「〜じゃん！」または「〜だよ！」（どちらか1つ）
- 100%: 「〜じゃん！！」または「〜だよね！！」（どちらか1つ）

【絶対禁止 - 二重語尾】
❌「ですねね」「ますねね」「だね！ですね。」「だよ！ますね。」
→ 語尾が2回続くのは絶対禁止
→ 元の文の語尾を残したまま新しい語尾を追加するのも禁止

【正しい変換例】
元の文「素敵な洋服ですね」→ 語尾を取る「素敵な洋服」→ 新語尾「ですね。」→「素敵な洋服ですね。」✅
元の文「素敵な洋服ですね」→ そのまま「ですね。」追加 →「素敵な洋服ですねね。」❌

【強調語の段階化 - casual専用】
- 0%: とても、大変
- 25%: とっても、かなり
- 50%: すごく、けっこう
- 75%: めっちゃ、超
- 100%: マジで、ガチで、めっちゃ`;

  // カスタム用の署名ルール（指定トーンの特徴を段階的に強める）
  const customSignature = `
【逆翻訳の語尾署名ルール - custom専用】
※ 指定されたカスタムトーンの特徴を、レベルに応じて段階的に強める
※ 元の文の語尾を「削除」してから、カスタムトーンに合った語尾を「1つだけ」付ける

- 0%: 普通の丁寧語「〜です。」「〜ます。」
- 25%: 軽くカスタムトーンの雰囲気「〜だよ。」「〜ね。」
- 50%: 明確にカスタムトーンを出す「〜だぜ！」「〜っしょ！」等
- 75%: 強めにカスタムトーンを出す「〜だぜ！！」「〜っす！！」等
- 100%: 全力でカスタムトーンを出す（そのキャラ/スタイル全開）

【強調語の段階 - custom専用】
- 0%: とても、大変
- 25%: すごく、かなり
- 50%: めっちゃ、超
- 75%: マジで、ガチで、激
- 100%: 鬼、クソ、バリ（スタイルに合わせて最強の強調語）

【重要】
- 指定されたカスタムトーン「${customTone || ''}」の特徴を最大限反映
- レベル間で必ず表現を変える（同じ逆翻訳は絶対禁止）
- 75%と100%は明確に違う表現にする`;

  const endingSignature =
    tone === 'business' || tone === 'formal' ? businessFormalSignature :
    tone === 'custom' ? customSignature :
    casualSignature;

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
        : `【customトーン - 重要】
- 指定トーン「${customTone || ''}」の特徴を全力で出す
- レベルが上がるほど、より大げさに・より極端に
- 0%は控えめ、100%はそのスタイル全開
- 逆翻訳も必ずレベルごとに変える（同一禁止）
- ラッパー風なら: YO！マジ！ヤベェ！等を段階的に
- ジャイアン風なら: 俺様、〜だぜ、〜してやる等を段階的に`;

  // 疑問文ルール（トーン別語尾より優先）
  const questionRule = `
【疑問文ルール - 最優先】
■ 疑問文の判定（以下のいずれかに該当したら疑問文扱い）
- 原文に「?」「？」がある
- 原文に「どこ」「なぜ」「いつ」「誰」「何」「どう」があり問いかけの意図がある
- 原文が「〜のか」「〜んだ」「〜かな」で終わり、疑問のニュアンスがある
- 英訳が「?」で終わる、または where/why/when/who/what/how で始まる

■ 疑問文の場合の逆翻訳（平叙文の語尾ルールより優先）
- 必ず疑問形で終わること
- casual: 「〜かな？」「〜の？」「〜じゃない？」「〜んだ？」
- business: 「〜でしょうか？」「〜ですか？」「〜でしょう？」
- formal: 「〜でございましょうか？」「〜でいらっしゃいますか？」「〜でしょうか？」
- 禁止: 「存じます。」「思います。」「ございます。」等の平叙文語尾で終わること

■ 平叙文の場合のみ
- 下記のトーン別語尾ルールを適用`;

  return `【逆翻訳ルール（日本語固定）】
- reverse_translation は必ず日本語で出力（英語混入禁止、空禁止）
- tone_level=${toneLevel}% に応じて、下記の署名ルールを必ず守る
- 隣接レベル(25%と50%等)で同一の逆翻訳は絶対禁止。必ず最低1箇所は変える

${questionRule}

${endingSignature}

${toneHints}`;
}
*/

// FULL翻訳を実行
export async function translateFull(options: TranslateOptions): Promise<TranslationResult> {
  const { sourceText, sourceLang, targetLang, isNative, previousTranslation, previousLevel } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction(options);
  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, toneLevel, options.tone, options.customTone);
  const differenceInstruction = getFullDifferenceInstruction(toneLevel, previousTranslation, previousLevel, options.tone);
  const variationInstruction = options.variationInstruction ? `\n${options.variationInstruction}` : '';

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【絶対ルール - translation フィールド】
- "translation" は ${targetLang} のみで出力すること
- ${sourceLang}の文字は絶対に混ぜない
- 語尾の「だね」「じゃん」「ですね」「ございます」等は translation には絶対に入れない
- これらの語尾ルールは reverse_translation にのみ適用する

【人名の翻訳ルール】
- ひらがな/カタカナの人名は英語翻訳（translationフィールド）でのみローマ字表記する
- 逆翻訳（reverse_translationフィールド）は元のひらがな/カタカナのまま維持する
- 人名の判断: 後ろに人間の動作（寝る、来る、食べる等）が続くか
  - 例: 「おうたが寝てから」
    → translation: "After Outa goes to sleep"
    → reverse_translation: 「おうたが寝てから」（ひらがなのまま）
- 一般名詞と混同しない
  - 「おうた」は「お歌(song)」ではなく人名「Outa」

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

  const response = await callGeminiAPI(MODELS.FULL, systemPrompt, userPrompt, 0.3, options.signal);
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
  return {
    point: explanation.point || '',
    explanation: explanation.explanation || '',
  };
}

// 解説を生成
export async function generateExplanation(
  translatedText: string,
  _sourceLang: string,
  targetLang: string
): Promise<ExplanationResult> {
  const systemPrompt = `あなたは${targetLang}の表現の専門家です。
翻訳結果について解説してください。

【出力ルール】
1. point: この表現の核となる単語やフレーズを「${targetLang}表現 = 日本語の意味」形式で1つ書く
2. explanation: どんなニュアンスか、どんな場面で使えるかを自然な文章で2〜3文書く。項目分けしない。

必ず以下のJSON形式で出力：
{
  "point": "${targetLang}表現 = 意味",
  "explanation": "自然な文章で2〜3文の解説"
}

【出力例】英語「What time works for you?」の場合：
{
  "point": "works for you = あなたの都合に合う",
  "explanation": "相手の都合を尋ねるカジュアルな表現です。友達との予定調整や、同僚とのミーティング設定など幅広く使えます。"
}

【出力例】韓国語「네 기억력이 어디로 갔어?」の場合：
{
  "point": "기억력이 어디로 갔어 = 記憶力はどこに行ったの",
  "explanation": "相手が忘れっぽい時に軽くからかう表現です。友達同士の会話でユーモアを交えて使えます。"
}`;

  const userPrompt = `${targetLang}翻訳: ${translatedText}

この${targetLang}表現について解説して。`;

  const response = await callGeminiAPI(MODELS.FULL, systemPrompt, userPrompt);
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

  // 解説を生成（原文の外国語について解説）
  const explanation = await generateExplanation(
    text,
    '日本語',
    partnerLang
  );

  return {
    ...translationResult,
    explanation,
  };
}

// ========================================
// 日本語ベース方式用の関数
// ========================================

// 日本語編集用のシステムプロンプト
const JAPANESE_EDIT_SYSTEM_PROMPT = `あなたはNijiLingoの日本語編集モードです。
与えられた日本語文を、指定されたトーンレベルに合わせて編集してください。

【ルール】

1. 意味を変えない
   - 数字、名前、肯定/否定、質問/断定はそのまま
   - 依頼/義務/提案のクラスを変えない
   - 約束やお願いを追加しない
   - 感情の強さを変えない（OK→素晴らしい ❌）

2. 敬語の対象を間違えない
   - 人名の判断: 後ろに人の動作（寝る、来る、食べる等）が続くか
   - 敬称なし人名（太郎、花子）= 身内 → 敬語化しない
   - 敬称あり人名（田中様）= 他人 → 敬語化OK
   - 敬称を勝手に追加しない

3. 自然な日本語にする
   - 文法が正しいこと
   - 「じゃん」は確認・評価にのみ使う（未来の行動には使わない）

【トーンレベルガイド】
カジュアル:
- 50%: 「〜だね」「〜だよ」「〜してる」
- 100%: 「めっちゃ〜」「マジで〜」「〜よ！」

ビジネス:
- 50%: 「〜いたします」「〜でございます」
- 100%: 「〜申し上げます」「〜賜りますよう」

フォーマル:
- 50%: 「〜させていただきます」
- 100%: 「〜申し上げる所存でございます」

【良い例・悪い例】
元: 「太郎が寝てからあなたの家に行く」

✅ カジュアル: 太郎が寝てからあなたの家に行くね！
✅ カジュアル100%: 太郎が寝てからお前んち行くよ！
✅ ビジネス: 太郎が寝てからお宅に伺います
✅ フォーマル: 太郎が寝てから、お宅へ伺わせていただきます

❌ 太郎様がお休みになられましたら（身内に敬語）
❌ 何卒よろしくお願いいたします（意味追加）
❌ 行くじゃん！（「じゃん」の使い方が不自然）
❌ 微妙させていただきます（文法崩壊）

JSONのみ返してください（説明不要）:
{"edited_japanese":"..."}`;

function getToneStyleForJapanese(tone: string, toneLevel: number, customTone?: string): string {
  if (tone === 'custom' && customTone) {
    return `「${customTone}」スタイル`;
  }

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) return '超カジュアル（めっちゃ、マジ、〜よ！等）';
      if (toneLevel >= 50) return 'カジュアル（だね、だよ、してる等）';
      return 'やや砕けた表現';

    case 'business':
      if (toneLevel >= 100) return '最高ビジネス敬語（申し上げます、賜りますよう等）';
      if (toneLevel >= 50) return 'ビジネス敬語（いたします、ございます等）';
      return 'やや丁寧なビジネス表現';

    case 'formal':
      if (toneLevel >= 100) return '最大敬語（申し上げる所存でございます等）';
      if (toneLevel >= 50) return '丁寧敬語（させていただきます等）';
      return 'やや丁寧な表現';

    default:
      return 'そのまま';
  }
}

export async function editJapaneseForTone(
  sourceText: string,
  tone: string,
  toneLevel: number,
  customTone?: string,
  signal?: AbortSignal
): Promise<string> {
  // レベル0はそのまま返す
  if (toneLevel === 0) {
    return sourceText;
  }

  const toneStyle = getToneStyleForJapanese(tone, toneLevel, customTone);

  const userPrompt = `元の日本語: ${sourceText}

トーン: ${tone}
トーンレベル: ${toneLevel}%
目標スタイル: ${toneStyle}

この日本語を${toneLevel}%の${tone}トーンに編集してください。JSONのみ返してください。`;

  const response = await callGeminiAPI(MODELS.PARTIAL, JAPANESE_EDIT_SYSTEM_PROMPT, userPrompt, 0, signal);
  const parsed = parseJsonResponse<{ edited_japanese: string }>(response);

  return parsed.edited_japanese || sourceText;
}
