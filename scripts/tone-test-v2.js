/**
 * トーン差検証スクリプト v2
 * 
 * 目的: 10個のテスト文で3トーン×3レベルの検証
 * 
 * 使い方: 
 *   source ~/Library/Mobile\ Documents/com~apple~CloudDocs/Desktop/NijiLingo/.env.local
 *   node tone-test-v2.js
 * 
 * または:
 *   GROQ_API_KEY=xxx node tone-test-v2.js
 */

// ========================================
// プロンプト（現在のアプリから）
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
1. トーンは口調のみ変更し、評価軸は変えない
2. cool/sick/dude/huh など評価軸を変える語は禁止
3. reverse_translation は意味を保持しつつ、トーン差を語尾・強調語で必ず表現する
4. 服の一般語は clothes/outfit を使う。"dress" は禁止
`;

// getToneStyleInstruction（アプリからコピー）
function getToneStyleInstruction(tone, toneLevel) {
  if (toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし`;
  }

  if (!tone) {
    return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 省略形を積極的に使用（gonna, wanna, gotta）
- 文法より勢い重視`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: ${toneLevel}% - カジュアル】
- くだけた表現に
- 省略形OK（I'm, don't, can't）
- 親しみやすいトーン`;
      }
      return `【トーンレベル: ${toneLevel}% - 多少カジュアル】
- 軽くくだけた表現に
- 省略形OK
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
- 例: "I would be deeply honored...", "Your esteemed presence...", "I humbly request..."
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

function getReverseTranslationInstruction(sourceLang, toneLevel, tone) {
  const toneDesc = tone ? `${tone}トーン` : 'ニュートラル';
  return `
【逆翻訳ルール】
- ${toneDesc}で表現すること
- レベル${toneLevel}%: 0%が最も控えめ、100%が最も強い表現

【最重要：全レベル異なる表現にすること】
0%, 50%, 100%は必ず全て異なる表現にすること。
- 英語（translation）も各レベルで必ず変える
- 逆翻訳（reverse_translation）も各レベルで必ず変える

