/**
 * 本番フロー検証スクリプト v1
 * 
 * editJapaneseForTone → translateFull の2段階フローをテスト
 */

const fs = require('fs');
const path = require('path');

// ========================================
// 設定
// ========================================

// 使用モデル
const MODELS = {
  // Groq API
  'llama-4-scout': { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'meta-llama/llama-4-scout-17b-16e-instruct', keyEnv: 'GROQ_API_KEY' },
  'gpt-oss-120b': { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', keyEnv: 'GROQ_API_KEY' },
  // OpenAI API
  'gpt-4.1-nano': { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-nano', keyEnv: 'OPENAI_API_KEY' },
};

// コマンドライン引数でモデル指定（デフォルト: llama-4-scout）
const selectedModel = process.argv[3] || 'llama-4-scout';
const modelConfig = MODELS[selectedModel] || MODELS['llama-4-scout'];
const API_URL = modelConfig.url;
const MODEL = modelConfig.model;
const API_KEY_ENV = modelConfig.keyEnv;

// Phase 4 テスト文（2025-02-01〜）
// 詳細: tests/testcases_phase4.md
const testTexts = [
  'この間話してたあの人、また来週会うんだ',
  '急に寒くなったから、風邪引かないように気をつけてね',
  'そのプロジェクト、私が担当することになったんだよね',
  '昨日のプレゼン、緊張したけどなんとか終わったよ',
  '来月から新しい仕事始めることになって、ちょっと不安なんだ',
  'あのレストラン、予約しなくても入れたの？すごいね',
  '今日の会議、部長も出るから気をつけた方がいいよ',
  'その話、もう一度詳しく聞かせてもらえないかな',
  '最近忙しすぎて、週末は家でゴロゴロしてたいんだ',
  'もし時間があったら、今度一緒にどこか行かない？',
];

const tones = ['casual', 'business', 'formal'];
const levels = [0, 50, 100];

// ========================================
// editJapaneseForTone のプロンプト
// ========================================

const JAPANESE_EDIT_SYSTEM_PROMPT = `あなたはNijiLingoの日本語編集モードです。
与えられた日本語文を、指定されたトーンレベルに合わせて編集してください。

【最重要ルール】
- 0%: 原文をそのまま返す（一切変更しない）
- 50%: 原文から必ず変更する（語尾・言い回しを変える）
- 100%: 50%よりさらに強く変える
- 0%と50%が同じ文章になるのは禁止！

【ルール】

1. 意味を変えない
   - 数字、名前、肯定/否定、質問/断定はそのまま
   - 依頼/義務/提案のクラスを変えない
   - 約束やお願いを追加しない
   - 感情の強さを変えない（OK→素晴らしい ❌）

2. 敬語の対象を間違えない
   - 人名の判断: 後ろに人の動作（寝る、来る、食べる等）が続くか
   - 敬称なし人名（太郎、花子）= 身内 → 敬語化しない
   - 敬称あり人名（田中様）= 他人 → 敬語化OK
   - 敬称を勝手に追加しない

3. 自然な日本語にする
   - 文法が正しいこと
   - 「じゃん」は確認・評価にのみ使う（未来の行動には使わない）

【トーンレベルガイド - 差を明確に！】

カジュアル:
- 0%: そのまま（変更なし）
- 50%: 「〜だね」「〜だよ」「〜してる」「〜かな？」を追加
- 100%: 「めっちゃ〜」「マジで〜」「〜よ！」「〜じゃん！」

ビジネス:
- 0%: そのまま（変更なし）
- 50%: 「〜いたします」「〜でございます」「〜いただけますか」
- 100%: 「〜申し上げます」「〜賜りますよう」「誠に〜」

フォーマル:
- 0%: そのまま（変更なし）
- 50%: 「〜させていただきます」「〜でございます」
- 100%: 「〜申し上げる所存でございます」「何卒〜」

【良い例・悪い例】
元: 「太郎が寝てからあなたの家に行く」

✅ カジュアル0%: 太郎が寝てからあなたの家に行く（そのまま）
✅ カジュアル50%: 太郎が寝てからあなたの家に行くね！（語尾変更）
✅ カジュアル100%: 太郎が寝てからお前んち行くよ！（強調+くだけた表現）

❌ 太郎様がお休みになられましたら（身内に敬語）
❌ 何卒よろしくお願いいたします（意味追加）
❌ 行くじゃん！（「じゃん」の使い方が不自然）
❌ 微妙させていただきます（文法崩壊）

JSONのみ返してください（説明不要）:
{"edited_japanese":"..."}`;

function getToneStyleForJapanese(tone, toneLevel) {
  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) return '超カジュアル（めっちゃ、マジ、〜よ！等）';
      if (toneLevel >= 50) return 'カジュアル（だね、だよ、してる等）';
      return 'やや砕けた表現';
    case 'business':
      if (toneLevel >= 100) return '最高ビジネス敬語（申し上げます、賜りますよう等）';
      if (toneLevel >= 50) return 'ビジネス敬語（いたします、ございます等）';
      return 'やや丁寧なビジネス表現';
    case 'formal':
      if (toneLevel >= 100) return '最大敬語（申し上げる所存でございます等）';
      if (toneLevel >= 50) return '丁寧敬語（させていただきます等）';
      return 'やや丁寧な表現';
    default:
      return 'そのまま';
  }
}

