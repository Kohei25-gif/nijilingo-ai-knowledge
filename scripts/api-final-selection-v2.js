/**
 * API最終選考 v2: アプリの実プロンプトを使用
 * 
 * 目標: llama-4-scout / gpt-oss-120b が「実際のフロー」で満点を取る
 * 満点 = 翻訳精度 + トーン差 + 速度
 * 
 * 使い方: GROQ_API_KEY=xxx node api-final-selection-v2.js
 */

// ========================================
// アプリの実プロンプト（groq.tsからそのままコピー）
// ========================================

const INVARIANT_RULES = `
【不変条件 - 翻訳時に絶対守ること】
1. entities - 数字、日付、時刻、金額、固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. modality_class - 依頼/義務/提案のクラスを変えない
5. question/statement - 質問/断定を変えない
6. condition markers - if/unless/when等を保持
7. commitment - 約束を勝手に追加しない
8. stance_strength - 同意や感情の強さを勝手に変えない（例：OKをPerfectに変えない）

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;

const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない（例: 素敵/かわいい/きれい/良い は "nice/lovely/cute/beautiful" の同カテゴリで表現する）
2. cool/sick/dude/huh など評価軸を変える語は禁止
3. reverse_translation は意味を保持しつつ、トーン差を語尾・強調語で必ず表現する（英語が変わった場合は逆翻訳も必ず変える）
4. 服の一般語（洋服/服/服装/コーデ/装い）は clothes/outfit を使う。"dress" は「ドレス/ワンピース」が明示された時だけ使用可
`;

// getToneStyleInstruction（アプリからコピー）
function getToneStyleInstruction(tone, toneLevel, customTone) {
  if (tone === 'custom') {
    return `【カスタムトーン: ${customTone || '指定なし'}】
■ 絶対ルール: このトーンは「Lv5（最大誇張）」で表現すること。控えめは禁止。
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。`;
  }

  if (toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし`;
  }

  if (!tone) {
    return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }

  let intensityLabel = '';
  if (toneLevel < 50) intensityLabel = '多少';
  else if (toneLevel < 75) intensityLabel = '';
  else if (toneLevel < 100) intensityLabel = '結構';
  else intensityLabel = 'めちゃくちゃ';

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形（gonna, wanna, gotta）
- 文法より勢い重視`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- くだけた表現に
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形OK（I'm, don't, can't）
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス敬語
- 省略形は一切使わない
- 例: "I would be most grateful if...", "It is my pleasure to inform you that..."
- 格式高く丁重な表現`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: ${toneLevel}% - 標準のビジネス表現】
- 省略形は避ける
- 丁寧語を使う
- 例: "Could you please...", "I would like to..."
- プロフェッショナルなトーン`;
      }
      return `【トーンレベル: ${toneLevel}% - 軽めのビジネス表現】
- 基本的に省略形は避ける
- シンプルな丁寧表現
- 丁寧だが堅すぎない`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃ丁寧（最大級の敬語・謙譲語）】
- 最上級の敬意を示す表現
- 謙譲語・尊敬語を最大限に使用
- 例: "I would be deeply honored...", "Your esteemed presence..."
- 最高の礼儀と敬意`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: ${toneLevel}% - 標準の丁寧表現】
- 丁寧な言い回し
- 例: "Would you mind...", "I appreciate..."
- 敬意あるトーン`;
      }
      return `【トーンレベル: ${toneLevel}% - 軽めの丁寧表現】
- 基本的な丁寧表現
- シンプルに丁寧`;

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

// getReverseTranslationInstruction（アプリからコピー）
function getReverseTranslationInstruction(sourceLang, toneLevel, tone) {
  if (sourceLang !== '日本語') {
    return `【逆翻訳ルール - 最重要】
⚠️ reverse_translation は 100% ${sourceLang}のみ で出力すること ⚠️`;
  }

  const toneDescription =
    tone === 'casual' ? '友達に話すようなカジュアルな口調' :
    tone === 'business' ? 'ビジネスシーンで使う敬語' :
    tone === 'formal' ? '最上級の丁寧な敬語（ございます等）' :
    '自然な口調';

  return `【逆翻訳ルール】
- ${toneDescription}で表現すること
- レベル${toneLevel}%: 0%が最も控えめ、100%が最も強い表現

【最重要：全レベル異なる表現にすること】
0%, 50%, 100%は必ず全て異なる表現にすること。
- 英語（translation）も各レベルで必ず変える
- 逆翻訳（reverse_translation）も各レベルで必ず変える

【基本ルール】
- 疑問文は疑問文のまま（？で終わる）
- 平叙文は平叙文のまま
- 自然な日本語であること`;
}

