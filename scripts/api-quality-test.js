/**
 * 全API 翻訳品質テスト
 * 日本語→英語 & 英語→日本語
 */

const apis = [
  { name: "groq-8b", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", keyEnv: "GROQ_API_KEY" },
  { name: "groq-70b", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", keyEnv: "GROQ_API_KEY" },
  { name: "gpt-4.1-nano", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-nano", keyEnv: "OPENAI_API_KEY" },
  { name: "gpt-4.1-mini", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini", keyEnv: "OPENAI_API_KEY" },
];

// 日本語→英語テスト
const jaEnTests = [
  { input: "昨日買った", issue: "主語省略", check: (o) => !/^(I|We|He|She) /.test(o) ? "✅" : "⚠️主語追加" },
  { input: "おいしかった", issue: "主語省略", check: (o) => !/^(I|It) was/.test(o) || /^(That|It) was/.test(o) ? "✅" : "⚠️" },
  { input: "ラーメン食べた", issue: "過剰丁寧", check: (o) => !/please/i.test(o) ? "✅" : "❌please追加" },
  { input: "ちょっと待って", issue: "ニュアンス", check: (o) => /hang on|hold on|wait a sec|just a moment/i.test(o) ? "✅自然" : "⚠️直訳" },
  { input: "おうたが寝た", issue: "人名認識", check: (o) => /Ota|Outa|Oota/i.test(o) ? "✅人名OK" : "❌人名NG" },
  { input: "その資料、送ってもらえる？", issue: "依頼表現", check: (o) => /Can you|Could you|Would you/.test(o) ? "✅依頼OK" : "❌依頼NG" },
  { input: "手伝ってくれる？", issue: "依頼表現", check: (o) => /Can you|Could you|help/i.test(o) ? "✅" : "⚠️" },
  { input: "明日行く", issue: "時制", check: (o) => /tomorrow|going|will go/i.test(o) ? "✅" : "⚠️" },
  { input: "なんか変だ", issue: "ニュアンス", check: (o) => /off|weird|strange|odd/i.test(o) ? "✅" : "⚠️" },
  { input: "社長がいらっしゃいます", issue: "敬語", check: (o) => "👀確認" },
];

// 英語→日本語テスト
const enJaTests = [
  { input: "Could you send me that file?", issue: "依頼保持", check: (o) => /もらえ|くれ|いただけ/.test(o) ? "✅依頼OK" : "❌依頼消失" },
  { input: "I bought it yesterday", issue: "主語過剰", check: (o) => !/私は/.test(o) ? "✅自然" : "⚠️私は過剰" },
  { input: "That shirt looks great on you!", issue: "カジュアル", check: (o) => /ね|よ|！/.test(o) ? "✅カジュアル" : "⚠️硬い" },
  { input: "Hang on a sec", issue: "ニュアンス", check: (o) => /ちょっと|待って/.test(o) ? "✅" : "⚠️" },
  { input: "Something feels off", issue: "ニュアンス", check: (o) => /なんか|変|おかしい/.test(o) ? "✅" : "⚠️" },
  { input: "I'll head over after Ota goes to sleep", issue: "人名保持", check: (o) => /おうた|オウタ|Ota/.test(o) ? "✅人名OK" : "⚠️" },
  { input: "The president has arrived", issue: "敬語適用", check: (o) => /いらっしゃ|お見え|ました/.test(o) ? "✅敬語" : "⚠️普通" },
  { input: "Let's grab some ramen", issue: "カジュアル", check: (o) => /食べ|行こ/.test(o) ? "✅" : "⚠️" },
  { input: "I'm going tomorrow", issue: "自然さ", check: (o) => /明日|行く|行きます/.test(o) ? "✅" : "⚠️" },
  { input: "Can you help me?", issue: "依頼保持", check: (o) => /手伝|くれ|もらえ/.test(o) ? "✅" : "⚠️" },
];

const jaEnPrompt = `You are a professional Japanese-English translator.
- Translate naturally, not word-for-word
- Preserve casual/formal tone
- Recognize proper nouns (names)
- Keep the intent (request, statement, etc.)
- Don't add unnecessary subjects
- Don't add "please" unless original is polite
Return only the English translation.`;

const enJaPrompt = `You are a professional English-Japanese translator.
- Translate naturally into Japanese
- Use appropriate casual/formal tone
- Don't over-translate subjects (私は, etc.)
- Keep the intent (request, statement, etc.)
- Sound like a native speaker
Return only the Japanese translation.`;

async function callApi(api, systemPrompt, userText) {
  const apiKey = process.env[api.keyEnv];
  if (!apiKey) return { error: `${api.keyEnv} not set` };

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
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error?.message };
  return { result: data.choices?.[0]?.message?.content?.trim() };
}

async function main() {
  console.log("🔍 全API 翻訳品質テスト\n");
  console.log("=".repeat(80));

  const results = { jaEn: {}, enJa: {} };

  for (const api of apis) {
    results.jaEn[api.name] = [];
    results.enJa[api.name] = [];
  }

  // 日本語→英語テスト
  console.log("\n\n📝 【日本語→英語】テスト\n");
  console.log("-".repeat(80));

  for (const test of jaEnTests) {
    console.log(`\n入力: ${test.input} (${test.issue})`);
    for (const api of apis) {
      const r = await callApi(api, jaEnPrompt, test.input);
      const output = r.result || r.error;
      const verdict = r.error ? "❌エラー" : test.check(output);
      results.jaEn[api.name].push({ input: test.input, output, verdict });
      console.log(`  ${api.name.padEnd(12)}: ${output.substring(0, 50).padEnd(50)} ${verdict}`);
    }
  }

  // 英語→日本語テスト
  console.log("\n\n📝 【英語→日本語】テスト\n");
  console.log("-".repeat(80));

  for (const test of enJaTests) {
    console.log(`\n入力: ${test.input} (${test.issue})`);
    for (const api of apis) {
      const r = await callApi(api, enJaPrompt, test.input);
      const output = r.result || r.error;
      const verdict = r.error ? "❌エラー" : test.check(output);
      results.enJa[api.name].push({ input: test.input, output, verdict });
      console.log(`  ${api.name.padEnd(12)}: ${output.substring(0, 40).padEnd(40)} ${verdict}`);
    }
  }

  // スコア集計
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 スコア集計\n");

  for (const api of apis) {
    const jaEnOk = results.jaEn[api.name].filter(r => r.verdict.startsWith("✅")).length;
    const enJaOk = results.enJa[api.name].filter(r => r.verdict.startsWith("✅")).length;
    console.log(`${api.name.padEnd(12)}: JA→EN ${jaEnOk}/10  |  EN→JA ${enJaOk}/10  |  合計 ${jaEnOk + enJaOk}/20`);
  }
}

main();
