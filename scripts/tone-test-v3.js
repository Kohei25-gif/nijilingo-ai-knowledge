/**
 * トーン差検証スクリプト v3
 * 
 * Round 2-5用：プロンプト改善版
 * 
 * 使い方: 
 *   export $(cat ~/Library/Mobile\ Documents/com~apple~CloudDocs/Desktop/NijiLingo/.env.local | grep GROQ_API_KEY)
 *   node tone-test-v3.js [round_number]
 */

// ========================================
// 改善版プロンプト（シュワちゃん改善案ベース）
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
8. stance_strength - 同意や感情の強さを勝手に変えない
`;

const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない
2. cool/sick/dude/huh など評価軸を変える語は禁止
3. reverse_translation は意味を保持しつつ、トーン差を語尾・強調語で必ず表現する
4. 服の一般語は clothes/outfit を使う。"dress" は禁止
`;

// ========================================
// 【改善点1】トーン指示をより具体的に
// ========================================

function getToneStyleInstruction(tone, toneLevel) {
  if (toneLevel < 25) {
    return `【トーンレベル: 0% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし
- 逆翻訳は標準的な表現（〜です、〜ます）`;
  }

  if (!tone) {
    return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 超カジュアル】
■ 英語の特徴:
- 省略形を積極的に使用（gonna, wanna, gotta, ya）
- スラング OK（lit, dope, sick）
- 文法より勢い重視

■ 逆翻訳の語尾【必須】:
- 「〜じゃん！」「〜っしょ！」「〜だよね！」
- 「マジで〜」「超〜」「めっちゃ〜」
- 感嘆符を多用`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - カジュアル】
■ 英語の特徴:
- 省略形OK（I'm, don't, can't, it's）
- 親しみやすいトーン
- 0%とは必ず異なる表現にする

■ 逆翻訳の語尾【必須】:
- 「〜だね」「〜かな」「〜よ」
- 「〜してくれる？」「〜かも」
- 0%の「〜です」とは必ず変える`;
      }
      return `【トーンレベル: 25% - 少しカジュアル】
- 軽くくだけた表現
- 逆翻訳は「〜だよ」「〜ね」`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 最上級ビジネス】
■ 英語の特徴【必須要素を全て含む】:
- "I would be most grateful if..."
- "at your earliest convenience"
- "I sincerely appreciate..."
- 省略形は一切使わない

■ 逆翻訳の語尾【必須】:
- 「〜いただけますでしょうか」
- 「〜していただければ幸いです」
- 「誠に〜」「大変〜」`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - 標準ビジネス】
■ 英語の特徴:
- "Could you please..."
- "I would like to..."
- 省略形は避ける
- 0%とは必ず異なる表現にする

■ 逆翻訳の語尾【必須】:
- 「〜いただけますか」「〜でしょうか」
- 「〜させていただきます」
- 0%の「〜です」とは必ず変える`;
      }
      return `【トーンレベル: 25% - 軽めビジネス】
- シンプルな丁寧表現
- 逆翻訳は「〜です」「〜ます」`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - 最上級フォーマル】
■ 英語の特徴【必須要素を全て含む】:
- "I would be deeply honored..."
- "It would be my utmost pleasure..."
- "I humbly request..."
- "kindly" / "so kind as to"

■ 逆翻訳の語尾【必須】:
- 「〜いただけますでしょうか」
- 「〜申し上げます」「〜存じます」
- 「誠に恐れ入りますが」`;
      } else if (toneLevel >= 50) {
        return `【トーンレベル: 50% - 標準フォーマル】
■ 英語の特徴:
- "Would you mind..."
- "I would appreciate..."
- 0%とは必ず異なる表現にする

■ 逆翻訳の語尾【必須】:
- 「〜いただけますか」「〜でございます」
- 0%の「〜です」とは必ず変える`;
      }
      return `【トーンレベル: 25% - 軽めフォーマル】
- 基本的な丁寧表現
- 逆翻訳は「〜です」「〜ます」`;

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

// ========================================
// 【改善点2】逆翻訳ルールを具体化
// ========================================

function getReverseTranslationInstruction(sourceLang, toneLevel, tone) {
  const toneDesc = tone ? `${tone}トーン` : 'ニュートラル';
  
  let specificRule = '';
  if (tone === 'casual') {
    if (toneLevel >= 100) {
      specificRule = `
■ casual 100% の逆翻訳例:
- 「いいね」→「めっちゃいいじゃん！」
- 「聞きたい」→「聞きたいんだけどさ〜」
- 「お願い」→「頼むよ〜」「やってくんない？」`;
    } else if (toneLevel >= 50) {
      specificRule = `
■ casual 50% の逆翻訳例:
- 「いいね」→「いいね〜」
- 「聞きたい」→「聞きたいんだけど」
- 「お願い」→「お願いできる？」`;
    }
  } else if (tone === 'business') {
    if (toneLevel >= 100) {
      specificRule = `
