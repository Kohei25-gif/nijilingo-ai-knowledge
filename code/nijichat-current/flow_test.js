const Groq = require('groq-sdk');
const OpenAI = require('openai');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const input = "その服素敵だね";

// 実際のプロンプト（簡略版）
const fullPrompt = (text) => `Translate this Japanese to English. Be natural.
Input: "${text}"
Output JSON: {"translation": "...", "breakdown": [...]}`;

const partialPrompt = (original, current, percent) => `Adjust this translation to ${percent}% native English.
Original Japanese: "${original}"
Current: "${current}"
Output JSON: {"translation": "..."}`;

async function testFlow(model, provider) {
  console.log(`\n=== ${model} (${provider}) ===`);
  const results = [];
  let totalTime = 0;
  let currentTranslation = "";
  
  // Step 1: FULL (0%)
  let start = Date.now();
  if (provider === 'groq') {
    const res = await groq.chat.completions.create({
      model, messages: [{ role: 'user', content: fullPrompt(input) }],
      response_format: { type: 'json_object' }, max_tokens: 500
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  } else {
    const res = await openai.chat.completions.create({
      model, messages: [{ role: 'user', content: fullPrompt(input) }],
      response_format: { type: 'json_object' }, max_tokens: 500
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  }
  let elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`1. FULL(0%): ${elapsed}ms → "${currentTranslation}"`);
  
  // Step 2: PARTIAL (50%)
  start = Date.now();
  if (provider === 'groq') {
    const res = await groq.chat.completions.create({
      model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 50) }],
      response_format: { type: 'json_object' }, max_tokens: 200
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  } else {
    const res = await openai.chat.completions.create({
      model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 50) }],
      response_format: { type: 'json_object' }, max_tokens: 200
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  }
  elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`2. PARTIAL(50%): ${elapsed}ms → "${currentTranslation}"`);
  
  // Step 3: PARTIAL (100%)
  start = Date.now();
  if (provider === 'groq') {
    const res = await groq.chat.completions.create({
      model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 100) }],
      response_format: { type: 'json_object' }, max_tokens: 200
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  } else {
    const res = await openai.chat.completions.create({
      model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 100) }],
      response_format: { type: 'json_object' }, max_tokens: 200
    });
    currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  }
  elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`3. PARTIAL(100%): ${elapsed}ms → "${currentTranslation}"`);
  
  console.log(`\n📊 合計: ${totalTime}ms (${(totalTime/1000).toFixed(2)}秒)`);
}

async function main() {
  console.log(`入力: "${input}"\n`);
  
  await testFlow('llama-3.3-70b-versatile', 'groq');
  await testFlow('gpt-4.1-mini', 'openai');
  await testFlow('gpt-4.1-nano', 'openai');
}

main().catch(console.error);
