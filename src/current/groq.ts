// OpenAI API 翻訳サービス

// モデル定義
export const MODELS = {
  FULL: 'llama-3.3-70b-versatile',    // FULL翻訳・解説用（Groq）
  PARTIAL: 'llama-3.3-70b-versatile', // PARTIAL編集用（Groq）
  JAPANESE_EDIT: 'gpt-4.1-nano',                        // 日本語編集用（OpenAI）
} as const;

// ============================================
// 構造化M抽出 v2（拡張ハイブリッド版・7項目）
// ============================================

// 意図タイプ
export type IntentType = '依頼' | '確認' | '報告' | '質問' | '感謝' | '謝罪' | '提案' | '命令' | 'その他';

// 確信度
export type CertaintyLevel = '確定' | '推測' | '可能性' | '希望' | '伝聞';

// 固有名詞タイプ
export type EntityType = 'person' | 'place' | 'org' | 'product';

// 敬称タイプ
export type HonorificType = 'なし' | 'さん' | '様' | '君' | 'ちゃん' | 'その他';

// 固有名詞エントリ
export interface NamedEntity {
  text: string;
  type: EntityType;
  読み?: string;  // ひらがな名詞の場合のローマ字読み
  敬称: HonorificType;  // 敬称なし=身内→尊敬語不要
}

// 拡張構造スキーマ（10項目）
export interface ExpandedStructure {
  主題: string;           // 何について
  動作: string;           // 何をする/どうなる
  意図: IntentType;       // 発話の目的
  主語: string;           // 誰が（明示されていなければ「省略」）
  対象: string;           // 誰に/何に（なければ「なし」）
  目的格: string;         // 「〜を」がついてる単語（動作の対象を明示）
  願望: string;           // 願望表現（〜したい/want to等）があるか（あり/なし）
  人称: string;           // 一人称単数/一人称複数/二人称/三人称
  確信度: CertaintyLevel; // 話者の確信の度合い
  固有名詞: NamedEntity[];// 誤認識しやすい名詞
}

// 翻訳結果の型定義
export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  // 2026-02-02: AI言語検出対応
  detected_language?: string;
  // BUG-001対応: 日英乖離検出用の分析フィールド
  analysis?: {
    alignmentScore: number;  // 0-1: 1が完全一致
    hasAlignmentIssue: boolean;
    details?: string;
  };
}

// BUG-001対応: PARTIAL編集用の型定義
export interface PartialTranslationResult {
  new_translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  // 元のソーステキストとの整合性スコア
  sourceAlignmentScore?: number;
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
  // 構造化M抽出 v2（拡張ハイブリッド版）
  structure?: ExpandedStructure;
}

// 不変条件（7項目 + stance_strength）のシステムプロンプト
const INVARIANT_RULES = `
【不変条件 - 翻訳時に絶対守ること】
1. entities - 数字、日付、時刻、金額、固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. subject - 主語は変えない
   ★ 重要: 主語は絶対に変えない
   ★ 一人称単数 → 一人称複数への変更は禁止
   ★ 「私が行く」→「一緒に行こう」のような主語変更は禁止
5. modality_class - 依頼/義務/提案のクラスを変えない
6. question/statement - 質問/断定を変えない
7. condition markers - 条件節を保持
8. commitment - 約束を勝手に追加しない
9. stance_strength - 同意や感情の強さを勝手に変えない

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる
`;

