import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const input = "その服素敵だね";

const fullPrompt = (text) => `Translate this Japanese to English naturally.
Input: "${text}"
Output JSON: {"translation": "your translation here"}`;

const partialPrompt = (original, current, percent) => `Adjust this translation to be ${percent}% native/casual English.
0% = literal, 100% = fully native slang.
Original Japanese: "${original}"
Current translation: "${current}"
Output JSON: {"translation": "adjusted translation"}`;

async function testFlow(model) {
  console.log(`\n=== ${model} ===`);
  let totalTime = 0;
  let currentTranslation = "";
  
  // Step 1: FULL (0%)
  let start = Date.now();
  let res = await openai.chat.completions.create({
    model, messages: [{ role: 'user', content: fullPrompt(input) }],
    response_format: { type: 'json_object' }, max_tokens: 300
  });
  currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  let elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`1. FULL(0%): ${elapsed}ms → "${currentTranslation}"`);
  
  // Step 2: PARTIAL (50%)
  start = Date.now();
  res = await openai.chat.completions.create({
    model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 50) }],
    response_format: { type: 'json_object' }, max_tokens: 200
  });
  currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`2. PARTIAL(50%): ${elapsed}ms → "${currentTranslation}"`);
  
  // Step 3: PARTIAL (100%)
  start = Date.now();
  res = await openai.chat.completions.create({
    model, messages: [{ role: 'user', content: partialPrompt(input, currentTranslation, 100) }],
    response_format: { type: 'json_object' }, max_tokens: 200
  });
  currentTranslation = JSON.parse(res.choices[0].message.content).translation;
  elapsed = Date.now() - start;
  totalTime += elapsed;
  console.log(`3. PARTIAL(100%): ${elapsed}ms → "${currentTranslation}"`);
  
  console.log(`📊 合計: ${totalTime}ms (${(totalTime/1000).toFixed(2)}秒)`);
}

async function main() {
  console.log(`入力: "${input}"`);
  
  await testFlow('gpt-4.1-mini');
  await testFlow('gpt-4.1-nano');
}

main().catch(console.error);