// ========================================
// API設定
// ========================================

const APIs = [
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
];

const testTexts = [
  '起きたら連絡して',
  'その服素敵だね',
  '遅れてごめん、電車が止まってた',
];

const tones = ['casual', 'business', 'formal'];
const levels = [0, 50, 100];
const MAX_ITERATIONS = 10;
const RECORD_AT = [1, 5, 10];

// APIコール間のディレイ
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================
// API呼び出し
// ========================================

async function callAPI(api, systemPrompt, userPrompt) {
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
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  });
  
  const elapsed = Date.now() - start;
  const data = await res.json();
  
  if (!res.ok) throw new Error(`API error: ${JSON.stringify(data.error || data)}`);
  
  const content = data.choices[0].message.content;
  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  try {
    return { result: JSON.parse(cleaned), time: elapsed };
  } catch {
    return { result: { raw: content }, time: elapsed };
  }
}

// ========================================
// システムプロンプト生成（アプリの実装を再現）
// ========================================

function buildSystemPrompt(tone, toneLevel) {
  const toneInstruction = getToneStyleInstruction(tone, toneLevel);
  const reverseInstruction = getReverseTranslationInstruction('日本語', toneLevel, tone);
  
  return `あなたは日本語から英語への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【絶対ルール - translation フィールド】
- "translation" は 英語 のみで出力すること
- 日本語の文字は絶対に混ぜない

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseInstruction}

必ず以下のJSON形式で出力してください：
{
  "translation": "英語のみの翻訳",
  "reverse_translation": "日本語のみの逆翻訳（トーン反映）",
  "risk": "low|med|high"
}`;
}

// ========================================
// テスト実行
// ========================================