const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない
2. スラングで評価軸を変えない
3. reverse_translation は意味を保持しつつ、トーン差を語尾・強調語で必ず表現する
`;

// ============================================
// 言語固有ルール（10言語対応）
// ============================================

function getLanguageSpecificRules(targetLang: string): string {
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

// ============================================
// BUG-001対応: 日英乖離検出（checkAlignmentScore）
// ============================================

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

// PARTIAL用システムプロンプト（トーンレベル指示はuserPromptで渡す）
const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo in PARTIAL mode.
Your job is to EDIT the given current_translation to match the requested tone level. Do NOT translate from scratch.

ABSOLUTE RULE: Do not re-translate. Edit current_translation only.
LANGUAGE RULE: Output new_translation in the SAME language as current_translation.

[Hard invariants - must preserve]
1. entities - 数字、日付、時刻、金額、固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. subject - 主語は絶対に変えない
   ★★★ 重要: 主語は絶対に変えない ★★★
   ★ 一人称単数 → 一人称複数への変更は禁止
   ★ トーン調整で主語が変わるような編集は禁止
5. modality_class - 依頼/義務/提案のクラスを変えない
   ★ 依頼を確認に変えない、確認を依頼に変えない
6. question/statement - 質問/断定を変えない
7. condition markers - 条件節を保持
8. commitment - 約束を勝手に追加しない
9. stance_strength - 同意や感情の強さを勝手に変えない

${TONE_AND_EVALUATION_RULES}

[Tone Level Guide - MUST follow strictly]
- 0-24%: Original as-is - No style change, natural translation
- 25-49%: Slightly styled - Light application of the selected tone
- 50-74%: Standard styled - Normal application of the selected tone
- 75-99%: Strong styled - Heavy application of the selected tone
- 100%: Maximum styled - Extreme application of the selected tone

The style depends on the selected tone type (casual/business/formal).
【Forbidden】Overly formal honorifics not used in daily conversation (e.g. 幸甚)

Allowed edits (surface-level only):
- Tone: politeness level, contractions, punctuation, honorifics, hedging

Forbidden edits:
- Any change that alters meaning
- Creative idioms or metaphors not in original
- If risk=high, output new_translation identical to current_translation

[Reverse translation rule]
- reverse_translation should naturally express the nuance of the tone-adjusted translation
- Match the tone in reverse_translation (polite for business/formal, casual for casual)
- No strict ending rules - just convey the nuance naturally

Return ONLY valid JSON (no markdown, no explanation).
Use exactly these 3 keys (no extra keys):
{"new_translation":"...","reverse_translation":"...(source language)","risk":"low|med|high"}`;

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
  const { sourceText, currentTranslation, sourceLang, targetLang, tone, customTone, structure } = options;
  const toneLevel = options.toneLevel ?? 0;

  if (!currentTranslation) {
    throw new Error('currentTranslation is required for PARTIAL mode');
  }

  // 構造情報をプロンプトに追加（固有名詞の読み保持のため + 言語情報）
  const structureInfo = structure ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n` : '';
  
  // structureがなくても言語情報は必ず追加
  const langInfoOnly = !structure ? `
【出力言語 - 絶対遵守】
・翻訳の出力言語: ${targetLang}（new_translationフィールドは必ずこの言語で出力）
・逆翻訳の出力言語: ${sourceLang}（reverse_translationフィールドは必ずこの言語で出力）
` : '';

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

  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, targetLang, toneLevel, tone, customTone);
  
  // ★ 2026-02-03 改革: 翻訳をトーン調整 → その翻訳を逆翻訳
  // Original（原文）は削除し、current_translation（翻訳）をベースにトーン調整
  
  // 前レベルの翻訳があれば差分反映指示を追加（多言語対応）
  const previousTranslation = options.previousTranslation;
  const previousLevel = options.previousLevel;
  const diffInstruction = previousTranslation ? `
【重要: 逆翻訳で差分を表現（意味構造は保持）】
前レベル(${previousLevel ?? 0}%)の翻訳: "${previousTranslation}"
→ トーン調整で追加された表現の差分を必ず反映すること
→ 各パーセンテージ間（0→25→50→75→100）の逆翻訳が同じトーンにならないように

【絶対守ること - 意味構造の保持】
- 主語・対象を変えない（「君」を「お客様」に変えない、「you」を「valued customer」に変えない）
- 確信度を変えない（確定→推測にしない）
- 数字・固有名詞を変えない
- 肯定/否定を変えない

【変えていいこと - トーンの差分のみ】
- 語尾の変化（です→ございます、だよ→じゃん等）
- 強調語の追加（とても→めっちゃ、very→totally等）
- カジュアル/丁寧表現の追加
- 前レベルと同じ逆翻訳は禁止
` : '';
  
  // 言語置き換え指示（targetLangが英語以外の場合）
  const partialLanguageRule = targetLang !== '英語' ? `
★★★ 最重要: new_translation は必ず「${targetLang}」で出力すること ★★★
- システムプロンプトの例は英語だが、すべて${targetLang}に置き換えて適用すること
- 英語で出力してはいけない
` : '';

  const userPrompt = `Current translation (${targetLang}): ${currentTranslation}
