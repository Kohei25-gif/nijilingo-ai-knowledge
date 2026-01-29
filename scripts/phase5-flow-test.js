/**
 * Phase 5: 実フロー速度検証
 * 
 * 【検証内容】
 * FULL(0%) → PARTIAL(50%) → PARTIAL(100%) の3回連続呼び出し
 * business / casual の2パターン
 * 
 * 【APIキーの場所】
 * - OPENAI_API_KEY: ~/Desktop/NijiLingo/.env.local
 * - GROQ_API_KEY: コマンドライン引数で渡す
 * 
 * 【使い方】
 * cd ~/clawd/nijilingo-ai-knowledge/scripts
 * GROQ_API_KEY=gsk_xxx OPENAI_API_KEY=xxx node phase5-flow-test.js
 */

const APIs = [
  { name: 'groq-8b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-4.1-nano', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-nano', keyEnv: 'OPENAI_API_KEY' },
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-4.1-mini', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini', keyEnv: 'OPENAI_API_KEY' },
  { name: 'groq-70b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keyEnv: 'GROQ_API_KEY' },
];

// Phase 4と同じテスト文
const testTexts = [
  '起きたら連絡して',
  'その服素敵だね',
  '遅れてごめん、電車が止まってた',
];

// 2パターン
const tones = ['business', 'casual'];

// FULL翻訳プロンプト（0%）
function getFullPrompt(tone) {
  const toneDesc = tone === 'business' ? 'formal business' : 'casual friendly';
  return `You are a Japanese to English translator.
Translate naturally for a ${toneDesc} context.

Output JSON only:
{
  "translation": "English translation",
  "reverse_translation": "日本語に戻した表現"
}`;
}

// PARTIAL翻訳プロンプト（50%, 100%）
function getPartialPrompt(tone, level) {
  let instruction = '';
  if (tone === 'business') {
    if (level === 50) {
      instruction = '丁寧語を使用。「〜していただけますか」「お願いいたします」程度の丁寧さ。';
    } else if (level === 100) {
      instruction = '最大限丁寧に。敬語を使い、「〜いただければ幸いです」「ご確認のほどお願い申し上げます」等の表現を使用。';
    }
  } else if (tone === 'casual') {
    if (level === 50) {
      instruction = '友達同士の会話程度。「〜だね」「〜してね」等のカジュアルな語尾。';
    } else if (level === 100) {
      instruction = '最大限くだけた表現。「〜じゃん」「マジで」「めっちゃ」等のスラング使用OK。';
    }
  }
  
  return `Adjust the translation to ${level}% ${tone} tone.
${instruction}

Output JSON only:
{
  "translation": "Adjusted English",
  "reverse_translation": "日本語（トーン反映: ${instruction}）"
}`;
}

async function callAPI(api, systemPrompt, userContent) {
  const key = process.env[api.keyEnv];
  if (!key) throw new Error(`Missing ${api.keyEnv}`);
  
  const start = Date.now();
  const res = await fetch(api.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: api.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 300,
      temperature: 0.3
    })
  });
  
  const elapsed = Date.now() - start;
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`API error: ${JSON.stringify(data.error || data)}`);
  }
  
  const content = data.choices[0].message.content;
  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return { result: parsed, time: elapsed };
  } catch {
    return { result: { raw: content }, time: elapsed };
  }
}

async function testFlow(api, input, tone) {
  const results = { steps: [], total: 0, outputs: [] };
  
  // Step 1: FULL (0%)
  const step1 = await callAPI(api, getFullPrompt(tone), `翻訳: ${input}`);
  results.steps.push({ level: '0%', time: step1.time });
  results.outputs.push(step1.result.reverse_translation || step1.result.translation || step1.result.raw);
  results.total += step1.time;
  
  // Step 2: PARTIAL (50%)
  const currentTrans = step1.result.translation || '';
  const step2 = await callAPI(api, getPartialPrompt(tone, 50), `Original: ${input}\nCurrent: ${currentTrans}`);
  results.steps.push({ level: '50%', time: step2.time });
  results.outputs.push(step2.result.reverse_translation || step2.result.translation || step2.result.raw);
  results.total += step2.time;
  
  // Step 3: PARTIAL (100%)
  const currentTrans2 = step2.result.translation || currentTrans;
  const step3 = await callAPI(api, getPartialPrompt(tone, 100), `Original: ${input}\nCurrent: ${currentTrans2}`);
  results.steps.push({ level: '100%', time: step3.time });
  results.outputs.push(step3.result.reverse_translation || step3.result.translation || step3.result.raw);
  results.total += step3.time;
  
  return results;
}