■ business 100% の逆翻訳例:
- 「いいね」→「大変素晴らしいと存じます」
- 「聞きたい」→「お伺いしたいことがございます」
- 「お願い」→「お願い申し上げます」`;
    } else if (toneLevel >= 50) {
      specificRule = `
■ business 50% の逆翻訳例:
- 「いいね」→「よろしいかと思います」
- 「聞きたい」→「お聞きしたいのですが」
- 「お願い」→「お願いできますでしょうか」`;
    }
  } else if (tone === 'formal') {
    if (toneLevel >= 100) {
      specificRule = `
■ formal 100% の逆翻訳例:
- 「いいね」→「誠に素晴らしゅうございます」
- 「聞きたい」→「恐れ入りますがお伺いしてもよろしゅうございますか」
- 「お願い」→「何卒お願い申し上げます」`;
    } else if (toneLevel >= 50) {
      specificRule = `
■ formal 50% の逆翻訳例:
- 「いいね」→「よろしいですね」
- 「聞きたい」→「お聞きしてもよろしいでしょうか」
- 「お願い」→「お願いできますでしょうか」`;
    }
  }

  return `
【逆翻訳ルール - 最重要】
- ${toneDesc}で表現すること
- レベル${toneLevel}%: 0%が最も控えめ、100%が最も強い表現

【絶対条件：0%, 50%, 100%は全て異なる表現にすること】
- 英語（translation）: 各レベルで必ず異なる単語・フレーズを使う
- 逆翻訳（reverse_translation）: 各レベルで必ず異なる語尾・表現を使う
- 同じ表現を返すのは禁止
${specificRule}

【基本ルール】
- 疑問文は疑問文のまま
- 平叙文は平叙文のまま
- 自然な${sourceLang}であること`;
}

// ========================================
// 【改善点3】Few-shot例示を追加
// ========================================

const FEW_SHOT_EXAMPLES = `
【重要：トーンレベル別の翻訳例 - 必ず参考にすること】

例1「この書類を確認して」:
┌─────────┬────────────────────────────────────────┬──────────────────────────┐
│ トーン  │ 英語                                   │ 逆翻訳                   │
├─────────┼────────────────────────────────────────┼──────────────────────────┤
│casual 0%│ Please check this document.            │ この書類を確認して。     │
│casual 50%│ Hey, can you check this out?          │ これ見てくれる？         │
│casual100%│ Yo, take a look at this real quick!   │ ちょっとこれ見てよ！     │
├─────────┼────────────────────────────────────────┼──────────────────────────┤
│biz 0%   │ Please check this document.            │ この書類を確認してください。│
│biz 50%  │ Could you please review this document? │ こちらをご確認いただけますか。│
│biz 100% │ I would be most grateful if you could  │ ご確認いただけますと     │
│         │ kindly review this document.           │ 大変ありがたく存じます。 │
├─────────┼────────────────────────────────────────┼──────────────────────────┤
│formal 0%│ Please check this document.            │ この書類をご確認ください。│
│formal50%│ Would you mind reviewing this document?│ ご確認いただけますでしょうか。│
│formal100│ I would be deeply honored if you would │ 恐れ入りますが、ご査収   │
│         │ be so kind as to review this document. │ 賜りますようお願い申し上げます。│
└─────────┴────────────────────────────────────────┴──────────────────────────┘

※ 0%と50%と100%は必ず全て異なる表現になっていることに注目！
`;

// ========================================
// API設定
// ========================================

const APIs = [
  { name: 'llama-4-scout', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  { name: 'gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
];

// テスト文（10個）
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
// システムプロンプト生成（改善版）
// ========================================

function buildSystemPrompt(tone, toneLevel) {
  const toneInstruction = getToneStyleInstruction(tone, toneLevel);
  const reverseInstruction = getReverseTranslationInstruction('日本語', toneLevel, tone);
  
  return `あなたは日本語から英語への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}
${FEW_SHOT_EXAMPLES}

【絶対ルール - translation フィールド】
- "translation" は 英語 のみで出力すること
- 日本語の文字は絶対に混ぜない

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseInstruction}

必ず以下のJSON形式で出力してください：
{
  "translation": "英語のみの翻訳",
  "reverse_translation": "日本語のみの逆翻訳（トーン反映必須）",
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
          await delay(300);
        } catch (e) {
          outputs.push({ level, translation: `ERROR`, reverseJa: `ERROR: ${e.message}` });
          process.stdout.write('x');
          await delay(1000);
        }
      }
      
      results.totalTime += flowTime;
      
      // トーン差判定
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

// ========================================
// メイン
// ========================================

async function main() {
  const roundNum = process.argv[2] || '2';
  const promptVersion = 'v3 (Few-shot + 語尾ルール具体化)';
  
  console.log(`🚀 NijiLingo トーン差検証 Round ${roundNum}\n`);
  console.log(`プロンプト: ${promptVersion}`);
  console.log('テスト文: 10個');
  console.log('トーン: casual, business, formal\n');
  
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