// ========================================
// translateFull のプロンプト
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
3. reverse_translation は意味を保持しつつ、トーン差を語尾で必ず表現する
`;

function getToneStyleInstruction(tone, toneLevel) {
  if (toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし`;
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
- 省略形（gonna, wanna, gotta）OK
- 文法より勢い重視`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- くだけた表現に
- 省略形OK（I'm, don't, can't）
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃビジネス】
- 最高レベルのビジネス敬語
- 省略形は一切使わない
- 例: "I would be most grateful if..."`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}ビジネス】
- 省略形は避ける
- 丁寧語を使う
- プロフェッショナルなトーン`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃ丁寧】
- 最上級の敬意を示す表現
- 謙譲語・尊敬語を最大限に
- 例: "I would be deeply honored..."`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}丁寧】
- 丁寧な言い回し
- 敬意あるトーン`;

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

function getReverseTranslationInstruction(toneLevel, tone) {
  const toneDescription =
    tone === 'casual' ? '友達に話すようなカジュアルな口調' :
    tone === 'business' ? 'ビジネスシーンで使う敬語' :
    tone === 'formal' ? '最上級の丁寧な敬語（ございます等）' :
    '自然な口調';

  // レベル別の具体的な指示
  let levelSpecificInstruction = '';
  if (toneLevel === 0) {
    levelSpecificInstruction = `【0%の翻訳】
- 最もシンプルで標準的な英語表現
- 省略形なし、装飾なし
- 逆翻訳は「〜です」「〜ます」で終わる`;
  } else if (toneLevel === 50) {
    levelSpecificInstruction = `【50%の翻訳 - 0%と必ず異なる表現にすること！】
- 0%より${tone === 'casual' ? '親しみやすく' : '丁寧に'}
- 英語は0%から以下のいずれかを変える（必須）:
  ・動詞を別の単語に変える
  ・助動詞を変える（will→would, can→could等）
  ・文構造を変える（平叙文→付加疑問文等）
- 逆翻訳は0%と必ず違う語尾にする:
  ${tone === 'casual' ? '0%の語尾と50%の語尾を変える（例: 〜よ→〜かな）' : tone === 'business' ? '0%より敬語レベルを上げる（例: 〜でした→〜でございました）' : '0%より敬語レベルを上げる（例: 〜ました→〜でございました）'}
- ★★★ 0%と同じ英語・同じ逆翻訳は絶対禁止！★★★`;
  } else if (toneLevel === 100) {
    levelSpecificInstruction = `【100%の翻訳 - 50%と必ず異なる表現にすること！】
- 最大限に${tone === 'casual' ? 'くだけた' : '丁寧な'}表現
- 英語: ${tone === 'casual' ? 'gonna, wanna, gotta, Yo,等を使う' : '"I would be most grateful..." "May I kindly..."等'}
- 逆翻訳: ${tone === 'casual' ? '「〜じゃん！」「めっちゃ〜」' : '「〜申し上げます」「誠に〜」'}
- ★ 50%と同じ英語は絶対禁止 ★`;
  }

  return `【逆翻訳ルール】
- ${toneDescription}で表現すること

