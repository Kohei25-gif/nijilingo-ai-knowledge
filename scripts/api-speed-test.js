/**
 * API速度計測スクリプト
 * 使い方: GROQ_API_KEY=xxx node api-speed-test.js
 */

const testText = "昨日友達と美味しいラーメン食べた";

// テスト対象のAPI設定
const apis = [
  {
    name: "groq-llama-8b",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
    keyEnv: "GROQ_API_KEY",
  },
  {
    name: "groq-llama-70b", 
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-70b-versatile",
    keyEnv: "GROQ_API_KEY",
  },
  {
    name: "openai-gpt4.1-nano",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-nano",
    keyEnv: "OPENAI_API_KEY",
  },
];

async function testApi(api) {
  const apiKey = process.env[api.keyEnv];
  if (!apiKey) {
    return { name: api.name, error: `${api.keyEnv} not set` };
  }

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
          {
            role: "system",
            content: "Translate Japanese to English. Return only the translation.",
          },
          {
            role: "user", 
            content: testText,
          },
        ],
        max_tokens: 100,
      }),
    });

    const elapsed = Date.now() - start;
    const data = await res.json();

    if (!res.ok) {
      return { name: api.name, error: data.error?.message || res.statusText, elapsed };
    }

    return {
      name: api.name,
      elapsed,
      result: data.choices?.[0]?.message?.content,
    };
  } catch (err) {
    return { name: api.name, error: err.message, elapsed: Date.now() - start };
  }
}

async function main() {
  console.log("🚀 API速度計測開始...\n");
  console.log(`テスト文: "${testText}"\n`);
  console.log("---");

  const results = [];

  for (const api of apis) {
    console.log(`\n⏱️  ${api.name} テスト中...`);
    const result = await testApi(api);
    results.push(result);

    if (result.error) {
      console.log(`   ❌ エラー: ${result.error}`);
    } else {
      console.log(`   ✅ ${result.elapsed}ms`);
      console.log(`   翻訳: "${result.result}"`);
    }
  }

  // ランキング出力
  console.log("\n\n📊 速度ランキング:");
  console.log("---");
  
  const sorted = results
    .filter(r => !r.error)
    .sort((a, b) => a.elapsed - b.elapsed);

  sorted.forEach((r, i) => {
    console.log(`${i + 1}位: ${r.name} - ${r.elapsed}ms`);
  });

  // JSON出力
  const output = {
    timestamp: new Date().toISOString(),
    testText,
    results: sorted.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      elapsed_ms: r.elapsed,
    })),
  };

  console.log("\n\n📁 JSON出力:");
  console.log(JSON.stringify(output, null, 2));
}

main();