${partialLanguageRule}
REQUIRED TONE: ${tone || 'none'} at ${toneLevel}%
Target style: ${toneStyle}
${structureInfo}
${langInfoOnly}
【重要: トーン調整の方向】
- current_translation（${targetLang}）をトーン調整すること
- 意味・構造は保持（構造情報の確信度・固有名詞ルールを守る）

【重要: 出力言語】
- new_translation は必ず ${targetLang} で出力すること
- 英語で出力してはいけない（${targetLang}が英語の場合を除く）

【重要: 固有名詞】
- 構造情報に記載された固有名詞の読みを必ず使用すること
- 勝手に別の読みに変えない（例: Gonta → Yuta は禁止）

【重要: 差分ルール】
- current_translation と同一の文章を返すのは禁止
- toneLevel が上がるほど、トーンの変化を段階的に強めること
- 意味を保持しつつ、最低1語は表現を変更または追加すること
- 意味・主語/目的語・否定・条件・数値・時制は絶対に変えない
${diffInstruction}
${options.variationInstruction ? '【追加の差分指示】\n' + options.variationInstruction + '\n' : ''}${reverseTranslationInstruction}

【出力前チェック - 必須】
JSONを出力する前に以下を確認し、違っていれば修正してから出力:
- new_translation が ${targetLang} で書かれているか？英語になっていないか？
- reverse_translation が ${sourceLang} で書かれているか？

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

// APIベースURL（テスト時に変更可能）
// @ts-expect-error globalThis may not have this property
const API_BASE_URL = globalThis.API_BASE_URL || '';

// OpenAI API呼び出し（Vercel Serverless Function経由）
async function callGeminiAPI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/openai`, {
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
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  // JSONオブジェクトを抽出（日本語テキストが前後にある場合に対応）
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return JSON.parse(cleaned);
}

// ============================================
// 構造化M抽出 v2（拡張ハイブリッド版）- 関数
// ============================================

const structureCache = new Map<string, ExpandedStructure>();

const EXPANDED_STRUCTURE_PROMPT = `あなたは多言語対応の構造分析アシスタントです。
入力された文章から、以下の10項目を抽出してください。

【抽出項目】
1. 主題: 何について話しているか
2. 動作: 何をするか/どうなるか
3. 意図: 依頼/確認/報告/質問/感謝/謝罪/提案/命令/その他
4. 主語: 誰が（明示されている場合のみ記載。省略されていれば「省略」と記載。推測で補填しない）
5. 対象: 誰に/何に（なければ「なし」）
6. 目的格: 「〜を」がついている単語（動作の直接の対象。なければ「なし」）
   ★ 重要: 目的格は翻訳時に必ず目的語(object)として扱う
   ★ 例: 「君を抱く」→ 目的格は「君」→ 翻訳で「君」は目的語（hold you）
7. 願望: 願望表現があるか（あり/なし）
   - あり: 〜したい、〜てほしい、〜たい、want to、hope to 等
   - なし: 願望表現がない
   ★ 重要: 願望は翻訳・逆翻訳で必ず保持する
   ★ 例: 「抱きたい」→ 願望: あり → "want to hold" / 「抱きたい」
   ★ ❌ 願望を消さない（「抱きたい」→「抱いてる」は禁止）
8. 人称: 動作の主体の人称（一人称単数/一人称複数/二人称/三人称）
   - 一人称単数: 私/僕/俺 → I
   - 一人称複数: 私たち/僕ら → We
   - 二人称: あなた/君 → You
   - 三人称: 彼/彼女/それ/彼ら → He/She/It/They
   ★ 重要: 主語が省略されていても、文脈から人称を判断する
   ★ 例: 「向かいます」（主語省略）→ 人称: 一人称単数（話者が向かう）
   ★ ❌ 人称を勝手に変えない（一人称単数 → 一人称複数は禁止）
9. 確信度: 確定/推測/可能性/伝聞
   - 確定: 〜だ、〜です（事実として述べる）
   - 推測: 〜と思う、〜だろう（自分の考え）
   - 可能性: 〜かも、〜かもしれない（確信が低い/不確か）
   - 伝聞: 〜らしい、〜そうだ、〜って、〜だって、〜んだって（誰かから聞いた情報）
10. 固有名詞: 人名/地名/組織名/製品名のリスト
   - text: 名前
   - type: person/place/org/product
   - 読み: ひらがな名詞の場合のローマ字読み（任意）
   - 敬称: なし/さん/様/君/ちゃん/その他
     ※ 敬称なし（呼び捨て）= 身内・親しい人 → 翻訳で尊敬語不要