${levelSpecificInstruction}

【絶対ルール】
- 0%, 50%, 100%は全て異なる英語表現にすること
- 0%, 50%, 100%は全て異なる逆翻訳にすること
- 同じ表現が2つあったら失格

【基本ルール】
- 疑問文は疑問文のまま（？で終わる）
- 平叙文は平叙文のまま
- 自然な日本語・英語であること`;
}

function buildTranslateSystemPrompt(tone, toneLevel) {
  const toneInstruction = getToneStyleInstruction(tone, toneLevel);
  const reverseInstruction = getReverseTranslationInstruction(toneLevel, tone);

  // トーンレベル別の英語表現パターン（一般化）
  let englishExamples = '';
  if (tone === 'casual') {
    englishExamples = `
【英語の差分パターン - casual】

差分の出し方:
- 0%→50%: 動詞を変える、助動詞を変える、構文を変える（いずれか必須）
- 50%→100%: スラング・省略形を使う（gonna, wanna, Yo等）

【逆翻訳の差分パターン - casual】
- 0%: 標準語尾（〜だよ、〜だった）
- 50%: 0%と違う語尾（〜かな、〜ね〜、〜っけ）
- 100%: めっちゃくだけた（〜じゃん！、マジで〜！）

★0%と50%で同じ英語・同じ逆翻訳は絶対禁止！★`;
  } else if (tone === 'business') {
    englishExamples = `
【英語の差分パターン - business】

差分の出し方:
- 0%→50%: 動詞を変える、助動詞を変える、より丁寧な構文に変える（いずれか必須）
- 50%→100%: 最高敬語表現を使う（I would be grateful, May I inquire等）

【逆翻訳の差分パターン - business】
- 0%: 標準敬語（〜ました、〜でした、〜ですか）
- 50%: 0%より丁寧な敬語（〜でございました、〜でしょうか、〜いたしました）
- 100%: 最高敬語（〜申し上げます、〜存じ上げます）

★0%と50%で同じ英語・同じ逆翻訳は絶対禁止！★`;
  } else if (tone === 'formal') {
    englishExamples = `
【英語の差分パターン - formal】

差分の出し方:
- 0%→50%: 動詞を変える、助動詞を変える、より丁寧な構文に変える（いずれか必須）
- 50%→100%: 最上級敬語表現を使う（I would be deeply honored, May I humbly等）

【逆翻訳の差分パターン - formal】
- 0%: 標準敬語（〜でした、〜ですか、〜ました）
- 50%: 0%より丁寧な敬語（〜でございました、〜でしょうか、〜いたしました）
- 100%: 最上級敬語（〜申し上げます、〜存じ上げます、〜賜りたく存じます）

★0%と50%で同じ英語・同じ逆翻訳は絶対禁止！★`;
  }

  return `あなたは日本語から英語への翻訳の専門家です。
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

【最重要ルール - 差分必須】
- 0%, 50%, 100%は必ず異なる英語表現にする
- 同じ英語を返すのは絶対禁止
- 語彙・文構造・丁寧度を変えてトーン差を出す
${englishExamples}

【翻訳スタイル指示】
${toneInstruction}

${reverseInstruction}

必ず以下のJSON形式で出力してください（短く簡潔に）：
{
  "translation": "英語のみ",
  "reverse_translation": "日本語のみ",
  "risk": "low"
}`;
}

// ========================================
// API呼び出し
// ========================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callAPI(systemPrompt, userPrompt) {
  const key = process.env[API_KEY_ENV];
  if (!key) throw new Error(`Missing ${API_KEY_ENV}`);

  const start = Date.now();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1200,
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
// 本番フロー実行
// ========================================

async function editJapaneseForTone(sourceText, tone, toneLevel) {
  if (toneLevel === 0) {
    return { edited_japanese: sourceText, time: 0 };
  }

  const toneStyle = getToneStyleForJapanese(tone, toneLevel);
  const userPrompt = `元の日本語: ${sourceText}

トーン: ${tone}
トーンレベル: ${toneLevel}%
目標スタイル: ${toneStyle}

