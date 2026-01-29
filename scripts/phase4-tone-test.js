/**
 * Phase 4: トーン差検証
 * 0%/50%/100%で日本語が変わるかテスト
 */

const apis = [
  { name: 'gpt-4.1-mini', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini', keyEnv: 'OPENAI_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-4.1-nano', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-nano', keyEnv: 'OPENAI_API_KEY' },
  { name: 'groq-70b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keyEnv: 'GROQ_API_KEY' },
];

// テスト文
const testTexts = [
  '起きたら連絡して',
  'その服素敵だね',
  '遅れてごめん、電車が止まってた',
  '明日の会議の資料を送ってもらえる？',
  'ありがとう、助かった',
];

// トーン設定
const tones = [
  { name: 'business', levels: [0, 50, 100] },
  { name: 'casual', levels: [0, 50, 100] },
];

// アプリ実際のプロンプト（FULL翻訳）
function getFullPrompt(tone, toneLevel) {
  let toneInstruction = '';
  if (toneLevel === 0) {
    toneInstruction = '原文の意味をそのまま自然に翻訳してください。';
  } else if (tone === 'business') {
    if (toneLevel >= 100) {
      toneInstruction = '【ビジネス 100%】最大限丁寧に。敬語を使い、「〜いただければ幸いです」「ご確認のほどお願い申し上げます」等の表現を使用。';
    } else if (toneLevel >= 50) {
      toneInstruction = '【ビジネス 50%】丁寧語を使用。「〜していただけますか」「お願いいたします」程度の丁寧さ。';
    }
  } else if (tone === 'casual') {
    if (toneLevel >= 100) {
      toneInstruction = '【カジュアル 100%】最大限くだけた表現。「〜じゃん」「マジで」「めっちゃ」等のスラング使用OK。';
    } else if (toneLevel >= 50) {
      toneInstruction = '【カジュアル 50%】友達同士の会話程度。「〜だね」「〜してね」等のカジュアルな語尾。';
    }
  }

  return `あなたは日本語から英語への翻訳の専門家です。

【翻訳スタイル指示】
${toneInstruction}

【出力ルール】
- 翻訳結果をJSON形式で返す
- translation: 英語翻訳
- reverse_translation: 日本語に戻した表現（トーンを反映）
- risk: low/med/high

【重要】reverse_translation は翻訳スタイル指示に従ったトーンで出力すること。

必ず以下のJSON形式で出力：
{
  "translation": "英語翻訳",
  "reverse_translation": "日本語（トーン反映）",
  "risk": "low"
}`;
}

async function callApi(api, systemPrompt, userText) {
  const apiKey = process.env[api.keyEnv];
  if (!apiKey) return { error: `${api.keyEnv} not set` };

  const start = Date.now();
  const res = await fetch(api.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: api.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下のテキストを翻訳してください：\n\n${userText}` },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });
  const elapsed = Date.now() - start;
  const data = await res.json();
  if (!res.ok) return { error: data.error?.message, elapsed };
  
  const content = data.choices?.[0]?.message?.content || '';
  try {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { result: parsed, elapsed };
  } catch {
    return { result: { raw: content }, elapsed };
  }
}

async function main() {
  console.log('🚀 Phase 4: トーン差検証\\n');
  console.log('='.repeat(80));

  const results = {};

  for (const api of apis) {
    console.log(`\\n📊 ${api.name}`);
    console.log('='.repeat(80));
    
    let passCount = 0;
    let totalTests = 0;

    for (const tone of tones) {
      console.log(`\\n【${tone.name}トーン】`);
      console.log('-'.repeat(60));

      for (const text of testTexts.slice(0, 3)) { // 各トーン3文ずつ
        console.log(`\\n入力: ${text}`);
        
        const outputs = [];
        for (const level of tone.levels) {
          const prompt = getFullPrompt(tone.name, level);
          const r = await callApi(api, prompt, text);
          const reverseJa = r.result?.reverse_translation || r.result?.raw || r.error || '';
          outputs.push({ level, reverseJa: reverseJa.substring(0, 40) });
          console.log(`  ${level}%: ${reverseJa.substring(0, 50)}`);
        }
        
        // 3つ全部違うか判定
        const unique = new Set(outputs.map(o => o.reverseJa)).size;
        const pass = unique === 3;
        totalTests++;
        if (pass) passCount++;
        console.log(`  → ${unique}/3 ユニーク ${pass ? '✅ PASS' : '❌ FAIL'}`);
      }
    }

    results[api.name] = { pass: passCount, total: totalTests, rate: Math.round(passCount/totalTests*100) };
    console.log(`\\n📊 ${api.name}: ${passCount}/${totalTests} (${results[api.name].rate}%)`);
  }

  // 最終結果
  console.log('\\n\\n' + '='.repeat(80));
  console.log('📊 Phase 4 最終結果');
  console.log('='.repeat(80));
  console.log('\\n| API | Pass | Total | Rate |');
  console.log('|-----|------|-------|------|');
  Object.entries(results)
    .sort((a, b) => b[1].rate - a[1].rate)
    .forEach(([name, r]) => {
      console.log(`| ${name.padEnd(12)} | ${r.pass}/${r.total} | ${r.total} | ${r.rate}% |`);
    });
}

main();
