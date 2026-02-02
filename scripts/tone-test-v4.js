/**
 * トーン差検証スクリプト v4
 * 
 * Round 3-5用：casualとbusiness/formalをさらに改善
 * 
 * 改善点:
 * - casualの0%/50%の差をより明確に
 * - business/formalの0%/50%の差を強調
 */

// ========================================
// 改善版プロンプト v4
// ========================================

const INVARIANT_RULES = `
【不変条件 - 翻訳時に絶対守ること】
1. entities - 数字、日付、時刻、金額、固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. modality_class - 依頼/義務/提案のクラスを変えない
4. question/statement - 質問/断定を変えない
`;

const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない
2. reverse_translation は意味を保持しつつ、トーン差を語尾で必ず表現する
`;

// ========================================
// 【改善】トーン指示 v4
// ========================================

function getToneStyleInstruction(tone, toneLevel) {
  if (toneLevel === 0) {
    return `【トーンレベル: 0% - ニュートラル】
■ 英語: 最もシンプルで標準的な表現
- 省略形なし、装飾なし
- 例: "Please check." / "I see." / "Is that true?"

■ 逆翻訳の語尾【必須】:
- 「〜です」「〜ます」「〜ですか？」
- 最も標準的な敬体`;
  }

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 超カジュアル】
■ 英語【必須要素】:
- gonna, wanna, gotta, ya を使う
- "Yo," "Hey," で始める
- "right?" "huh?" で終わる

■ 逆翻訳の語尾【必須】:
- 「〜じゃん！」「〜っしょ！」「〜だよね！」
- 「マジで〜」「超〜」「めっちゃ〜」
- 0%/50%とは完全に異なる語尾にすること`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - カジュアル】
■ 英語【必須】:
- 省略形を使う（I'm, don't, can't, it's）
- 0%より親しみやすく、100%よりは控えめ

■ 逆翻訳の語尾【必須】:
- 「〜だね」「〜かな？」「〜よ」「〜ね〜」
- 「〜してくれる？」
- 0%の「〜です」から必ず変える
- 100%の「〜じゃん」ほど崩さない`;
      }
      break;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 最上級ビジネス】
■ 英語【必須要素を全て含む】:
- "I would be most grateful if..."
- "at your earliest convenience"
- "I sincerely appreciate..."

■ 逆翻訳の語尾【必須】:
- 「〜いただけますでしょうか」
- 「〜していただければ幸いでございます」
- 「誠に〜」「大変〜」「何卒〜」`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - 標準ビジネス】
■ 英語【必須】:
- "Could you please..." / "I would like to..."
- 省略形は避ける
- 0%より丁寧、100%より控えめ

■ 逆翻訳の語尾【必須】:
- 「〜いただけますか」「〜でしょうか」
- 「〜させていただきます」
- 0%の「〜です」から必ず変える
- 100%の「〜でございます」ほど堅くしない`;
      }
      break;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 最上級フォーマル】
■ 英語【必須要素を全て含む】:
- "I would be deeply honored..."
- "It would be my utmost pleasure..."
- "kindly" / "so kind as to"

■ 逆翻訳の語尾【必須】:
- 「〜いただけますでしょうか」
- 「〜申し上げます」「〜存じます」
- 「恐れ入りますが〜」「何卒〜」`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - 標準フォーマル】
■ 英語【必須】:
- "Would you mind..." / "I would appreciate..."
- 0%より丁寧、100%より控えめ

■ 逆翻訳の語尾【必須】:
- 「〜いただけますか」「〜でございます」
- 0%の「〜です」から必ず変える
- 100%の「〜申し上げます」ほど堅くしない`;
      }
      break;
  }

  return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
}

// ========================================
// 逆翻訳ルール v4
// ========================================

function getReverseTranslationInstruction(sourceLang, toneLevel, tone) {
  return `
【逆翻訳の絶対ルール】
0%, 50%, 100%は必ず全て異なる語尾・表現にすること。同じ語尾は禁止。

【語尾の差分ガイド】
┌─────────┬─────────────────┬─────────────────┬─────────────────┐
│ トーン  │ 0%              │ 50%             │ 100%            │
├─────────┼─────────────────┼─────────────────┼─────────────────┤
│ casual  │ 〜です/〜ます   │ 〜だね/〜かな   │ 〜じゃん/〜っしょ │
│ business│ 〜です/〜ます   │ 〜いただけますか│ 〜いただけますでしょうか │
│ formal  │ 〜です/〜ます   │ 〜でございます  │ 〜申し上げます   │
└─────────┴─────────────────┴─────────────────┴─────────────────┘

