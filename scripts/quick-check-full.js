const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

async function callAPI(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 500, temperature: 0.3 })
  });
  const data = await res.json();
  return data.choices[0].message.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

const EDIT_PROMPT = `あなたはNijiLingoの日本語編集モードです。0%は原文そのまま、50%は変更、100%はさらに強く。JSONのみ:{"edited_japanese":"..."}`;

const TRANSLATE_PROMPT = `あなたは翻訳の専門家です。日本語を英語に翻訳してください。JSONのみ:{"translation":"..."}`;

async function main() {
  const texts = [
    'その話、もう一度詳しく聞かせてもらえないかな',
    'もし時間があったら、今度一緒にどこか行かない？',
  ];
  const tones = ['casual', 'business', 'formal'];
  const levels = [0, 50, 100];

  for (const text of texts) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`【原文】${text}`);
    console.log('='.repeat(70));

    for (const tone of tones) {
      console.log(`\n## ${tone.toUpperCase()}`);
      for (const level of levels) {
        let ja = text;
        if (level > 0) {
          const r = await callAPI(EDIT_PROMPT, `元の日本語: ${text}\nトーン: ${tone}\nトーンレベル: ${level}%`);
          try { ja = JSON.parse(r).edited_japanese; } catch { ja = r; }
        }
        
        const enR = await callAPI(TRANSLATE_PROMPT, `翻訳してください（${tone}、${level}%）:\n${ja}`);
        let en = '';
        try { en = JSON.parse(enR).translation; } catch { en = enR; }
        
        console.log(`  ${level}%:`);
        console.log(`    日本語: ${ja}`);
        console.log(`    英語: ${en}`);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
}
main();
