import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GeminiRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, systemPrompt, userPrompt, temperature = 0.3 } = req.body as GeminiRequest;

  // バリデーション
  if (!model || !systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Gemini API error:', error);
      return res.status(response.status).json({ error: getErrorMessage(response.status), details: error });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ content });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Gemini APIリクエストエラー。';
    case 401:
    case 403: return 'Gemini API認証エラー。APIキーを確認してください。';
    case 429: return 'レート制限に達しました。しばらく待ってから再試行してください。';
    case 500:
    case 502:
    case 503: return 'Geminiサーバーエラー。時間をおいて再試行してください。';
    default: return `Gemini APIエラー (${status})`;
  }
}