async function main() {
  console.log('='.repeat(80));
  console.log('Phase 5: 実フロー速度検証');
  console.log('='.repeat(80));
  console.log('\n【検証内容】');
  console.log('- FULL(0%) → PARTIAL(50%) → PARTIAL(100%) の3回連続呼び出し');
  console.log('- business / casual の2パターン');
  console.log('- テスト文3つ × 2パターン = 6フロー/モデル');
  console.log('\n【APIキーの場所】');
  console.log('- OPENAI_API_KEY: ~/Desktop/NijiLingo/.env.local');
  console.log('- GROQ_API_KEY: コマンドライン引数');
  console.log('='.repeat(80));
  
  const allResults = {};
  
  for (const api of APIs) {
    console.log(`\n\n${'#'.repeat(60)}`);
    console.log(`### ${api.name} ###`);
    console.log(`${'#'.repeat(60)}`);
    
    allResults[api.name] = { flows: [], avgTotal: 0, toneResults: {} };
    
    for (const tone of tones) {
      console.log(`\n【${tone}トーン】`);
      console.log('-'.repeat(40));
      allResults[api.name].toneResults[tone] = [];
      
      for (const input of testTexts) {
        console.log(`\n入力: "${input}"`);
        
        try {
          const result = await testFlow(api, input, tone);
          allResults[api.name].flows.push(result);
          allResults[api.name].toneResults[tone].push({ input, ...result });
          
          // 各ステップ表示
          for (let i = 0; i < result.steps.length; i++) {
            const step = result.steps[i];
            const output = result.outputs[i] || '';
            console.log(`  ${step.level}: ${step.time}ms → "${output.substring(0, 40)}..."`);
          }
          console.log(`  📊 合計: ${result.total}ms (${(result.total/1000).toFixed(2)}秒)`);
          
          // トーン差チェック
          const unique = new Set(result.outputs.map(o => (o || '').substring(0, 30))).size;
          console.log(`  トーン差: ${unique}/3 ${unique === 3 ? '✅' : '⚠️'}`);
          
        } catch (e) {
          console.log(`  ❌ エラー: ${e.message}`);
          allResults[api.name].flows.push({ error: e.message, total: 0 });
        }
      }
    }
    
    // このAPIの平均
    const validFlows = allResults[api.name].flows.filter(f => !f.error && f.total > 0);
    if (validFlows.length > 0) {
      const avg = validFlows.reduce((sum, f) => sum + f.total, 0) / validFlows.length;
      allResults[api.name].avgTotal = Math.round(avg);
      console.log(`\n⏱️ ${api.name} 平均フロー時間: ${allResults[api.name].avgTotal}ms (${(avg/1000).toFixed(2)}秒)`);
    }
  }
  
  // ===== サマリー =====
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Phase 5 最終結果');
  console.log('='.repeat(80));
  
  console.log('\n### 速度ランキング（3ステップ合計の平均）\n');
  console.log('| 順位 | モデル | 平均フロー時間 | 備考 |');
  console.log('|------|--------|---------------|------|');
  
  const sorted = Object.entries(allResults)
    .filter(([_, v]) => v.avgTotal > 0)
    .sort((a, b) => a[1].avgTotal - b[1].avgTotal);
  
  sorted.forEach(([name, data], i) => {
    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
    const sec = (data.avgTotal / 1000).toFixed(2);
    console.log(`| ${rank} | ${name} | ${data.avgTotal}ms (${sec}秒) | |`);
  });
  
  console.log('\n### 詳細データ\n');
  for (const [name, data] of sorted) {
    console.log(`\n**${name}**`);
    for (const tone of tones) {
      const toneData = data.toneResults[tone] || [];
      if (toneData.length === 0) continue;
      console.log(`  ${tone}:`);
      for (const r of toneData) {
        if (r.error) continue;
        const times = r.steps.map(s => `${s.level}:${s.time}ms`).join(' → ');
        console.log(`    "${r.input.substring(0, 10)}..." ${times} = ${r.total}ms`);
      }
    }
  }
}

main().catch(console.error);
