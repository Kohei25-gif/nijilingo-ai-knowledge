// types.ts v2: 6次元全体地図ベースの型定義
// 哲学: 統一設計。プロンプトが日本語なら値も日本語。
//       コード内部ロジック用（ModalityClass等）とAPI仕様（risk等）は英語維持。

// ═══ 格構造 ═══

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

// ═══ Ⅳ. スタンス ═══

export type EmotionPolarity = '肯定的' | '否定的' | '中立';

export type EmotionType =
  | '喜び' | '安心' | '期待' | '感謝' | '満足'
  | '悲しみ' | '不安' | '怒り' | '後悔' | '驚き' | '不満'
  | 'なし';

export interface Emotion {
  極性: EmotionPolarity;
  種類: EmotionType;
}

export type EvaluationValue = 'なし' | '肯定的評価' | '否定的評価';

export interface EvaluativeStance {
  評価: EvaluationValue;
  対象: string;
}

export type DegreeLevel = 'なし' | 'わずか' | '中程度' | '強い' | '極端';

// ═══ Ⅱ. 発話行為 ═══

export type ExpressionType = '平叙' | '疑問' | '命令' | '感嘆' | '祈願';

// ═══ Ⅲ. モダリティ ═══

export type EpistemicModality = '確定' | '推測' | '可能性';
export type Evidentiality = '直接経験' | '推論' | '伝聞';
export type DeonticModality = 'なし' | '義務' | '許可' | '禁止' | '能力';
export type ExplanatoryModality = 'なし' | '背景説明' | '当然の帰結';

// ═══ Ⅴ. 対人的伝達 ═══

export type PersonType = '一人称単数' | '一人称複数' | '二人称' | '三人称';
export type CommunicativeAttitude = 'なし' | '主張' | '共有確認' | '緩和';

// ═══ 固有名詞 ═══

export type EntityType = '人名' | '地名' | '組織名' | '製品名';

export interface NamedEntity {
  text: string;
  type: EntityType;
  読み?: string;
  敬称: string;  // 'なし' | 言語に応じた敬称文字列
}

// ═══ ExpandedStructure（19項目・6次元） ═══

export interface ExpandedStructure {
  // Ⅰ. 命題的内容
  格構造: CaseStructure;
  動作: string;
  動作の意味: string;
  極性: '肯定' | '否定';

  // Ⅱ. 発話行為
  表現類型: ExpressionType;
  発話行為: string[];

  // Ⅲ. モダリティ
  認識的モダリティ: EpistemicModality;
  証拠性: Evidentiality;
  義務的モダリティ: DeonticModality;
  説明のモダリティ: ExplanatoryModality;
  願望: 'あり' | 'なし';

  // Ⅳ. スタンス
  感情: Emotion;
  評価態度: EvaluativeStance;
  程度: DegreeLevel;

  // Ⅴ. 対人的伝達
  人称: PersonType;
  伝達態度: CommunicativeAttitude;

  // Ⅵ. テクスト
  固有名詞: NamedEntity[];
  保持値: string[];
  条件表現: string[];
}

// ═══ 翻訳結果（API仕様 — 英語維持） ═══

export interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  detected_language?: string;
  analysis?: {
    alignmentScore: number;
    hasAlignmentIssue: boolean;
    details?: string;
  };
}

export interface PartialTranslationResult {
  new_translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
  sourceAlignmentScore?: number;
}

export interface PartialTranslationResponse {
  new_translation?: string;
  reverse_translation?: string;
  risk?: 'low' | 'med' | 'high';
}

export interface GuardedTranslationResult {
  result: TranslationResult;
  usedFull: boolean;
  fallbackReason?: string | null;
}

// ═══ 解説 ═══

export interface ExplanationResult {
  point: string;
  explanation: string;
}

// ═══ 翻訳オプション ═══

export interface TranslateOptions {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  isNative: boolean;
  tone?: string;
  toneLevel?: number;
  customTone?: string;
  variationInstruction?: string;
  currentTranslation?: string;
  currentReverseTranslation?: string;
  seedTranslation?: string;
  previousTranslation?: string;
  previousLevel?: number;
  signal?: AbortSignal;
  structure?: ExpandedStructure;
}

// ═══ 不変条件チェック ═══

export interface InvariantCheckResult {
  passed: boolean;
  violations: string[];
}

// ═══ コード内部ロジック用（英語維持） ═══

export type ModalityClass = 'request' | 'confirmation' | 'suggestion' | 'obligation' | 'statement';

export interface FallbackDecision {
  shouldFallback: boolean;
  reason: string | null;
}