【出力形式】
JSONのみ（説明不要）

【例1】
入力: 「ごんたが寝てから向かいます」
{"主題":"移動","動作":"向かう","意図":"報告","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称単数","確信度":"確定","固有名詞":[{"text":"ごんた","type":"person","読み":"Gonta","敬称":"なし"}]}
※ 主語省略 + 意図「報告」+ 人称「一人称単数」→ 翻訳時にIを使う
※ 敬称なし → 身内（子ども等）→ 尊敬語不要
※ ❌ 人称を変えない（I → We は禁止）

【例2】
入力: 「田中さんが来ます」
{"主題":"来訪","動作":"来る","意図":"報告","主語":"田中さん","対象":"なし","目的格":"なし","願望":"なし","人称":"三人称","確信度":"確定","固有名詞":[{"text":"田中","type":"person","敬称":"さん"}]}
※ 敬称あり → 他人 → 適切な敬意を払う

【例3】
入力: 「電車止まってるかも」
{"主題":"電車","動作":"止まっている","意図":"報告","主語":"電車","対象":"なし","目的格":"なし","願望":"なし","人称":"三人称","確信度":"可能性","固有名詞":[]}

【例4】
入力: 「雄太が会社くびになったらしいよ」
{"主題":"雄太の解雇","動作":"くびになった","意図":"報告","主語":"雄太","対象":"なし","目的格":"なし","願望":"なし","人称":"三人称","確信度":"伝聞","固有名詞":[{"text":"雄太","type":"person","敬称":"なし"}]}
※ 「らしい」= 伝聞 → "I heard" / "apparently" で翻訳

【例5】
入力: 「君を抱いていたい」
{"主題":"抱擁","動作":"抱く","意図":"報告","主語":"省略","対象":"なし","目的格":"君","願望":"あり","人称":"一人称単数","確信度":"確定","固有名詞":[]}
※ 目的格「君」→ 翻訳時に「君」は目的語
※ 願望「あり」→ "want to" を入れる（I want to hold you）
※ 人称「一人称単数」→ I を使う（We に変えない）
※ ❌ 主語と目的語を入れ替えない（you wanna hold me は禁止）
※ ❌ 願望を消さない（「抱きたい」→「抱いてる」は禁止）
※ ❌ 人称を変えない（I → We は禁止）`;

/**
 * 日本語テキストから構造を抽出（拡張ハイブリッド版・7項目）
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
    意図: 'その他',
    主語: '省略',
    対象: 'なし',
    目的格: 'なし',
    願望: 'なし',
    人称: '一人称単数',
    確信度: '確定',
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

    const validated: ExpandedStructure = {
      主題: parsed.主題 || 'なし',
      動作: parsed.動作 || 'なし',
      意図: parsed.意図 || 'その他',
      主語: parsed.主語 || '省略',
      対象: parsed.対象 || 'なし',
      目的格: parsed.目的格 || 'なし',
      願望: parsed.願望 || 'なし',
      人称: parsed.人称 || '一人称単数',
      確信度: parsed.確信度 || '確定',
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

  return `【構造情報】
・主語: ${structure.主語}
・動作: ${structure.動作}
・対象: ${structure.対象}
・目的格: ${structure.目的格 || 'なし'}
・願望: ${structure.願望 || 'なし'}
・人称: ${structure.人称 || '一人称単数'}
・意図: ${structure.意図}
・確信度: ${structure.確信度}
・固有名詞: ${entities}${langInfo}

【翻訳ルール】
- 「意図」「確信度」「願望」「人称」を翻訳で必ず保持すること
- 敬称なしの人名は身内・親しい人なので、尊敬語を使わない（例: 寝る→sleeps、NOT: お休みになる）
- 固有名詞の読みがある場合はその読みで翻訳する
- 一般名詞（電車、車、家など）はローマ字にせず普通に翻訳する（電車→train、NOT: densha）

【目的格ルール - 重要】
目的格（「〜を」がついている単語）は必ず目的語(object)として翻訳する:
- 例: 目的格「君」→ 翻訳で「君」は目的語 (hold you, love you, etc.)
- ❌ 主語と目的語を入れ替えない
- ❌ 「君を抱きたい」→ "you wanna hold me" は禁止（主語と目的語が逆）
- ✓ 「君を抱きたい」→ "I want to hold you"

