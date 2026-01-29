/**
 * Phase 3: バグ修正ループ テスト
 * アプリ実際のプロンプト + Phase 1テストケース
 */

const apis = [
  { name: 'groq-8b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant', keyEnv: 'GROQ_API_KEY', cost: '$0.05/$0.08' },
  { name: 'gpt-4.1-nano', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-nano', keyEnv: 'OPENAI_API_KEY', cost: '$0.10/$0.40' },
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY', cost: '$0.11/$0.34' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY', cost: '$0.15/$0.60' },
  { name: 'gpt-4.1-mini', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini', keyEnv: 'OPENAI_API_KEY', cost: '$0.40/$1.60' },
  { name: 'groq-70b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keyEnv: 'GROQ_API_KEY', cost: '$0.59/$0.79' },
];

// Phase 1テストケース（論文ベース）
const jaEnTests = [
  // P001: 主語省略
  { id: 'P001-1', input: '昨日買った', check: (o) => !/^(I|We|He|She|They) /.test(o), issue: '主語省略' },
  { id: 'P001-2', input: 'おいしかった', check: (o) => true, issue: '主語省略' },
  { id: 'P001-3', input: '行きたい', check: (o) => !/^I want/.test(o), issue: '主語省略' },
  // P002: 過剰丁寧
  { id: 'P002-1', input: 'ラーメン食べた', check: (o) => !/please/i.test(o), issue: '過剰丁寧' },
  { id: 'P002-2', input: '行こう', check: (o) => !/shall we/i.test(o), issue: '過剰丁寧' },
  // P004: ニュアンス
  { id: 'P004-1', input: 'ちょっと待って', check: (o) => /hang|hold|sec|moment/i.test(o), issue: 'ニュアンス' },
  { id: 'P004-2', input: 'なんか変だ', check: (o) => /off|weird|strange/i.test(o), issue: 'ニュアンス' },
  // P009: 依頼表現
  { id: 'P009-1', input: 'その資料、送ってもらえる？', check: (o) => /Can you|Could you|Would you/.test(o), issue: '依頼' },
  { id: 'P009-2', input: '手伝ってくれる？', check: (o) => /Can you|Could you|help/i.test(o), issue: '依頼' },
  // P010: 人名認識
  { id: 'P010-1', input: 'おうたが寝た', check: (o) => /Ota|Outa/i.test(o) && !/song|sing/i.test(o), issue: '人名' },
];

const enJaTests = [
  // P011: 主語過剰翻訳
  { id: 'P011-1', input: 'I bought it yesterday', check: (o) => !/私は/.test(o), issue: '主語過剰' },
  { id: 'P011-2', input: 'We went there', check: (o) => !/私たちは/.test(o), issue: '主語過剰' },
  // P012: 依頼保持
  { id: 'P012-1', input: 'Could you send me that file?', check: (o) => /もらえ|くれ|いただけ/.test(o), issue: '依頼保持' },
  { id: 'P012-2', input: 'Can you help me?', check: (o) => /手伝|くれ|もらえ/.test(o), issue: '依頼保持' },
  // ニュアンス
  { id: 'P013-1', input: 'Hang on a sec', check: (o) => /ちょっと|待って/.test(o), issue: 'ニュアンス' },
  { id: 'P013-2', input: 'Something feels off', check: (o) => /なんか|変|おかしい/.test(o), issue: 'ニュアンス' },
  // カジュアル
  { id: 'P014-1', input: 'That shirt looks great on you!', check: (o) => /ね|よ|！/.test(o), issue: 'カジュアル' },
  { id: 'P014-2', input: "Let's grab some ramen", check: (o) => /食べ|行こ/.test(o), issue: 'カジュアル' },
  // 敬語
  { id: 'P015-1', input: 'The president has arrived', check: (o) => /ました|です/.test(o), issue: '敬語' },
  // 人名
  { id: 'P016-1', input: "I'll head over after Ota goes to sleep", check: (o) => /おうた|オウタ|太田/.test(o), issue: '人名' },
];

// アプリ実際のプロンプト（簡易版）
const jaEnPrompt = `あなたは日本語から英語への翻訳の専門家です。

【不変条件】
1. 原文の意図（依頼/質問/陳述）を変えない
2. 人名は固有名詞として認識（おうた→Outa、歌ではない）
3. 省略されている主語は補完しない（日本語の曖昧さを保持）
4. 過剰な丁寧表現を追加しない（pleaseの乱用禁止）
5. ニュアンスを保持する（ちょっと→hang on等）

翻訳結果のみを返してください。`;

const enJaPrompt = `あなたは英語から日本語への翻訳の専門家です。

【不変条件】
1. 原文の意図（依頼/質問/陳述）を変えない
2. 人名はカタカナまたはひらがなで表記
3. 主語を過剰に追加しない（私は、私たちは等）
4. 自然な日本語にする（直訳しない）
5. カジュアル/フォーマルのトーンを保持

翻訳結果のみを返してください。`;

async function callApi(api, systemPrompt, userText) {
  const apiKey = process.env[api.keyEnv];
  if (!apiKey) return { error: `${api.keyEnv} not set` };

  const start = Date.now();
  const res = await fetch(api.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: api.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });
  const elapsed = Date.now() - start;
  const data = await res.json();
  if (!res.ok) return { error: data.error?.message, elapsed };
  return { result: data.choices?.[0]?.message?.content?.trim() || '', elapsed };
}

async function main() {
  console.log('🚀 Phase 3: バグ収集テスト（アプリプロンプト版）\\n');
  console.log('='.repeat(70));

  const results = {};

  for (const api of apis) {
    console.log(`\\n📊 ${api.name} | ${api.cost}`);
    console.log('-'.repeat(70));

    let jaEnPass = 0, enJaPass = 0, totalTime = 0, count = 0;

    // JA→EN
    console.log('\\n【JA→EN】');
    for (const t of jaEnTests) {
      const r = await callApi(api, jaEnPrompt, t.input);
      totalTime += r.elapsed || 0;
      count++;
      const pass = !r.error && t.check(r.result);
      if (pass) jaEnPass++;
      const mark = r.error ? '❌ERR' : (pass ? '✅' : '❌');
      console.log(`${t.id} ${t.input.padEnd(20)} → ${(r.result || r.error || '').substring(0,30).padEnd(30)} ${mark}`);
    }

    // EN→JA
    console.log('\\n【EN→JA】');
    for (const t of enJaTests) {
      const r = await callApi(api, enJaPrompt, t.input);
      totalTime += r.elapsed || 0;
      count++;
      const pass = !r.error && t.check(r.result);
      if (pass) enJaPass++;
      const mark = r.error ? '❌ERR' : (pass ? '✅' : '❌');
      console.log(`${t.id} ${t.input.substring(0,20).padEnd(20)} → ${(r.result || r.error || '').substring(0,25).padEnd(25)} ${mark}`);
    }

    const avgTime = Math.round(totalTime / count);
    results[api.name] = { jaEn: jaEnPass, enJa: enJaPass, total: jaEnPass + enJaPass, avgMs: avgTime, cost: api.cost };
    console.log(`\\n📊 ${api.name}: JA→EN ${jaEnPass}/${jaEnTests.length} | EN→JA ${enJaPass}/${enJaTests.length} | 合計 ${jaEnPass+enJaPass}/20 | 平均 ${avgTime}ms`);
  }

  // 最終ランキング
  console.log('\\n\\n' + '='.repeat(70));
  console.log('📊 最終ランキング');
  console.log('='.repeat(70));

  const sorted = Object.entries(results).sort((a, b) => b[1].total - a[1].total);
  console.log('\\n| 順位 | API | JA→EN | EN→JA | 合計 | 平均速度 | コスト |');
  console.log('|-----|-----|-------|-------|------|----------|--------|');
  sorted.forEach(([name, r], i) => {
    console.log(`| ${i+1}位 | ${name.padEnd(12)} | ${r.jaEn}/10 | ${r.enJa}/10 | ${r.total}/20 | ${r.avgMs}ms | ${r.cost} |`);
  });
}

main();
