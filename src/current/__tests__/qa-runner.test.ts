/**
 * QA統合テストランナー
 * - Groq/OpenAI APIを直接叩いて extractStructure → translateFull → auto_checks検証
 * - GROQ_API_KEY未設定時はスキップ
 * - 結果をJSON出力
 */
import { describe, it, expect, beforeAll } from 'vitest';
import testCases from './qa-test-cases.json';

// ============================
// API直接呼び出しヘルパー
// ============================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_FULL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const MODEL_NANO = 'gpt-4.1-nano';

async function callAPI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3
): Promise<string> {
  const isOpenAI = model.startsWith('gpt-');
  const url = isOpenAI ? OPENAI_URL : GROQ_URL;
  const key = isOpenAI ? OPENAI_API_KEY : GROQ_API_KEY;

  if (!key) throw new Error(`API key not set for model: ${model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseJSON<T>(text: string): T {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  return JSON.parse(cleaned);
}

// ============================
// プロンプト（services/prompts.tsから必要部分を参照）
// ============================

// 動的importでプロンプトを取得（ビルド済みモジュールを直接参照）
let EXPANDED_STRUCTURE_PROMPT: string;
let INVARIANT_RULES: string;
let TONE_AND_EVALUATION_RULES: string;
let getLanguageSpecificRules: (lang: string) => string;
let getToneInstruction: (options: Record<string, unknown>) => string;
let getReverseTranslationInstruction: (
  sourceLang: string,
  targetLang: string,
  toneLevel: number,
  tone?: string,
  customTone?: string
) => string;
let getFullDifferenceInstruction: (
  toneLevel: number,
  previousTranslation?: string,
  previousLevel?: number,
  tone?: string
) => string;
let structureToPromptText: (
  structure: Record<string, unknown>,
  targetLang?: string,
  sourceLang?: string
) => string;
let applyEvaluationWordGuard: (
  sourceText: string,
  result: { translation: string; reverse_translation: string; risk: string }
) => { translation: string; reverse_translation: string; risk: string };
let applyReverseTranslationGuard: (
  sourceLang: string,
  result: { translation: string; reverse_translation: string; risk: string }
) => { translation: string; reverse_translation: string; risk: string };
let applyTranslationLanguageGuard: (
  targetLang: string,
  result: { translation: string; reverse_translation: string; risk: string }
) => { translation: string; reverse_translation: string; risk: string };

// ============================
// 結果記録
// ============================

interface TestResult {
  id: string;
  category: string;
  input: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  structure?: Record<string, unknown>;
  translation?: string;
  reverse_translation?: string;
  failures: string[];
  error?: string;
}

const results: TestResult[] = [];

// ============================
// ヘルパー: 構造抽出
// ============================

async function extractStructureViaAPI(text: string): Promise<Record<string, unknown>> {
  const response = await callAPI(MODEL_NANO, EXPANDED_STRUCTURE_PROMPT, text, 0.1);
  return parseJSON(response);
}

// ============================
// ヘルパー: FULL翻訳
// ============================

interface TranslateFullOptions {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  tone?: string;
  toneLevel?: number;
  structure?: Record<string, unknown>;
  previousTranslation?: string;
  previousLevel?: number;
}

async function translateFullViaAPI(
  options: TranslateFullOptions
): Promise<{ translation: string; reverse_translation: string; risk: string }> {
  const {
    sourceText,
    sourceLang,
    targetLang,
    tone,
    structure,
    previousTranslation,
    previousLevel,
  } = options;
  const toneLevel = options.toneLevel ?? 0;

  const toneInstruction = getToneInstruction({
    sourceText,
    sourceLang,
    targetLang,
    isNative: true,
    tone,
    toneLevel,
  });
  const reverseTranslationInstr = getReverseTranslationInstruction(
    sourceLang,
    targetLang,
    toneLevel,
    tone
  );
  const differenceInstr = getFullDifferenceInstruction(
    toneLevel,
    previousTranslation,
    previousLevel,
    tone
  );
  const structureInfo = structure
    ? `\n${structureToPromptText(structure, targetLang, sourceLang)}\n`
    : '';
  const langInfoOnly = !structure
    ? `\n【出力言語 - 絶対遵守】\n・翻訳の出力言語: ${targetLang}\n・逆翻訳の出力言語: ${sourceLang}\n`
    : '';
  const languageSpecificRules = getLanguageSpecificRules(targetLang);

  const systemPrompt = `あなたは${sourceLang}から${targetLang}への翻訳の専門家です。

★★★ 最重要: translation フィールドは必ず「${targetLang}」で出力すること ★★★

${structureInfo}
${langInfoOnly}
${INVARIANT_RULES}
${TONE_AND_EVALUATION_RULES}

${languageSpecificRules}

【固有名詞の読み - 絶対遵守】
- 構造情報に記載された固有名詞の「読み」を必ずそのまま使用すること
- トーンに関係なく、読みを勝手に変更してはいけない

【重要】翻訳スタイル指示 - 必ず従うこと
${toneInstruction}
${reverseTranslationInstr}
${differenceInstr}

必ず以下のJSON形式で出力してください：
{
  "translation": "${targetLang}のみの翻訳",
  "reverse_translation": "${sourceLang}のみの逆翻訳",
  "risk": "low|med|high"
}`;

  const toneDesc = tone ? `${tone}スタイル、強度${toneLevel}%` : '自然な翻訳';
  const userPrompt = `以下のテキストを翻訳してください（${toneDesc}）：\n\n${sourceText}`;

  const response = await callAPI(MODEL_FULL, systemPrompt, userPrompt, 0.3);
  const parsed = parseJSON<{ translation: string; reverse_translation: string; risk: string }>(
    response
  );

  // ガード適用
  return applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(
      sourceLang,
      applyEvaluationWordGuard(sourceText, parsed)
    )
  );
}

// ============================
// チェック関数
// ============================

function hasJapanese(text: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(text);
}

function checkAutoChecks(
  testCase: (typeof testCases.cases)[0],
  structure: Record<string, unknown> | null,
  translation: string,
  reverseTranslation: string
): string[] {
  const failures: string[] = [];
  const checks = testCase.auto_checks;
  const translationLower = translation.toLowerCase();

  // 構造チェック
  if ('structure' in checks && checks.structure && structure) {
    const sc = checks.structure as Record<string, unknown>;

    // named_entities_contain
    if (sc.named_entities_contain && Array.isArray(sc.named_entities_contain)) {
      const entities = (structure['固有名詞'] as Array<{ text: string }>) || [];
      const entityTexts = entities.map((e) => e.text);
      for (const expected of sc.named_entities_contain as string[]) {
        if (!entityTexts.includes(expected)) {
          failures.push(`structure: 固有名詞に「${expected}」がない (got: ${entityTexts.join(', ')})`);
        }
      }
    }

    // named_entity_readings
    if (sc.named_entity_readings && typeof sc.named_entity_readings === 'object') {
      const entities = (structure['固有名詞'] as Array<{ text: string; 読み?: string }>) || [];
      for (const [name, expectedReading] of Object.entries(
        sc.named_entity_readings as Record<string, string>
      )) {
        const entity = entities.find((e) => e.text === name);
        if (entity && entity['読み'] && entity['読み'] !== expectedReading) {
          failures.push(
            `structure: ${name}の読みが「${entity['読み']}」(expected: ${expectedReading})`
          );
        }
      }
    }

    // subject
    if (sc.subject) {
      const subj = (structure['主語'] as string) || '';
      const expectedSubj = sc.subject as string;
      // 柔軟な判定: "省略" の場合は人称で判定
      if (expectedSubj === 'I') {
        const person = (structure['人称'] as string) || '';
        if (!person.includes('一人称') && subj !== 'I' && subj !== '私' && subj !== '省略') {
          failures.push(`structure: 主語が「${subj}」(expected: I / 一人称)`);
        }
      } else if (expectedSubj === 'You') {
        const person = (structure['人称'] as string) || '';
        if (!person.includes('二人称') && subj !== 'You' && subj !== 'あなた') {
          failures.push(`structure: 主語が「${subj}」(expected: You / 二人称)`);
        }
      }
    }

    // certainty (single value)
    if (sc.certainty) {
      const cert = (structure['確信度'] as string) || '';
      if (cert !== sc.certainty) {
        failures.push(`structure: 確信度が「${cert}」(expected: ${sc.certainty})`);
      }
    }

    // certainty_any (multiple acceptable values)
    if (sc.certainty_any && Array.isArray(sc.certainty_any)) {
      const cert = (structure['確信度'] as string) || '';
      if (!(sc.certainty_any as string[]).includes(cert)) {
        failures.push(`structure: 確信度が「${cert}」(expected one of: ${(sc.certainty_any as string[]).join(', ')})`);
      }
    }

    // modality (意図からの推定)
    if (sc.modality) {
      const intent = (structure['意図'] as string) || '';
      const expectedModality = sc.modality as string;
      if (expectedModality === 'request' && intent !== '依頼' && intent !== '命令') {
        failures.push(`structure: 意図が「${intent}」(expected: 依頼/命令 for request)`);
      }
      if (expectedModality === 'question' && intent !== '質問' && intent !== '確認') {
        failures.push(`structure: 意図が「${intent}」(expected: 質問/確認 for question)`);
      }
    }
  }

  // 翻訳チェック
  if ('translation' in checks && checks.translation) {
    const tc = checks.translation as Record<string, unknown>;

    // must_contain_any
    if (tc.must_contain_any && Array.isArray(tc.must_contain_any)) {
      const found = (tc.must_contain_any as string[]).some(
        (word) => translation.includes(word) || translationLower.includes(word.toLowerCase())
      );
      if (!found) {
        failures.push(
          `translation: must_contain_anyを満たさない (expected one of: ${(tc.must_contain_any as string[]).join(', ')}) in "${translation}"`
        );
      }
    }

    // must_contain_any_2
    if (tc.must_contain_any_2 && Array.isArray(tc.must_contain_any_2)) {
      const found = (tc.must_contain_any_2 as string[]).some(
        (word) => translation.includes(word) || translationLower.includes(word.toLowerCase())
      );
      if (!found) {
        failures.push(
          `translation: must_contain_any_2を満たさない (expected one of: ${(tc.must_contain_any_2 as string[]).join(', ')}) in "${translation}"`
        );
      }
    }

    // must_not_contain
    if (tc.must_not_contain && Array.isArray(tc.must_not_contain)) {
      for (const word of tc.must_not_contain as string[]) {
        if (translation.includes(word)) {
          failures.push(
            `translation: 禁止語「${word}」が含まれている in "${translation}"`
          );
        }
      }
    }

    // must_not_contain_pattern
    if (tc.must_not_contain_pattern && typeof tc.must_not_contain_pattern === 'string') {
      const regex = new RegExp(tc.must_not_contain_pattern, 'i');
      if (regex.test(translation)) {
        failures.push(
          `translation: 禁止パターン /${tc.must_not_contain_pattern}/i にマッチ in "${translation}"`
        );
      }
    }

    // subject_object_order
    if (tc.subject_object_order && typeof tc.subject_object_order === 'object') {
      const order = tc.subject_object_order as { subject: string; object: string };
      const subjIdx = translation.indexOf(order.subject);
      const objIdx = translation.indexOf(order.object);
      if (subjIdx >= 0 && objIdx >= 0 && subjIdx > objIdx) {
        failures.push(
          `translation: 主語目的語が反転 (${order.subject} at ${subjIdx}, ${order.object} at ${objIdx}) in "${translation}"`
        );
      }
    }
  }

  // 逆翻訳チェック
  if ('reverse_translation' in checks && checks.reverse_translation) {
    const rc = checks.reverse_translation as Record<string, unknown>;

    if (rc.must_be_japanese) {
      if (!hasJapanese(reverseTranslation)) {
        failures.push(
          `reverse_translation: 日本語が含まれていない: "${reverseTranslation}"`
        );
      }
    }

    if (rc.must_contain_meaning && Array.isArray(rc.must_contain_meaning)) {
      const meanings = rc.must_contain_meaning as string[];
      const matchCount = meanings.filter((m) => reverseTranslation.includes(m)).length;
      if (matchCount < Math.ceil(meanings.length / 2)) {
        failures.push(
          `reverse_translation: 意味キーワード不足 (${matchCount}/${meanings.length}): "${reverseTranslation}"`
        );
      }
    }
  }

  return failures;
}

// ============================
// メインテスト
// ============================

const shouldRun = !!GROQ_API_KEY;

const describeFn = shouldRun ? describe : describe.skip;

describeFn('QA統合テスト（API呼び出し）', () => {
  beforeAll(async () => {
    // 動的import
    const prompts = await import('../services/prompts');
    const guards = await import('../services/guards');

    EXPANDED_STRUCTURE_PROMPT = prompts.EXPANDED_STRUCTURE_PROMPT;
    INVARIANT_RULES = prompts.INVARIANT_RULES;
    TONE_AND_EVALUATION_RULES = prompts.TONE_AND_EVALUATION_RULES;
    getLanguageSpecificRules = prompts.getLanguageSpecificRules;
    getToneInstruction = prompts.getToneInstruction as typeof getToneInstruction;
    getReverseTranslationInstruction = prompts.getReverseTranslationInstruction;
    getFullDifferenceInstruction = prompts.getFullDifferenceInstruction;
    structureToPromptText = prompts.structureToPromptText as typeof structureToPromptText;
    applyEvaluationWordGuard = guards.applyEvaluationWordGuard as typeof applyEvaluationWordGuard;
    applyReverseTranslationGuard =
      guards.applyReverseTranslationGuard as typeof applyReverseTranslationGuard;
    applyTranslationLanguageGuard =
      guards.applyTranslationLanguageGuard as typeof applyTranslationLanguageGuard;
  });

  // カテゴリA-Fの標準テスト
  const standardCases = testCases.cases.filter(
    (c) => !('tone_levels' in c) && !('tone_levels_compare' in c)
  );

  for (const tc of standardCases) {
    it(
      `${tc.id}: ${tc.input}`,
      { timeout: 30000 },
      async () => {
        const result: TestResult = {
          id: tc.id,
          category: tc.category,
          input: tc.input,
          status: 'PASS',
          failures: [],
        };

        try {
          // 1. 構造抽出
          const structure = await extractStructureViaAPI(tc.input);
          result.structure = structure;

          // 2. FULL翻訳
          const translated = await translateFullViaAPI({
            sourceText: tc.input,
            sourceLang: tc.source_lang,
            targetLang: tc.target_lang,
            tone: 'tone' in tc ? (tc as Record<string, unknown>).tone as string : undefined,
            toneLevel: 0,
            structure,
          });
          result.translation = translated.translation;
          result.reverse_translation = translated.reverse_translation;

          // 3. auto_checks検証
          const failures = checkAutoChecks(tc, structure, translated.translation, translated.reverse_translation);
          result.failures = failures;

          if (failures.length > 0) {
            result.status = 'FAIL';
          }
        } catch (error) {
          result.status = 'ERROR';
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);

        // テスト結果をログ出力
        if (result.status !== 'PASS') {
          console.log(`[${result.id}] ${result.status}: ${result.input}`);
          if (result.translation) console.log(`  translation: ${result.translation}`);
          if (result.reverse_translation) console.log(`  reverse: ${result.reverse_translation}`);
          if (result.failures.length) console.log(`  failures: ${result.failures.join('; ')}`);
          if (result.error) console.log(`  error: ${result.error}`);
        }

        expect(result.failures, `FAIL details: ${result.failures.join('; ')}`).toHaveLength(0);
        expect(result.error).toBeUndefined();
      }
    );
  }

  // カテゴリG: トーン段階テスト
  const toneCases = testCases.cases.filter((c) => 'tone_levels' in c);

  for (const tc of toneCases) {
    it(
      `${tc.id}: ${tc.input} (${(tc as Record<string, unknown>).tone} tone差分)`,
      { timeout: 120000 },
      async () => {
        const result: TestResult = {
          id: tc.id,
          category: tc.category,
          input: tc.input,
          status: 'PASS',
          failures: [],
        };

        try {
          const structure = await extractStructureViaAPI(tc.input);
          const levels = (tc as Record<string, unknown>).tone_levels as number[];
          const tone = (tc as Record<string, unknown>).tone as string;
          const translations: Record<number, string> = {};

          let prevTranslation: string | undefined;
          let prevLevel: number | undefined;

          for (const level of levels) {
            const translated = await translateFullViaAPI({
              sourceText: tc.input,
              sourceLang: tc.source_lang,
              targetLang: tc.target_lang,
              tone,
              toneLevel: level,
              structure,
              previousTranslation: prevTranslation,
              previousLevel: prevLevel,
            });
            translations[level] = translated.translation;
            prevTranslation = translated.translation;
            prevLevel = level;
          }

          // 差分チェック: 隣接レベル間で翻訳が異なること
          for (let i = 1; i < levels.length; i++) {
            const a = translations[levels[i - 1]];
            const b = translations[levels[i]];
            if (a === b) {
              result.failures.push(
                `tone_difference: ${levels[i - 1]}%と${levels[i]}%の翻訳が同一 ("${a}")`
              );
            }
          }

          result.translation = JSON.stringify(translations);
          if (result.failures.length > 0) result.status = 'FAIL';
        } catch (error) {
          result.status = 'ERROR';
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);

        if (result.status !== 'PASS') {
          console.log(`[${result.id}] ${result.status}: ${result.input}`);
          console.log(`  translations: ${result.translation}`);
          if (result.failures.length) console.log(`  failures: ${result.failures.join('; ')}`);
          if (result.error) console.log(`  error: ${result.error}`);
        }

        expect(result.failures, `FAIL details: ${result.failures.join('; ')}`).toHaveLength(0);
        expect(result.error).toBeUndefined();
      }
    );
  }

  // カテゴリH4: トーン比較逆翻訳テスト
  const compareCases = testCases.cases.filter((c) => 'tone_levels_compare' in c);

  for (const tc of compareCases) {
    it(
      `${tc.id}: ${tc.input} (逆翻訳差分)`,
      { timeout: 60000 },
      async () => {
        const result: TestResult = {
          id: tc.id,
          category: tc.category,
          input: tc.input,
          status: 'PASS',
          failures: [],
        };

        try {
          const structure = await extractStructureViaAPI(tc.input);
          const levels = (tc as Record<string, unknown>).tone_levels_compare as number[];
          const tone = (tc as Record<string, unknown>).tone as string;
          const reverseTranslations: Record<number, string> = {};

          let prevTranslation: string | undefined;
          let prevLevel: number | undefined;

          for (const level of levels) {
            const translated = await translateFullViaAPI({
              sourceText: tc.input,
              sourceLang: tc.source_lang,
              targetLang: tc.target_lang,
              tone,
              toneLevel: level,
              structure,
              previousTranslation: prevTranslation,
              previousLevel: prevLevel,
            });
            reverseTranslations[level] = translated.reverse_translation;
            prevTranslation = translated.translation;
            prevLevel = level;
          }

          // 日本語チェック
          for (const level of levels) {
            if (!hasJapanese(reverseTranslations[level])) {
              result.failures.push(
                `reverse_translation(${level}%): 日本語が含まれない ("${reverseTranslations[level]}")`
              );
            }
          }

          // 差分チェック
          if (levels.length >= 2) {
            const a = reverseTranslations[levels[0]];
            const b = reverseTranslations[levels[1]];
            if (a === b) {
              result.failures.push(
                `reverse_translation差分: ${levels[0]}%と${levels[1]}%が同一 ("${a}")`
              );
            }
          }

          result.reverse_translation = JSON.stringify(reverseTranslations);
          if (result.failures.length > 0) result.status = 'FAIL';
        } catch (error) {
          result.status = 'ERROR';
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);

        if (result.status !== 'PASS') {
          console.log(`[${result.id}] ${result.status}: ${result.input}`);
          console.log(`  reverse_translations: ${result.reverse_translation}`);
          if (result.failures.length) console.log(`  failures: ${result.failures.join('; ')}`);
          if (result.error) console.log(`  error: ${result.error}`);
        }

        expect(result.failures, `FAIL details: ${result.failures.join('; ')}`).toHaveLength(0);
        expect(result.error).toBeUndefined();
      }
    );
  }

  // テスト完了後に結果をJSON出力
  it('結果をJSON出力', async () => {
    const fs = await import('fs');
    const outputPath = process.env.QA_OUTPUT_PATH || '/tmp/qa-result-latest.json';

    const summary = {
      timestamp: new Date().toISOString(),
      total: results.length,
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      error: results.filter((r) => r.status === 'ERROR').length,
      results,
    };

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`\n===== QA結果サマリー =====`);
    console.log(`PASS: ${summary.pass} / ${summary.total}`);
    console.log(`FAIL: ${summary.fail}`);
    console.log(`ERROR: ${summary.error}`);
    console.log(`出力: ${outputPath}`);

    // FAILの詳細
    const failResults = results.filter((r) => r.status === 'FAIL');
    if (failResults.length > 0) {
      console.log(`\n--- FAIL一覧 ---`);
      for (const f of failResults) {
        console.log(`${f.id}: ${f.failures.join('; ')}`);
      }
    }

    // このテスト自体は常にPASS（結果記録のため）
    expect(true).toBe(true);
  });
});