【願望ルール - 重要】
願望が「あり」の場合、翻訳・逆翻訳で必ず願望表現を保持する:
- 翻訳: "want to" / "hope to" / "wish to" 等を入れる
- 逆翻訳: 「〜したい」「〜たい」「〜てほしい」等を保持する
- ❌ 願望を消さない
- ❌ 「抱きたい」→「抱いてる」は禁止（願望が消えてる）
- ✓ 「抱きたい」→ "want to hold" → 「抱きたい」

【人称ルール - 絶対遵守】
人称は翻訳で必ず保持する。勝手に変更しない:
- 一人称単数 → I を使う（絶対に We に変えない）
- 一人称複数 → We を使う
- 二人称 → You を使う
- 三人称 → He/She/It/They を使う
- ❌ 人称を変えない
- ❌ 「向かいます」(一人称単数) → "We're heading" は禁止
- ✓ 「向かいます」(一人称単数) → "I'm heading"
- ❌ カジュアルトーンでも人称を変えない

【主語省略ルール - 重要】
主語が「省略」の場合、意図で判断して主語を決定:
- 意図「報告」（自分の行動）・「謝罪」→ I（一人称）
  例: 「財布忘れた」→ "I forgot my wallet"
  例: 「遅れてごめん」→ "Sorry I'm late"
- 意図「質問」・「依頼」・「命令」→ You（相手）
  例: 「怒ってる？」→ "Are you angry?"
  例: 「窓開けて」→ "Can you open the window?"
- 状況・天候の報告 → It / The + 名詞
  例: 「雨降ってる」→ "It's raining"
  例: 「電車止まってる」→ "The train stopped"

【確信度ルール - 絶対遵守】
※このルールはトーン設定に関係なく最優先で適用される
- 確信度「確定」→ 推測語・伝聞語を絶対に入れない
  ✗ 禁止: I think / I guess / maybe / probably / perhaps / or something / I suppose / it seems / apparently / I heard
  ✓ 正しい: 「遅れてごめん、電車が止まってた」→ "Sorry I'm late, the train stopped"
  ✓ 正しい: 「雨が降ってる」→ "It's raining" (NOT: "I think it's raining")
- 確信度「推測」→ I think / probably / I guess を使う（自分の考え）
  例: 「雨が降ると思う」→ "I think it's raining" / "It's probably raining"
- 確信度「可能性」→ might / maybe / could / perhaps を使う
  例: 「雨が降るかも」→ "It might rain" / "Maybe it's raining"
- 確信度「希望」→ I hope / I wish を使う
  例: 「雨が降ってほしい」→ "I hope it rains"
- 確信度「伝聞」→ 以下のどれか1つだけを使う（複数使わない！）
  - "I heard ..." または "Apparently, ..." または "They say ..."
  ✗ 禁止: "I heard that ... apparently ..."（二重は禁止）
  ✗ 禁止: I think（これは推測であり伝聞ではない）
  例: 「雄太がクビになったらしい」→ "I heard Yuta got fired" または "Apparently Yuta got fired"

【重要】確信度「確定」の場合、以下の表現は一切使用禁止:
- I think / I guess / I suppose
- maybe / probably / perhaps / possibly
- or something / or whatever / or anything
- it seems / apparently / I heard / they say
- kinda / sorta + 推測的な表現

