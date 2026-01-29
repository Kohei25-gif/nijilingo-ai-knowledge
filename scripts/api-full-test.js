/**
 * API総合テスト（速度・料金・翻訳品質）
 */

// テスト対象API
const apis = [
  {
    name: "gpt-4.1-nano",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-nano",
    keyEnv: "OPENAI_API_KEY",
    pricing: { input: 0.10, output: 0.40 }, // $/1M tokens
  },
  {
    name: "gpt-4.1-mini",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    keyEnv: "OPENAI_API_KEY",
    pricing: { input: 0.40, output: 1.60 },
  },
  {
    name: "groq-llama-8b",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
    keyEnv: "GROQ_API_KEY",
    pricing: { input: 0.05, output: 0.08 },
  },
  {
    name: "groq-llama-70b",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    keyEnv: "GROQ_API_KEY",
    pricing: { input: 0.59, output: 0.79 },
  },
];

// テスト文
const tests = {
  ja_to_en: [
    { input: "昨日友達と美味しいラーメン食べた", expected_tone: "casual" },
    { input: "おうたが寝てから向かいます", expected_ner: "おうた=人名" },
    { input: "その資料、後で送ってもらえる？", expected_modality: "request" },
  ],
  en_to_ja: [
    { input: "I'll head over after the meeting", expected_tone: "casual" },
    { input: "Could you send me that file later?", expected_modality: "request" },
    { input: "That shirt looks great on you!", expected_tone: "casual" },
  ],
};

async function callApi(api, systemPrompt, userText) {
  const apiKey = process.env[api.keyEnv];
  if (!apiKey) return { error: `${api.keyEnv} not set` };

  const start = Date.now();
  
  try {
    const res = await fetch(api.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: api.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    const elapsed = Date.now() - start;
    const data = await res.json();

    if (!res.ok) {
      return { error: data.error?.message || res.statusText, elapsed };
    }

    return {
      elapsed,
      result: data.choices?.[0]?.message?.content,
      usage: data.usage,
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function testJaToEn(api) {
  const systemPrompt = `You are a Japanese-English translator. 
Translate the Japanese text naturally. 
- Preserve casual/formal tone
- Recognize proper nouns (names)
- Keep the original intent (request, statement, etc.)
Return only the English translation.`;

  const results = [];
  for (const test of tests.ja_to_en) {
    const res = await callApi(api, systemPrompt, test.input);
    results.push({ input: test.input, ...res });
  }
  return results;
}

async function testEnToJa(api) {
  const systemPrompt = `You are an English-Japanese translator.
Translate the English text naturally into Japanese.
- Use appropriate casual/formal tone
- Sound natural (not literal translation)
Return only the Japanese translation.`;

  const results = [];
  for (const test of tests.en_to_ja) {
    const res = await callApi(api, systemPrompt, test.input);
    results.push({ input: test.input, ...res });
  }
  return results;
}

async function main() {
  console.log("🚀 API総合テスト開始\n");
  console.log("=".repeat(60));

  const allResults = [];

  for (const api of apis) {
    console.log(`\n📊 ${api.name} テスト中...`);
    console.log(`   料金: $${api.pricing.input}/$${api.pricing.output} per 1M tokens`);
    
    // JA→EN テスト
    console.log("\n   【日本語→英語】");
    const jaEnResults = await testJaToEn(api);
    let jaEnAvg = 0;
    for (const r of jaEnResults) {
      if (r.error) {
        console.log(`   ❌ ${r.input} → エラー: ${r.error}`);
      } else {
        console.log(`   ✅ ${r.input}`);
        console.log(`      → ${r.result} (${r.elapsed}ms)`);
        jaEnAvg += r.elapsed;
      }
    }
    jaEnAvg = jaEnResults.filter(r => !r.error).length > 0 
      ? Math.round(jaEnAvg / jaEnResults.filter(r => !r.error).length)
      : null;

    // EN→JA テスト
    console.log("\n   【英語→日本語】");
    const enJaResults = await testEnToJa(api);
    let enJaAvg = 0;
    for (const r of enJaResults) {
      if (r.error) {
        console.log(`   ❌ ${r.input} → エラー: ${r.error}`);
      } else {
        console.log(`   ✅ ${r.input}`);
        console.log(`      → ${r.result} (${r.elapsed}ms)`);
        enJaAvg += r.elapsed;
      }
    }
    enJaAvg = enJaResults.filter(r => !r.error).length > 0
      ? Math.round(enJaAvg / enJaResults.filter(r => !r.error).length)
      : null;

    allResults.push({
      name: api.name,
      pricing: api.pricing,
      jaEnAvg,
      enJaAvg,
      jaEnResults,
      enJaResults,
    });

    console.log("\n" + "-".repeat(60));
  }

  // ランキング出力
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 総合ランキング");
  console.log("=".repeat(60));

  // 速度ランキング（JA→EN）
  console.log("\n🚀 速度ランキング【日本語→英語】");
  const jaEnSpeed = allResults.filter(r => r.jaEnAvg).sort((a, b) => a.jaEnAvg - b.jaEnAvg);
  jaEnSpeed.forEach((r, i) => console.log(`   ${i + 1}位: ${r.name} - ${r.jaEnAvg}ms`));

  // 速度ランキング（EN→JA）
  console.log("\n🚀 速度ランキング【英語→日本語】");
  const enJaSpeed = allResults.filter(r => r.enJaAvg).sort((a, b) => a.enJaAvg - b.enJaAvg);
  enJaSpeed.forEach((r, i) => console.log(`   ${i + 1}位: ${r.name} - ${r.enJaAvg}ms`));

  // 料金ランキング
  console.log("\n💰 料金ランキング（安い順）");
  const byPrice = [...allResults].sort((a, b) => 
    (a.pricing.input + a.pricing.output) - (b.pricing.input + b.pricing.output)
  );
  byPrice.forEach((r, i) => 
    console.log(`   ${i + 1}位: ${r.name} - $${r.pricing.input}/$${r.pricing.output}`)
  );

  // JSON出力
  console.log("\n\n📁 JSON出力:");
  const output = {
    timestamp: new Date().toISOString(),
    rankings: {
      speed_ja_en: jaEnSpeed.map((r, i) => ({ rank: i + 1, name: r.name, avg_ms: r.jaEnAvg })),
      speed_en_ja: enJaSpeed.map((r, i) => ({ rank: i + 1, name: r.name, avg_ms: r.enJaAvg })),
      price: byPrice.map((r, i) => ({ rank: i + 1, name: r.name, pricing: r.pricing })),
    },
    details: allResults,
  };
  console.log(JSON.stringify(output, null, 2));
}

main();