この日本語を${toneLevel}%の${tone}トーンに編集してください。JSONのみ返してください。`;

  const { result, time } = await callAPI(JAPANESE_EDIT_SYSTEM_PROMPT, userPrompt);
  return { edited_japanese: result.edited_japanese || sourceText, time };
}

async function translateFull(sourceText, tone, toneLevel) {
  const systemPrompt = buildTranslateSystemPrompt(tone, toneLevel);
  const userPrompt = `以下のテキストを翻訳してください（${tone}スタイル、強度${toneLevel}%）：

${sourceText}`;

  return await callAPI(systemPrompt, userPrompt);
}

async function runProductionFlow(sourceText, tone, toneLevel) {
  // Step 1: 日本語編集
  const editResult = await editJapaneseForTone(sourceText, tone, toneLevel);
  const editedJapanese = editResult.edited_japanese;

  // Step 2: 翻訳
  const { result, time } = await translateFull(editedJapanese, tone, toneLevel);

  return {
    original: sourceText,
    edited_japanese: editedJapanese,
    translation: result.translation || '',
    reverse_translation: editedJapanese,  // 逆翻訳 = editJapaneseForTone の出力
    risk: result.risk || 'unknown',
    totalTime: editResult.time + time
  };
}

// ========================================
// 評価
// ========================================

function evaluateResults(outputs) {
  // トーン差チェック
  const translations = outputs.map(o => o.translation.trim().toLowerCase());
  const reverses = outputs.map(o => o.reverse_translation.trim());

  const uniqueTranslations = new Set(translations).size;
  const uniqueReverses = new Set(reverses).size;

  const toneDiffPass = uniqueTranslations === 3 && uniqueReverses === 3;

  // 日本語品質チェック（簡易）
  const japaneseIssues = [];
  for (const o of outputs) {
    const ja = o.reverse_translation;
    if (/ですねね|ますねね|ございますございます/.test(ja)) {
      japaneseIssues.push(`二重語尾: ${ja}`);
    }
    if (/させていただきますさせていただきます/.test(ja)) {
      japaneseIssues.push(`重複敬語: ${ja}`);
    }
  }
  const japanesePass = japaneseIssues.length === 0;

  // 英語品質チェック（簡易）
  const englishIssues = [];
  for (const o of outputs) {
    const en = o.translation;
    if (/[ぁ-んァ-ン一-龯]/.test(en)) {
      englishIssues.push(`日本語混入: ${en}`);
    }
  }
  const englishPass = englishIssues.length === 0;

  return {
    pass: toneDiffPass && japanesePass && englishPass,
    toneDiffPass,
    japanesePass,
    englishPass,
    japaneseIssues,
    englishIssues,
    uniqueTranslations,
    uniqueReverses
  };
}

// ========================================
// メイン
// ========================================

async function runTest() {
  const roundNum = process.argv[2] || '1';
  const modelName = process.argv[3] || 'llama-4-scout';

  console.log(`🚀 本番フロー検証 Round ${roundNum}`);
  console.log(`📦 モデル: ${modelName} (${MODEL})`);
  console.log(`🔑 APIキー: ${API_KEY_ENV}\n`);

  if (!process.env[API_KEY_ENV]) {
    console.error(`❌ ${API_KEY_ENV} が設定されていません`);
    process.exit(1);
  }

  const results = {
    round: roundNum,
    model: modelName,
    tones: {},
    totalPass: 0,
    totalTests: 0,
    totalTime: 0,
    times: [],
    details: []
  };

  for (const tone of tones) {
    results.tones[tone] = { pass: 0, total: 0, failures: [] };
    console.log(`\n📝 Tone: ${tone}`);

    for (const text of testTexts) {
      const outputs = [];

      for (const level of levels) {
        try {
          const output = await runProductionFlow(text, tone, level);
          outputs.push({ level, ...output });
          process.stdout.write('.');
          await delay(500);
        } catch (e) {
          outputs.push({
            level,
            original: text,
            edited_japanese: 'ERROR',
            translation: 'ERROR',
            reverse_translation: `ERROR: ${e.message}`,
            risk: 'high',
            totalTime: 0
          });
          process.stdout.write('x');
          await delay(1000);
        }
      }

      const evaluation = evaluateResults(outputs);
      results.tones[tone].total++;
      results.totalTests++;

      // API速度記録
      const testTime = outputs.reduce((sum, o) => sum + (o.totalTime || 0), 0);
      results.totalTime += testTime;
      results.times.push(testTime);

      const detail = { tone, text, outputs, evaluation, time: testTime };
      results.details.push(detail);

      if (evaluation.pass) {
        results.tones[tone].pass++;
        results.totalPass++;
      } else {
        results.tones[tone].failures.push({ text, outputs, evaluation });
      }
    }
    console.log('');
  }

  // API速度計算
  const avgTime = results.times.length > 0 ? Math.round(results.totalTime / results.times.length) : 0;
  const minTime = results.times.length > 0 ? Math.min(...results.times) : 0;
  const maxTime = results.times.length > 0 ? Math.max(...results.times) : 0;

  // 結果出力
  console.log(`\n📊 Results:`);
  console.log(`   Total: ${results.totalPass}/${results.totalTests}`);
  for (const tone of tones) {
    console.log(`   ${tone}: ${results.tones[tone].pass}/${results.tones[tone].total}`);
  }
  console.log(`\n⏱️ API速度:`);
  console.log(`   平均: ${avgTime}ms`);
  console.log(`   最速: ${minTime}ms`);
  console.log(`   最遅: ${maxTime}ms`);

  // 結果にAPI速度を追加
  results.avgTime = avgTime;
  results.minTime = minTime;
  results.maxTime = maxTime;

  // Markdown生成
  const md = generateMarkdown(results, roundNum);
  const outDir = path.join(__dirname, '..', 'tests', 'results', 'phase2-production');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const filename = `round${roundNum}_${results.model}.md`;
  fs.writeFileSync(path.join(outDir, filename), md);
  console.log(`\n📄 Saved: tests/results/phase2-production/${filename}`);

  console.log('\n✅ 完了！');
}

function generateMarkdown(results, roundNum) {
  const date = new Date().toISOString().split('T')[0];
  const modelName = results.model || 'unknown';

  let md = `# Round ${roundNum} 検証結果（本番フロー）

