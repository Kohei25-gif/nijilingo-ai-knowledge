// サーバー側ガード機能（groq.tsから分離）

import type {
  TranslationResult,
  InvariantCheckResult,
  ModalityClass,
  FallbackDecision,
} from './types';
import { EDIT_DISTANCE_THRESHOLD } from './api';

// 編集距離（レーベンシュタイン距離）を計算
export function calculateEditDistance(str1: string, str2: string): number {
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

export function normalizeForCompare(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[""]/g, '"');
}

export function isTooSimilarText(a: string, b: string): boolean {
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

// 数字・日付・時刻・金額を抽出
export function extractEntities(text: string): string[] {
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
export function extractPolarityMarkers(text: string): { positive: boolean; negative: boolean } {
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
export function isQuestion(text: string): boolean {
  return /\?$/.test(text.trim()) || /[？]$/.test(text.trim()) ||
    /^(do|does|did|is|are|was|were|will|would|can|could|should|may|might|have|has|had)\s/i.test(text.trim()) ||
    /か[？?]?$/.test(text.trim());
}

// 条件マーカーを抽出
export function extractConditionMarkers(text: string): string[] {
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

export function hasJapaneseCharacters(text: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(text);
}

// 不変条件をチェック
export function checkInvariantConditions(
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
export function extractModalityClass(text: string): ModalityClass {
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

// BUG-001対応: 日英乖離検出（checkAlignmentScore）
/**
 * 原文と逆翻訳の意味的な整合性をスコア化する
 * @param originalText 原文（日本語）
 * @param reverseTranslation 逆翻訳（日本語）
 * @returns alignmentScore: 0-1（1が完全一致）、閾値0.2以下でNG
 */
export function checkAlignmentScore(
  originalText: string,
  reverseTranslation: string
): { score: number; hasIssue: boolean; details: string } {
  const THRESHOLD = 0.2;  // 閾値: これ以下なら乖離あり

  // 1. 空チェック
  if (!originalText.trim() || !reverseTranslation.trim()) {
    return { score: 0, hasIssue: true, details: 'empty_text' };
  }

  // 2. 正規化
  const normalizeJapanese = (text: string): string => {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[。、！？!?]/g, '')
      .replace(/[ー〜]/g, '')
      .replace(/[「」『』（）()]/g, '');
  };

  const normalizedOriginal = normalizeJapanese(originalText);
  const normalizedReverse = normalizeJapanese(reverseTranslation);

  // 3. 完全一致チェック
  if (normalizedOriginal === normalizedReverse) {
    return { score: 1.0, hasIssue: false, details: 'exact_match' };
  }

  // 4. キーワード抽出（名詞・動詞の語幹を抽出）
  const extractKeywords = (text: string): Set<string> => {
    const keywords = new Set<string>();

    // 数字を抽出
    const numbers = text.match(/\d+/g);
    if (numbers) numbers.forEach(n => keywords.add(n));

    // 日本語のキーワード（2文字以上の連続したひらがな/カタカナ/漢字）
    const japaneseWords = text.match(/[ぁ-んァ-ン一-龯]{2,}/g);
    if (japaneseWords) japaneseWords.forEach(w => keywords.add(w));

    // 英字キーワード
    const englishWords = text.match(/[a-zA-Z]{2,}/gi);
    if (englishWords) englishWords.forEach(w => keywords.add(w.toLowerCase()));

    return keywords;
  };

  const originalKeywords = extractKeywords(normalizedOriginal);
  const reverseKeywords = extractKeywords(normalizedReverse);

  // 5. キーワードの重複率を計算
  if (originalKeywords.size === 0) {
    // キーワードが抽出できない場合は編集距離ベースで判定
    const distance = calculateEditDistance(normalizedOriginal, normalizedReverse);
    const maxLen = Math.max(normalizedOriginal.length, normalizedReverse.length);
    const score = maxLen > 0 ? 1 - (distance / maxLen) : 0;
    return {
      score,
      hasIssue: score < THRESHOLD,
      details: `edit_distance_based: ${score.toFixed(2)}`
    };
  }

  let matchCount = 0;
  for (const keyword of originalKeywords) {
    if (reverseKeywords.has(keyword)) {
      matchCount++;
    } else {
      // 部分一致チェック（3文字以上の場合）
      if (keyword.length >= 3) {
        for (const reverseKeyword of reverseKeywords) {
          if (reverseKeyword.includes(keyword) || keyword.includes(reverseKeyword)) {
            matchCount += 0.5;
            break;
          }
        }
      }
    }
  }

  // 6. スコア計算
  const score = matchCount / originalKeywords.size;

  // 7. 追加チェック: 否定の反転
  const hasNegationOriginal = /[ない|なかった|しない|できない|いない]/.test(normalizedOriginal);
  const hasNegationReverse = /[ない|なかった|しない|できない|いない]/.test(normalizedReverse);
  const negationFlipped = hasNegationOriginal !== hasNegationReverse;

  // 8. 追加チェック: 疑問文の変化
  const isQuestionOriginal = /[？?]/.test(originalText) || /[か]$/.test(normalizedOriginal);
  const isQuestionReverse = /[？?]/.test(reverseTranslation) || /[か]$/.test(normalizedReverse);
  const questionChanged = isQuestionOriginal !== isQuestionReverse;

  // 9. ペナルティ適用
  let finalScore = score;
  let details = `keyword_match: ${score.toFixed(2)}`;

  if (negationFlipped) {
    finalScore *= 0.3;  // 否定反転は重大
    details += ', negation_flipped';
  }

  if (questionChanged) {
    finalScore *= 0.7;
    details += ', question_changed';
  }

  return {
    score: finalScore,
    hasIssue: finalScore < THRESHOLD,
    details
  };
}

// modality_classの一貫性チェック
export function checkModalityConsistency(
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
export function shouldFallbackToFull(
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

  // 9. BUG-001対応: 日英乖離チェック（checkAlignmentScore）
  // ★ 2026-02-03 改革: トーン変更時（toneLevel > 0）はスキップ
  //    理由: 新方式では逆翻訳は英語からの訳なので、原文との乖離が発生するのは正常
  //    （例: 英語に "dude" が入ると、逆翻訳に「おい」が入り、原文と乖離する）
  if (requireJapaneseReverse && result.reverse_translation && toneLevel === 0) {
    const alignmentCheck = checkAlignmentScore(originalText, result.reverse_translation);
    if (alignmentCheck.hasIssue) {
      console.log(`[Guard] Alignment issue detected: score=${alignmentCheck.score.toFixed(2)}, details=${alignmentCheck.details}`);
      return { shouldFallback: true, reason: `alignment_issue: ${alignmentCheck.details}` };
    }
  }

  return { shouldFallback: false, reason: null };
}

export function applyEvaluationWordGuard(
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
export function fixDoubleEnding(text: string): string {
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

export function applyReverseTranslationGuard(
  sourceLang: string,
  result: TranslationResult
): TranslationResult {
  let reverseText = result.reverse_translation?.trim() ?? '';

  // 日本語以外が原文の場合
  if (sourceLang !== '日本語') {
    // 中国語・韓国語の場合：漢字・ハングルは正常なのでひらがな・カタカナのみチェック
    if (sourceLang === '中国語' || sourceLang === '韓国語') {
      // ひらがな・カタカナが含まれていたら除去
      if (/[ぁ-んァ-ン]/.test(reverseText)) {
        console.warn('[applyReverseTranslationGuard] Japanese kana found in reverse_translation for CJK source:', reverseText);
        const cleanedReverse = reverseText.replace(/[ぁ-んァ-ン]+/g, '').trim();
        return { ...result, reverse_translation: cleanedReverse, risk: 'high' };
      }
      return result;
    }
    // 他の言語（英語、フランス語など）の場合：日本語文字が含まれていたら除去
    if (hasJapaneseCharacters(reverseText)) {
      console.warn('[applyReverseTranslationGuard] Japanese found in reverse_translation for non-Japanese source:', reverseText);
      const cleanedReverse = reverseText.replace(/[ぁ-んァ-ン一-龯！？。、「」『』（）]+/g, '').trim();
      return { ...result, reverse_translation: cleanedReverse, risk: 'high' };
    }
    return result;
  }

  // 日本語→英語の場合：逆翻訳は日本語であるべき
  // 二重語尾を修正
  reverseText = fixDoubleEnding(reverseText);

  if (!reverseText || !hasJapaneseCharacters(reverseText)) {
    return { ...result, reverse_translation: reverseText, risk: 'high' };
  }
  return { ...result, reverse_translation: reverseText };
}

// translationフィールドに日本語が混入していないかチェック
export function applyTranslationLanguageGuard(
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