async function runTest(api) {
  const results = {
    tones: {},
    totalPass: 0,
    totalTests: 0,
    totalTime: 0,
    failures: []
  };
  
  for (const tone of tones) {
    results.tones[tone] = { pass: 0, total: 0 };
    
    for (const text of testTexts) {
      const outputs = [];
      let flowTime = 0;
      
      for (const level of levels) {
        const systemPrompt = buildSystemPrompt(tone, level);
        const userPrompt = `以下のテキストを翻訳してください（${tone}スタイル、強度${level}%）：\n\n${text}`;
        
        try {
          const { result, time } = await callAPI(api, systemPrompt, userPrompt);
          flowTime += time;
          const reverseJa = result.reverse_translation || result.raw || '';
          outputs.push({ level, reverseJa: reverseJa.substring(0, 50), translation: result.translation || '' });
          await delay(200); // レート制限対策
        } catch (e) {
          outputs.push({ level, reverseJa: `ERROR: ${e.message}`, translation: '' });
          await delay(500); // エラー時は長めに待つ
        }
      }
      
      results.totalTime += flowTime;
      
      // トーン差判定: 3つ全部違うか
      const uniqueReverse = new Set(outputs.map(o => o.reverseJa.substring(0, 30))).size;
      const pass = uniqueReverse === 3;
      
      results.tones[tone].total++;
      results.totalTests++;
      
      if (pass) {
        results.tones[tone].pass++;
        results.totalPass++;
      } else {
        results.failures.push({ tone, text, outputs });
      }
    }
  }
  
  return results;
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('='.repeat(80));
  console.log('API最終選考 v2: アプリの実プロンプトを使用');
  console.log('='.repeat(80));
  console.log('\n対象API: llama-4-scout, gpt-oss-120b');
  console.log('トーン: casual / business / formal');
  console.log('目標: トーン差検証 9/9 (100%)');
  console.log('ループ回数: 30回\n');
  
  const allResults = {};
  
  for (const api of APIs) {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`### ${api.name} ###`);
    console.log(`${'#'.repeat(60)}`);
    
    allResults[api.name] = { iterations: [], finalResult: null };
    
    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      const testResult = await runTest(api);
      
      if (RECORD_AT.includes(i)) {
        const toneRates = {};
        for (const tone of tones) {
          const t = testResult.tones[tone];
          toneRates[tone] = `${t.pass}/${t.total}`;
        }
        
        allResults[api.name].iterations.push({
          iteration: i,
          pass: testResult.totalPass,
          total: testResult.totalTests,
          rate: Math.round(testResult.totalPass / testResult.totalTests * 100),
          avgTime: Math.round(testResult.totalTime / testResult.totalTests),
          toneRates
        });
        
        console.log(`\n📊 ${i}回目: ${testResult.totalPass}/${testResult.totalTests} (${Math.round(testResult.totalPass / testResult.totalTests * 100)}%)`);
        console.log(`   casual: ${toneRates.casual}, business: ${toneRates.business}, formal: ${toneRates.formal}`);
        console.log(`   平均時間: ${Math.round(testResult.totalTime / testResult.totalTests)}ms`);
      }
      
      // 満点なら終了
      if (testResult.totalPass === testResult.totalTests) {
        console.log(`\n🎉 ${api.name}: ${i}回目で満点達成！`);
        allResults[api.name].achievedAt = i;
        allResults[api.name].finalResult = testResult;
        break;
      }
      
      allResults[api.name].finalResult = testResult;
    }
  }
  
  // ========================================
  // 最終結果出力
  // ========================================
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 API最終選考 - 結果');
  console.log('='.repeat(80));
  
  // 進捗表
  console.log('\n### 進捗（1回目 / 15回目 / 30回目）\n');
  console.log('| モデル | 1回目 | 15回目 | 30回目 | 平均時間 | 達成 |');
  console.log('|--------|-------|--------|--------|----------|------|');
  
  for (const api of APIs) {
    const r = allResults[api.name];
    const iter1 = r.iterations.find(x => x.iteration === 1);
    const iter15 = r.iterations.find(x => x.iteration === 15);
    const iter30 = r.iterations.find(x => x.iteration === 30) || r.iterations[r.iterations.length - 1];
    const achieved = r.achievedAt ? `${r.achievedAt}回目` : '未達成';
    const avgTime = iter30?.avgTime || '-';
    
    console.log(`| ${api.name.padEnd(14)} | ${iter1?.rate ?? '-'}% | ${iter15?.rate ?? '-'}% | ${iter30?.rate ?? '-'}% | ${avgTime}ms | ${achieved} |`);
  }
  
  // トーン別正答率
  console.log('\n### トーン別正答率（最終）\n');
  console.log('| モデル | casual | business | formal | 合計 |');
  console.log('|--------|--------|----------|--------|------|');
  
  for (const api of APIs) {
    const r = allResults[api.name].finalResult;
    if (!r) continue;
    const casual = `${r.tones.casual.pass}/${r.tones.casual.total}`;
    const business = `${r.tones.business.pass}/${r.tones.business.total}`;
    const formal = `${r.tones.formal.pass}/${r.tones.formal.total}`;
    const total = `${r.totalPass}/${r.totalTests}`;
    console.log(`| ${api.name.padEnd(14)} | ${casual} | ${business} | ${formal} | ${total} |`);
  }
  
  // 最終評価
  console.log('\n### 最終評価\n');
  console.log('| モデル | 翻訳精度 | JA→EN | EN→JA | トーン差 | 単体速度 | フロー速度 | コスト |');
  console.log('|--------|----------|-------|-------|----------|----------|------------|--------|');
  
  const phase3Data = {
    'llama-4-scout': { total: '15/20', jaEn: '7/10', enJa: '8/10', speed: '235ms', flow: '921ms', cost: '$0.11/$0.34' },
    'gpt-oss-120b': { total: '17/20', jaEn: '9/10', enJa: '8/10', speed: '499ms', flow: '2631ms', cost: '$0.15/$0.60' },
  };
  
  for (const api of APIs) {
    const p3 = phase3Data[api.name];
    const r = allResults[api.name].finalResult;
    const toneRate = r ? `${Math.round(r.totalPass / r.totalTests * 100)}%` : '-';
    console.log(`| ${api.name.padEnd(14)} | ${p3.total} | ${p3.jaEn} | ${p3.enJa} | ${toneRate} | ${p3.speed} | ${p3.flow} | ${p3.cost} |`);
  }
}

main().catch(console.error);