> 日付: ${date}
> フロー: editJapaneseForTone → translateFull
> モデル: ${modelName} (${MODEL})

---

## 📊 サマリー

| トーン | スコア | 詳細 |
|--------|--------|------|
| casual | ${results.tones.casual.pass}/${results.tones.casual.total} | ${results.tones.casual.pass === results.tones.casual.total ? '✅' : '❌'} |
| business | ${results.tones.business.pass}/${results.tones.business.total} | ${results.tones.business.pass === results.tones.business.total ? '✅' : '❌'} |
| formal | ${results.tones.formal.pass}/${results.tones.formal.total} | ${results.tones.formal.pass === results.tones.formal.total ? '✅' : '❌'} |
| **合計** | **${results.totalPass}/${results.totalTests}** | |

## ⏱️ API速度

| 指標 | 時間 |
|------|------|
| 平均 | ${results.avgTime || 0}ms |
| 最速 | ${results.minTime || 0}ms |
| 最遅 | ${results.maxTime || 0}ms |

---

## ❌ 失敗パターン

`;

  for (const tone of tones) {
    if (results.tones[tone].failures.length > 0) {
      md += `### ${tone}\n\n`;
      for (const f of results.tones[tone].failures) {
        md += `**「${f.text}」**\n`;
        md += `- 不合格理由: `;
        if (!f.evaluation.toneDiffPass) md += `トーン差不足(英語${f.evaluation.uniqueTranslations}/3, 逆翻訳${f.evaluation.uniqueReverses}/3) `;
        if (!f.evaluation.japanesePass) md += `日本語品質(${f.evaluation.japaneseIssues.join(', ')}) `;
        if (!f.evaluation.englishPass) md += `英語品質(${f.evaluation.englishIssues.join(', ')}) `;
        md += '\n\n';

        md += `| Level | 編集後日本語 | 英語 | 逆翻訳 |\n`;
        md += `|-------|--------------|------|--------|\n`;
        for (const o of f.outputs) {
          md += `| ${o.level}% | ${o.edited_japanese.substring(0, 25)} | ${o.translation.substring(0, 30)} | ${o.reverse_translation.substring(0, 25)} |\n`;
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
    if (d.evaluation.pass) {
      md += `**「${d.text}」** (${d.tone}) ✅\n`;
    }
  }

  return md;
}

runTest().catch(console.error);