【基本ルール】
- 疑問文は疑問文のまま（？で終わる）
- 平叙文は平叙文のまま
- 自然な${sourceLang}であること`;
}

// ========================================
// API設定
// ========================================

const APIs = [
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
];

// ========================================
// テスト文（10個）
// ========================================

const testTexts = [
  'これ、いいね',
  'ちょっと聞きたいんだけど',
  'また今度ね',
  'それ、どういう意味？',
  'お願いできる？',
  'まあ、いいか',
  '来週都合どう？',
  'そうなんだ',
  'それ、本当？',
  'またよろしく',
];

const tones = ['casual', 'business', 'formal'];
const levels = [0, 50, 100];

// ユーティリティ
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================
// API呼び出し
// ========================================

async function callAPI(api, systemPrompt, userPrompt) {
  const key = process.env[api.keyEnv];
  if (!key) throw new Error(`Missing ${api.keyEnv}. Set it with: export GROQ_API_KEY=your_key`);
  
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
// システムプロンプト生成
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
  console.log(`\n🧪 Testing: ${api.name}\n`);
  
  const results = {
    apiName: api.name,
    tones: {},
    totalPass: 0,
    totalTests: 0,
    totalTime: 0,
    details: []
  };
  
  for (const tone of tones) {
    results.tones[tone] = { pass: 0, total: 0, failures: [] };
    console.log(`  📝 Tone: ${tone}`);
    
    for (const text of testTexts) {
      const outputs = [];
      let flowTime = 0;
      
      for (const level of levels) {
        const systemPrompt = buildSystemPrompt(tone, level);
        const userPrompt = `以下のテキストを翻訳してください（${tone}スタイル、強度${level}%）：\n\n${text}`;
        
        try {
          const { result, time } = await callAPI(api, systemPrompt, userPrompt);
          flowTime += time;
          outputs.push({ 
            level, 
            translation: result.translation || '', 
            reverseJa: result.reverse_translation || result.raw || ''
          });
          process.stdout.write('.');
          await delay(300); // レート制限対策
        } catch (e) {
          outputs.push({ level, translation: `ERROR`, reverseJa: `ERROR: ${e.message}` });
          process.stdout.write('x');
          await delay(1000);
        }
      }
      
      results.totalTime += flowTime;
      
      // トーン差判定: 3つ全部違うか（逆翻訳で判定）
      const reverseTexts = outputs.map(o => o.reverseJa.trim());
      const uniqueReverse = new Set(reverseTexts).size;
      const pass = uniqueReverse === 3;
      
      results.tones[tone].total++;
      results.totalTests++;
      
      const detail = { tone, text, outputs, pass };
      results.details.push(detail);
      
      if (pass) {
        results.tones[tone].pass++;
        results.totalPass++;
      } else {
        results.tones[tone].failures.push({ text, outputs });
      }
    }
    console.log('');
  }
  
  return results;
}

// ========================================
// マークダウン出力
// ========================================

function generateMarkdown(results, roundNum) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# Round ${roundNum} 検証結果

> 日付: ${date}
> API: ${results.apiName}

---

## 📊 サマリー

| トーン | スコア | 詳細 |
|--------|--------|------|
| casual | ${results.tones.casual.pass}/${results.tones.casual.total} | ${results.tones.casual.pass === results.tones.casual.total ? '✅' : '❌'} |
| business | ${results.tones.business.pass}/${results.tones.business.total} | ${results.tones.business.pass === results.tones.business.total ? '✅' : '❌'} |
| formal | ${results.tones.formal.pass}/${results.tones.formal.total} | ${results.tones.formal.pass === results.tones.formal.total ? '✅' : '❌'} |
| **合計** | **${results.totalPass}/${results.totalTests}** | |

平均レスポンス時間: ${Math.round(results.totalTime / results.totalTests)}ms

---

## ❌ 失敗パターン

`;

  for (const tone of tones) {
    if (results.tones[tone].failures.length > 0) {
      md += `### ${tone}\n\n`;
      for (const f of results.tones[tone].failures) {
        md += `**「${f.text}」**\n`;
        md += `| Level | 英語 | 逆翻訳 |\n`;
        md += `|-------|------|--------|\n`;
        for (const o of f.outputs) {
          md += `| ${o.level}% | ${o.translation.substring(0, 40)} | ${o.reverseJa.substring(0, 40)} |\n`;
        }
        md += '\n';
      }
    }
  }

  md += `---

## ✅ 成功パターン

`;

  for (const d of results.details) {
    if (d.pass) {
      md += `**「${d.text}」** (${d.tone}) ✅\n`;
    }
  }

  md += `

---

## 📝 次の改善ポイント

（ここに手動で記入）

`;

  return md;
}

// ========================================
// メイン
// ========================================

async function main() {
  console.log('🚀 NijiLingo トーン差検証 v2\n');
  console.log('テスト文: 10個');
  console.log('トーン: casual, business, formal');
  console.log('レベル: 0%, 50%, 100%\n');
  
  // APIキー確認
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY が設定されていません');
    console.error('以下のコマンドで設定してください:');
    console.error('  export GROQ_API_KEY=your_api_key');
    console.error('または:');
    console.error('  source ~/Library/Mobile\\ Documents/com~apple~CloudDocs/Desktop/NijiLingo/.env.local');
    process.exit(1);
  }
  
  const roundNum = process.argv[2] || '1';
  
  for (const api of APIs) {
    try {
      const results = await runTest(api);
      
      // 結果表示
      console.log(`\n📊 Results for ${api.name}:`);
      console.log(`   Total: ${results.totalPass}/${results.totalTests}`);
      for (const tone of tones) {
        console.log(`   ${tone}: ${results.tones[tone].pass}/${results.tones[tone].total}`);
      }
      
      // マークダウン生成
      const md = generateMarkdown(results, roundNum);
      const filename = `round${roundNum}_${api.name.replace(/-/g, '_')}.md`;
      const fs = require('fs');
      const path = require('path');
      const outDir = path.join(__dirname, '..', 'tests', 'results', 'phase1');
      
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(outDir, filename), md);
      console.log(`   📄 Saved: tests/results/phase1/${filename}`);
      
    } catch (e) {
      console.error(`❌ Error testing ${api.name}: ${e.message}`);
    }
  }
  
  console.log('\n✅ 完了！');
}

main().catch(console.error);
