import type { VercelRequest, VercelResponse } from '@vercel/node';

interface OpenAIRequest {
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

  const { model, systemPrompt, userPrompt, temperature = 0.3 } = req.body as OpenAIRequest;

  // バリデーション
  if (!model || !systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // モデルによってAPI分岐
  const isOpenAIModel = model.startsWith('gpt-');
  const apiUrl = isOpenAIModel
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = isOpenAIModel
    ? process.env.OPENAI_API_KEY
    : process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: isOpenAIModel ? 'OPENAI_API_KEY not configured' : 'GROQ_API_KEY not configured' 
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: getErrorMessage(response.status), details: error });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 401: return 'OpenAI API認証エラー。APIキーを確認してください。';
    case 403: return 'OpenAI APIへのアクセスが拒否されました。';
    case 429: return 'レート制限に達しました。しばらく待ってから再試行してください。';
    case 500:
    case 502:
    case 503: return 'OpenAIサーバーエラー。時間をおいて再試行してください。';
    default: return `OpenAI APIエラー (${status})`;
  }
}
