const testTexts = [
  '最近忙しすぎて、週末は家でゴロゴロしてたいんだ',
  'その話、もう一度詳しく聞かせてもらえないかな',
  'もし時間があったら、今度一緒にどこか行かない？',
];
const tones = ['casual', 'business', 'formal'];
const levels = [0, 50, 100];

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const EDIT_PROMPT = `あなたはNijiLingoの日本語編集モードです。
与えられた日本語文を、指定されたトーンレベルに合わせて編集してください。

【最重要ルール】
- 0%: 原文をそのまま返す
- 50%: 原文から必ず変更する
- 100%: 50%よりさらに強く変える

JSONのみ返してください:
{"edited_japanese":"..."}`;

async function callAPI(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 500, temperature: 0.3 })
  });
  const data = await res.json();
  return data.choices[0].message.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

async function main() {
  for (const text of testTexts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`【原文】${text}`);
    console.log('='.repeat(60));
    
    for (const tone of tones) {
      console.log(`\n## ${tone.toUpperCase()}`);
      for (const level of levels) {
        let edited = text;
        if (level > 0) {
          const r = await callAPI(EDIT_PROMPT, `元の日本語: ${text}\nトーン: ${tone}\nトーンレベル: ${level}%`);
          try { edited = JSON.parse(r).edited_japanese; } catch { edited = r; }
        }
        console.log(`  ${level}%: ${edited}`);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
}
main();