現在のレベル: ${tone} ${toneLevel}%
→ 上の表の該当セルの語尾を使うこと`;
}

// ========================================
// Few-shot例示 v4（より明確に差を示す）
// ========================================

const FEW_SHOT_EXAMPLES = `
【必読：トーンレベル別の翻訳例】

■ 例「いいね」の翻訳:
| レベル | 英語 | 逆翻訳 |
|--------|------|--------|
| casual 0% | That's good. | いいですね。 |
| casual 50% | That's nice! | いいね〜 |
| casual 100% | Yo, that's sick! | めっちゃいいじゃん！ |
| biz 0% | That is good. | よろしいです。 |
| biz 50% | That looks good. | よろしいかと思います。 |
| biz 100% | I find this excellent. | 大変素晴らしいと存じます。 |
| formal 0% | That is good. | よろしいです。 |
| formal 50% | That is quite good. | よろしゅうございます。 |
| formal 100% | This is most excellent. | 誠に素晴らしゅうございます。 |

※ 各レベルで逆翻訳の語尾が全て異なることに注目！
`;

// ========================================
// API設定
// ========================================

const APIs = [
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
];

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

function buildSystemPrompt(tone, toneLevel) {
  const toneInstruction = getToneStyleInstruction(tone, toneLevel);
  const reverseInstruction = getReverseTranslationInstruction('日本語', toneLevel, tone);
  
  return `あなたは日本語から英語への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}
${FEW_SHOT_EXAMPLES}

【絶対ルール - translation フィールド】
- "translation" は 英語 のみで出力
- 日本語は絶対に混ぜない

【翻訳スタイル指示】
${toneInstruction}
${reverseInstruction}

JSON形式で出力：
{
  "translation": "英語のみ",
  "reverse_translation": "日本語のみ（トーン語尾必須）",
  "risk": "low|med|high"
}`;
}

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
        const userPrompt = `翻訳してください（${tone} ${level}%）：\n\n${text}`;
        
        try {
          const { result, time } = await callAPI(api, systemPrompt, userPrompt);
          flowTime += time;
          outputs.push({ 
            level, 
            translation: result.translation || '', 
            reverseJa: result.reverse_translation || result.raw || ''
          });
          process.stdout.write('.');
          await delay(300);
        } catch (e) {
          outputs.push({ level, translation: `ERROR`, reverseJa: `ERROR: ${e.message}` });
          process.stdout.write('x');
          await delay(1000);
        }
      }
      
      results.totalTime += flowTime;
      
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

function generateMarkdown(results, roundNum, promptVersion) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# Round ${roundNum} 検証結果

> 日付: ${date}
> API: ${results.apiName}
> プロンプト: ${promptVersion}

---

## 📊 サマリー

| トーン | スコア | 詳細 |
|--------|--------|------|
| casual | ${results.tones.casual.pass}/${results.tones.casual.total} | ${results.tones.casual.pass === results.tones.casual.total ? '✅' : '❌'} |
| business | ${results.tones.business.pass}/${results.tones.business.total} | ${results.tones.business.pass === results.tones.business.total ? '✅' : '❌'} |
| formal | ${results.tones.formal.pass}/${results.tones.formal.total} | ${results.tones.formal.pass === results.tones.formal.total ? '✅' : '❌'} |
| **合計** | **${results.totalPass}/${results.totalTests}** | |

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

  if (results.totalPass === results.totalTests) {
    md += `\n**🎉 全パターン成功！**\n`;
  }

  md += `
---

## ✅ 成功パターン

`;

  for (const d of results.details) {
    if (d.pass) {
      md += `**「${d.text}」** (${d.tone}) ✅\n`;
    }
  }

  return md;
}

async function main() {
  const roundNum = process.argv[2] || '3';
  const promptVersion = 'v4 (語尾ガイド表 + 差分強調)';
  
  console.log(`🚀 NijiLingo トーン差検証 Round ${roundNum}\n`);
  console.log(`プロンプト: ${promptVersion}\n`);
  
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY が設定されていません');
    process.exit(1);
  }
  
  for (const api of APIs) {
    try {
      const results = await runTest(api);
      
      console.log(`\n📊 Results for ${api.name}:`);
      console.log(`   Total: ${results.totalPass}/${results.totalTests}`);
      for (const tone of tones) {
        console.log(`   ${tone}: ${results.tones[tone].pass}/${results.tones[tone].total}`);
      }
      
      const md = generateMarkdown(results, roundNum, promptVersion);
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
