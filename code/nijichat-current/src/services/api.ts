// API呼び出し・パース関連（groq.tsから分離）

// モデル定義
export const MODELS = {
  FULL: 'meta-llama/llama-4-maverick-17b-128e-instruct',    // FULL翻訳・解説用（Groq）
  PARTIAL: 'meta-llama/llama-4-maverick-17b-128e-instruct', // PARTIAL編集用（Groq）
  JAPANESE_EDIT: 'gpt-4.1-nano',                        // 日本語編集用（OpenAI）
} as const;

// 編集距離の閾値（元テキストの長さに対する比率）
// トーン変更時は逆翻訳も変わりうるので、緩めに設定
export const EDIT_DISTANCE_THRESHOLD = 0.95; // 95%以上変わったら怪しい

export class OpenAIApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = 'OpenAIApiError';
    this.status = status;
    this.details = details;
  }
}

export const getOpenAIErrorMessage = (status: number): string => {
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
export async function callGeminiAPI(
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
export function parseJsonResponse<T>(text: string): T {
  // ```json ... ``` を除去
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // JSONオブジェクトを抽出（日本語テキストが前後にある場合に対応）
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned);
}
