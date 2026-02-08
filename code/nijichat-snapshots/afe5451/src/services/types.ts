// 型定義（groq.tsから分離）

// 意図タイプ
export type IntentType = '依頼' | '確認' | '報告' | '質問' | '感謝' | '謝罪' | '提案' | '命令' | 'その他';

// 確信度
export type CertaintyLevel = '確定' | '推測' | '可能性' | '伝聞';

// 感情極性
export type SentimentPolarity = 'positive' | 'negative' | 'neutral';

// モダリティ（発話クラス）
export type ModalityType = '報告' | '依頼' | '感謝' | '質問' | '感想' | '提案' | 'その他';

// 程度（強度レベル）
export type DegreeLevel = 'none' | 'slight' | 'moderate' | 'strong' | 'extreme';

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

// 格構造（疑問詞ベースの14キー）
export interface CaseStructure {
  誰が: string;
  何を: string;
  誰に: string;
  誰と: string;
  なんて: string;
  どこに: string;
  どこで: string;
  どこへ: string;
  どこから: string;
  どこまで: string;
  いつ: string;
  いつから: string;
  いつまで: string;
  どうやって: string;
}

// 拡張構造スキーマ（格構造 + 意味フィールド）
export interface ExpandedStructure {
  格構造: CaseStructure; // 格助詞ベースの意味骨格
  主題: string;           // 何について
  動作: string;           // 何をする/どうなる
  動作の意味: string;     // 動作の英語での意味（go, come, eat等）
  意図: IntentType;       // 発話の目的
  感情極性: SentimentPolarity; // 感情の向き（positive/negative/neutral）
  モダリティ: ModalityType; // 発話の機能（報告/依頼/感謝/質問/感想/提案）
  願望: string;           // 願望表現（〜したい/want to等）があるか（あり/なし）
  人称: string;           // 一人称単数/一人称複数/二人称/三人称
  確信度: CertaintyLevel; // 話者の確信の度合い
  程度: DegreeLevel;      // 程度修飾語のレベル
  発話行為: string[];     // 複合発話を含む発話行為の一覧
  固有名詞: NamedEntity[];// 誤認識しやすい名詞
  保持値: string[];       // 変えてはいけない具体値（数値・日時・金額など）
  条件表現: string[];     // 原文の条件・理由構造（〜ので/もし〜なら等）
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
  // PARTIAL編集時の0%シード翻訳（累積ドリフト防止）
  seedTranslation?: string;
  // 差分生成用：前レベルの翻訳結果
  previousTranslation?: string;
  previousLevel?: number;
  // キャンセル用
  signal?: AbortSignal;
  // 構造化M抽出 v2（拡張ハイブリッド版）
  structure?: ExpandedStructure;
}

// 不変条件チェック結果の型
export interface InvariantCheckResult {
  passed: boolean;
  violations: string[];
}

// modality_class を抽出（request/confirmation/suggestion/obligation判定）
export type ModalityClass = 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'statement';

// フォールバック判定結果の型
export interface FallbackDecision {
  shouldFallback: boolean;
  reason: string | null;
}

// PARTIAL編集のレスポンス型
export interface PartialTranslationResponse {
  new_translation?: string;
  reverse_translation?: string;
  risk?: 'low' | 'med' | 'high';
}