【重要】確信度「伝聞」と「推測」の違い:
- 伝聞（らしい/そうだ/って）= 誰かから聞いた → I heard / apparently
- 推測（と思う/だろう）= 自分の考え → I think / probably`;
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
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形（gonna, wanna, gotta）
- 文法より勢い重視

【カジュアル表現の例（確信度「確定」の場合）】
✓ "Sorry I'm late, the train stopped"（遅れてごめん、電車が止まってた）
✓ "My bad, train was down"（超カジュアル版）
✓ "Ugh, train died on me"（勢い重視版）

【重要】確信度ルールは絶対変更しない:
- 確信度「確定」→ 推測語一切なし（I think禁止）
- カジュアルでも「確定」は「確定」のまま
- 勢い重視 ≠ 曖昧さを追加`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${intensityDesc}くだけた表現に
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形OK（I'm, don't, can't）
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
// 2026-02-02 多言語バグ修正v2: targetLangを追加
function getReverseTranslationInstruction(
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
  const { sourceText, sourceLang, targetLang, isNative, previousTranslation, previousLevel, structure } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction(options);
  const reverseTranslationInstruction = getReverseTranslationInstruction(sourceLang, targetLang, toneLevel, options.tone, options.customTone);
  const differenceInstruction = getFullDifferenceInstruction(toneLevel, previousTranslation, previousLevel, options.tone);
  const variationInstruction = options.variationInstruction ? `\n${options.variationInstruction}` : '';
  const structureInfo = structure ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n` : '';
  
  // structureがなくても言語情報は必ず追加
  const langInfoOnly = !structure ? `
【出力言語 - 絶対遵守】
・翻訳の出力言語: ${targetLang}（translationフィールドは必ずこの言語で出力）
・逆翻訳の出力言語: ${sourceLang}（reverse_translationフィールドは必ずこの言語で出力）
` : '';
  
  // 翻訳先または逆翻訳が日本語の場合、敬語ルールを追加
  const isBusinessOrFormal = options.tone === 'business' || options.tone === 'formal';
  const japaneseRule = (targetLang === '日本語' || sourceLang === '日本語') ? `
【日本語の敬語ルール】
- 二重敬語は禁止（例: ×おっしゃられる ×ご覧になられる ×お召し上がりになられる）
- 正しい敬語を使う（例: ○おっしゃる ○ご覧になる ○召し上がる）
${isBusinessOrFormal ? `- ビジネス/丁寧トーンでは、原文が敬語でなくても必ず敬語（です/ます/ございます）で出力すること
- 原文「行く」→ 翻訳/逆翻訳「行きます」「参ります」等` : ''}
` : '';

  // 言語固有ルールを取得
  const languageSpecificRules = getLanguageSpecificRules(targetLang);

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。

★★★ 最重要: translation フィールドは必ず「${targetLang}」で出力すること ★★★

${structureInfo}
${langInfoOnly}
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}
${japaneseRule}

【絶対ルール - translation フィールド】
- "translation" は ${targetLang} のみで出力すること
- ${sourceLang}の文字は絶対に混ぜない
- 語尾の「だね」「じゃん」「ですね」「ございます」等は translation には絶対に入れない
- これらの語尾ルールは reverse_translation にのみ適用する

${languageSpecificRules}

【固有名詞の読み - 絶対遵守】
- 構造情報に記載された固有名詞の「読み」を必ずそのまま使用すること
- トーンに関係なく、読みを勝手に変更してはいけない

${isNative ? '【ネイティブモード】自然でネイティブらしい表現を使ってください。' : ''}

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseTranslationInstruction}
${differenceInstruction}
${variationInstruction}

【言語検出】
原文の言語を正確に判定し、detected_language に出力すること。
選択肢: 日本語, 英語, フランス語, スペイン語, ドイツ語, イタリア語, ポルトガル語, 韓国語, 中国語, チェコ語

【最終確認 - 出力前に必ず実行】
JSONを出力する直前に、以下の手順で見直しを行うこと:
1. 生成したtranslationを読み返す
2. それが本当に「${targetLang}」で書かれているか確認する
3. もし英語や別の言語になっていたら、${targetLang}で書き直す
4. 書き直した後にJSONを出力する

※ targetLangが「${targetLang}」なのに英語で出力するのは絶対禁止

必ず以下のJSON形式で出力してください：
{
  "translation": "${targetLang}のみの翻訳（${sourceLang}の文字は絶対に含めない）",
  "reverse_translation": "${sourceLang}のみの逆翻訳（語尾ルールはここにのみ適用）",
  "risk": "low|med|high",
  "detected_language": "原文の言語（上記選択肢から1つ）"
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

  // カスタムトーンはgpt-4.1-nanoの方が大袈裟感を出せる
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

// 解説の英語混入をチェック・修正
function sanitizeExplanation(explanation: ExplanationResult): ExplanationResult {
  return {
    point: explanation.point || '',
    explanation: explanation.explanation || '',
  };
}

// 解説を生成
// outputLangCode: 解説の出力言語コード（ja, en等）
export async function generateExplanation(
  translatedText: string,
  _sourceLang: string,
  targetLang: string,
  outputLangCode: string = 'ja'
): Promise<ExplanationResult> {
  // 言語コードから言語名を取得（プロンプト用）
  const outputLangName = getLangNameFromCode(outputLangCode)
  // targetLangも言語コードの可能性があるので変換を試みる
  const targetLangName = getLangNameFromCode(targetLang) || targetLang

  // 日本語出力の場合は日本語プロンプトを使う（モデルの日本語出力精度向上のため）
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

  // 英語混入チェックを追加
  return sanitizeExplanation(parsed);
}

/**
 * 「〜との違い」を各言語で返す（ISO 639-1 言語コード）
 */
export function getDifferenceFromText(langCode: string, level: number): string {
  switch (langCode) {
    case 'ja': return `${level}%との違い`
    case 'en': return `Difference from ${level}%`
    case 'es': return `Diferencia del ${level}%`
    case 'fr': return `Différence par rapport à ${level}%`
    case 'zh': return `与${level}%的差异`
    case 'ko': return `${level}%와의 차이`
    case 'de': return `Unterschied zu ${level}%`
    case 'it': return `Differenza dal ${level}%`
    case 'pt': return `Diferença de ${level}%`
    case 'cs': return `Rozdíl od ${level}%`
    default: return `Difference from ${level}%`
  }
}

/**
 * 「まだ生成されていません」を各言語で返す（ISO 639-1 言語コード）
 */
export function getNotYetGeneratedText(langCode: string): string {
  switch (langCode) {
    case 'ja': return '前のレベルの翻訳がまだ生成されていません。'
    case 'en': return 'Previous level translation not yet generated.'
    case 'es': return 'La traducción del nivel anterior aún no se ha generado.'
    case 'fr': return 'La traduction du niveau précédent n\'a pas encore été générée.'
    case 'zh': return '上一级别的翻译尚未生成。'
    case 'ko': return '이전 레벨의 번역이 아직 생성되지 않았습니다.'
    case 'de': return 'Die Übersetzung der vorherigen Stufe wurde noch nicht generiert.'
    case 'it': return 'La traduzione del livello precedente non è stata ancora generata.'
    case 'pt': return 'A tradução do nível anterior ainda não foi gerada.'
    case 'cs': return 'Překlad předchozí úrovně ještě nebyl vygenerován.'
    default: return 'Previous level translation not yet generated.'
  }
}

/**
 * 「生成に失敗しました」を各言語で返す（ISO 639-1 言語コード）
 */
export function getFailedToGenerateText(langCode: string): string {
  switch (langCode) {
    case 'ja': return '解説の生成に失敗しました。'
    case 'en': return 'Failed to generate explanation.'
    case 'es': return 'Error al generar la explicación.'
    case 'fr': return 'Échec de la génération de l\'explication.'
    case 'zh': return '生成解释失败。'
    case 'ko': return '설명 생성에 실패했습니다.'
    case 'de': return 'Erklärung konnte nicht generiert werden.'
    case 'it': return 'Impossibile generare la spiegazione.'
    case 'pt': return 'Falha ao gerar a explicação.'
    case 'cs': return 'Generování vysvětlení se nezdařilo.'
    default: return 'Failed to generate explanation.'
  }
}

/**
 * 「変化なし」を各言語で返す（ISO 639-1 言語コード）
 */
export function getNoChangeText(langCode: string): string {
  switch (langCode) {
    case 'ja': return 'このレベルでは前のレベルと同じ表現になりました。'
    case 'en': return 'No change from the previous level.'
    case 'es': return 'Sin cambios respecto al nivel anterior.'
    case 'fr': return 'Pas de changement par rapport au niveau précédent.'
    case 'zh': return '与上一级别相同，没有变化。'
    case 'ko': return '이전 레벨과 동일하여 변화가 없습니다.'
    case 'de': return 'Keine Änderung gegenüber der vorherigen Stufe.'
    case 'it': return 'Nessun cambiamento rispetto al livello precedente.'
    case 'pt': return 'Sem alteração em relação ao nível anterior.'
    case 'cs': return 'Žádná změna oproti předchozí úrovni.'
    default: return 'No change from the previous level.'
  }
}

/**
 * 言語名からISOコードを取得
 */
export function getLangCodeFromName(langName: string): string {
  const map: Record<string, string> = {
    '日本語': 'ja', 'Japanese': 'ja',
    '英語': 'en', 'English': 'en',
    'スペイン語': 'es', 'Spanish': 'es',
    'フランス語': 'fr', 'French': 'fr',
    '中国語': 'zh', 'Chinese': 'zh',
    '韓国語': 'ko', 'Korean': 'ko',
    'ドイツ語': 'de', 'German': 'de',
    'イタリア語': 'it', 'Italian': 'it',
    'ポルトガル語': 'pt', 'Portuguese': 'pt',
    'チェコ語': 'cs', 'Czech': 'cs',
  }
  const result = map[langName]
  if (!result) {
    console.warn(`[getLangCodeFromName] Unknown langName: "${langName}", defaulting to 'en'`)
  }
  return result || 'en'
}

/**
 * ISOコードから英語言語名を取得（AIプロンプト用）
 */
export function getLangNameFromCode(langCode: string): string {
  const map: Record<string, string> = {
    'ja': 'Japanese',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'zh': 'Chinese',
    'ko': 'Korean',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'cs': 'Czech',
  }
  return map[langCode] || 'English'
}

/**
 * トーンレベル間の違いを解説
 * @param previousTranslation 前のレベルの翻訳
 * @param currentTranslation 現在のレベルの翻訳
 * @param previousLevel 前のレベル（0, 50）
 * @param currentLevel 現在のレベル（50, 100）
 * @param tone トーン種類（casual, business, formal）
 * @param sourceLang 入力言語（解説をこの言語で出力）
 */
export async function generateToneDifferenceExplanation(
  previousTranslation: string,
  currentTranslation: string,
  previousLevel: number,
  currentLevel: number,
  tone: string,
  sourceLang: string
): Promise<ExplanationResult> {
  // sourceLangは言語コード（ja, en等）を想定
  const langName = getLangNameFromCode(sourceLang)

  // 同じ翻訳なら変化なし
  if (previousTranslation === currentTranslation) {
    return {
      point: getDifferenceFromText(sourceLang, previousLevel),
      explanation: getNoChangeText(sourceLang)
    };
  }

  void tone; // パラメータは将来の拡張用に保持

  const prevLabel = `${previousLevel}%`;
  const currLabel = `${currentLevel}%`;

  // 日本語の場合は日本語プロンプト、それ以外は英語プロンプト
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
    return {
      point: pointText,
      explanation: response.trim()
    };
  } catch (error) {
    console.error('[generateToneDifferenceExplanation] error:', error);
    return {
      point: pointText,
      explanation: getFailedToGenerateText(sourceLang)
    };
  }
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

【最重要ルール】
- 0%: 原文をそのまま返す（一切変更しない）
- 50%: 原文から必ず変更する（語尾・言い回しを変える）
- 100%: 50%よりさらに強く変える
- 0%と50%が同じ文章になるのは禁止！

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

【トーンレベルガイド - 差を明確に！】

カジュアル:
- 0%: そのまま（変更なし）
- 50%: 「〜だね」「〜だよ」「〜してる」「〜かな？」を追加
- 100%: 「めっちゃ〜」「マジで〜」「〜よ！」「〜じゃん！」

ビジネス:
- 0%: そのまま（変更なし）
- 50%: 「〜いたします」「〜でございます」「〜いただけますか」
- 100%: 「〜申し上げます」「〜賜りますよう」「誠に〜」

フォーマル:
- 0%: そのまま（変更なし）
- 50%: 「〜させていただきます」「〜でございます」
- 100%: 「〜申し上げる所存でございます」「何卒〜」

【良い例・悪い例】
元: 「太郎が寝てからあなたの家に行く」

✅ カジュアル0%: 太郎が寝てからあなたの家に行く（そのまま）
✅ カジュアル50%: 太郎が寝てからあなたの家に行くね！（語尾変更）
✅ カジュアル100%: 太郎が寝てからお前んち行くよ！（強調+くだけた表現）

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
  signal?: AbortSignal,
  structure?: ExpandedStructure
): Promise<string> {
  // レベル0はそのまま返す
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

  // ★ ビジネス/フォーマルトーンで「君」を置換
  if (tone === 'business' || tone === 'formal') {
    // 「○○君」（人名+君）→「○○さん」
    result = result.replace(/([ぁ-んァ-ン一-龯]+)君/g, '$1さん');
    // 単独の「君」→「あなた」（人名+君は既に置換済みなので残った「君」が対象）
    result = result.replace(/君/g, 'あなた');
    console.log(`[editJapaneseForTone] 君→あなた置換適用: ${result}`);
  }

  return result;
}
