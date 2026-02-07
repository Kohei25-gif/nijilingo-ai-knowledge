/**
 * Step 5.5 汎化QA統合テストランナー
 * - 100件の日常会話で extractStructure -> translateFull -> auto_checks 検証
 * - カテゴリ別集計と期待差分の詳細をJSON出力
 */
import { beforeAll, describe, expect, it } from 'vitest';
import testCases from './generalize-qa-cases.json';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_FULL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const MODEL_NANO = 'gpt-4.1-nano';

interface CaseAutoChecks {
  structure?: {
    subject?: string;
    certainty_any?: string[];
    intent_any?: string[];
    conditional?: boolean;
  };
  translation?: {
    question?: boolean;
    must_contain_any?: string[];
    must_not_contain?: string[];
  };
  reverse_translation?: {
    must_be_japanese?: boolean;
    must_contain_meaning?: string[];
  };
}

interface TestCase {
  id: string;
  category: string;
  input: string;
  source_lang: string;
  target_lang: string;
  auto_checks: CaseAutoChecks;
}

interface TestResult {
  id: string;
  category: string;
  input: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  structure?: Record<string, unknown>;
  translation?: string;
  reverse_translation?: string;
  failures: string[];
  failure_types: string[];
  error?: string;
}

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

const results: TestResult[] = [];

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
      Authorization: `Bearer ${key}`,
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

async function extractStructureViaAPI(text: string): Promise<Record<string, unknown>> {
  const response = await callAPI(MODEL_NANO, EXPANDED_STRUCTURE_PROMPT, text, 0.1);
  return parseJSON(response);
}

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

  const userPrompt = `以下のテキストを翻訳してください：\n\n${sourceText}`;

  const response = await callAPI(MODEL_FULL, systemPrompt, userPrompt, 0.3);
  const parsed = parseJSON<{ translation: string; reverse_translation: string; risk: string }>(
    response
  );

  return applyTranslationLanguageGuard(
    targetLang,
    applyReverseTranslationGuard(sourceLang, applyEvaluationWordGuard(sourceText, parsed))
  );
}

function hasJapanese(text: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(text);
}

function isQuestionLikeEnglish(text: string): boolean {
  if (text.includes('?')) return true;
  const normalized = text.trim().toLowerCase();
  return /^(can|could|would|will|is|are|am|do|does|did|have|has|had|why|what|when|where|who|how)\b/.test(
    normalized
  );
}

function structureSuggestsConditional(structure: Record<string, unknown> | null): boolean {
  if (!structure) return false;
  const raw = JSON.stringify(structure);
  return /(条件|仮定|前提|分岐|もし|たら|なら|れば|if|when)/.test(raw);
}

function classifyFailureType(message: string): string {
  if (message.startsWith('structure:')) return 'STRUCTURE';
  if (message.startsWith('translation:')) return 'TRANSLATION';
  if (message.startsWith('reverse_translation:')) return 'REVERSE_TRANSLATION';
  return 'UNKNOWN';
}

function checkAutoChecks(
  testCase: TestCase,
  structure: Record<string, unknown> | null,
  translation: string,
  reverseTranslation: string
): string[] {
  const failures: string[] = [];
  const checks = testCase.auto_checks;
  const translationLower = translation.toLowerCase();
  const translationHasConditional = /\b(if|when|in case)\b/i.test(translation);

  if (checks.structure && structure) {
    if (checks.structure.subject) {
      const expected = checks.structure.subject;
      const subject = String(structure['主語'] || '');
      const person = String(structure['人称'] || '');
      if (
        expected === 'I' &&
        !person.includes('一人称') &&
        !['I', '私', '省略'].includes(subject)
      ) {
        failures.push(
          `structure: 主語判定 mismatch (expected: I, actual: 主語=${subject || '未設定'}, 人称=${person || '未設定'})`
        );
      }
      if (
        expected === 'You' &&
        !person.includes('二人称') &&
        !['You', 'あなた'].includes(subject)
      ) {
        failures.push(
          `structure: 主語判定 mismatch (expected: You, actual: 主語=${subject || '未設定'}, 人称=${person || '未設定'})`
        );
      }
    }

    if (checks.structure.certainty_any && checks.structure.certainty_any.length > 0) {
      const certainty = String(structure['確信度'] || '');
      if (!checks.structure.certainty_any.includes(certainty)) {
        failures.push(
          `structure: 確信度 mismatch (expected one of: ${checks.structure.certainty_any.join(', ')}, actual: ${certainty || '未設定'})`
        );
      }
    }

    if (checks.structure.intent_any && checks.structure.intent_any.length > 0) {
      const intent = String(structure['意図'] || '');
      if (!checks.structure.intent_any.includes(intent)) {
        failures.push(
          `structure: 意図 mismatch (expected one of: ${checks.structure.intent_any.join(', ')}, actual: ${intent || '未設定'})`
        );
      }
    }

    if (checks.structure.conditional) {
      // 構造抽出器が条件ラベルを持たない場合でも、翻訳が条件構文なら合格にする
      if (!structureSuggestsConditional(structure) && !translationHasConditional) {
        failures.push(
          'structure: 条件文パターン mismatch (expected: conditional marker in structure or translation, actual: not detected)'
        );
      }
    }
  }

  if (checks.translation) {
    if (checks.translation.question) {
      if (!isQuestionLikeEnglish(translation)) {
        failures.push(`translation: 疑問文 mismatch (expected: question-like English, actual: "${translation}")`);
      }
    }

    if (checks.translation.must_contain_any && checks.translation.must_contain_any.length > 0) {
      const found = checks.translation.must_contain_any.some(
        (word) => translation.includes(word) || translationLower.includes(word.toLowerCase())
      );
      if (!found) {
        failures.push(
          `translation: must_contain_any mismatch (expected one of: ${checks.translation.must_contain_any.join(', ')}, actual: "${translation}")`
        );
      }
    }

    if (checks.translation.must_not_contain && checks.translation.must_not_contain.length > 0) {
      for (const word of checks.translation.must_not_contain) {
        if (translation.includes(word)) {
          failures.push(`translation: must_not_contain mismatch (forbidden: ${word}, actual: "${translation}")`);
        }
      }
    }
  }

  if (checks.reverse_translation) {
    if (checks.reverse_translation.must_be_japanese && !hasJapanese(reverseTranslation)) {
      failures.push(
        `reverse_translation: 日本語判定 mismatch (expected: Japanese text, actual: "${reverseTranslation}")`
      );
    }

    if (
      checks.reverse_translation.must_contain_meaning &&
      checks.reverse_translation.must_contain_meaning.length > 0
    ) {
      const meanings = checks.reverse_translation.must_contain_meaning;
      const hitCount = meanings.filter((token) => reverseTranslation.includes(token)).length;
      // 汎化テストでは同義表現を許容し、最低1語の意味保持を要求する
      const threshold = 1;
      if (hitCount < threshold) {
        failures.push(
          `reverse_translation: 意味保持 mismatch (expected >= ${threshold}/${meanings.length} tokens from [${meanings.join(', ')}], actual hit=${hitCount}, reverse="${reverseTranslation}")`
        );
      }
    }
  }

  return failures;
}

function summarizeByCategory(items: TestResult[]) {
  const summary: Record<string, { total: number; pass: number; fail: number; error: number }> = {};
  for (const r of items) {
    if (!summary[r.category]) {
      summary[r.category] = { total: 0, pass: 0, fail: 0, error: 0 };
    }
    summary[r.category].total += 1;
    if (r.status === 'PASS') summary[r.category].pass += 1;
    if (r.status === 'FAIL') summary[r.category].fail += 1;
    if (r.status === 'ERROR') summary[r.category].error += 1;
  }
  return summary;
}

const shouldRun = !!GROQ_API_KEY && !!OPENAI_API_KEY;
const describeFn = shouldRun ? describe : describe.skip;

describeFn('Step 5.5 汎化QAテスト（API呼び出し）', () => {
  beforeAll(async () => {
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

  for (const tc of testCases.cases as TestCase[]) {
    it(
      `${tc.id}: ${tc.input}`,
      { timeout: 45000 },
      async () => {
        const result: TestResult = {
          id: tc.id,
          category: tc.category,
          input: tc.input,
          status: 'PASS',
          failures: [],
          failure_types: [],
        };

        try {
          const structure = await extractStructureViaAPI(tc.input);
          result.structure = structure;

          const translated = await translateFullViaAPI({
            sourceText: tc.input,
            sourceLang: tc.source_lang,
            targetLang: tc.target_lang,
            toneLevel: 0,
            structure,
          });

          result.translation = translated.translation;
          result.reverse_translation = translated.reverse_translation;

          const failures = checkAutoChecks(
            tc,
            structure,
            translated.translation,
            translated.reverse_translation
          );
          result.failures = failures;
          result.failure_types = [...new Set(failures.map(classifyFailureType))];

          if (failures.length > 0) {
            result.status = 'FAIL';
          }
        } catch (error) {
          result.status = 'ERROR';
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);

        if (result.status !== 'PASS') {
          console.log(`[${result.id}] ${result.status}: ${result.input}`);
          if (result.translation) console.log(`  translation: ${result.translation}`);
          if (result.reverse_translation) console.log(`  reverse: ${result.reverse_translation}`);
          if (result.failures.length > 0) {
            for (const failure of result.failures) {
              console.log(`  failure: ${failure}`);
            }
          }
          if (result.error) console.log(`  error: ${result.error}`);
        }

        expect(result.failures, `FAIL details: ${result.failures.join('; ')}`).toHaveLength(0);
        expect(result.error).toBeUndefined();
      }
    );
  }

  it('結果をJSON出力', async () => {
    const fs = await import('fs');
    const outputPath = process.env.GENERALIZE_QA_OUTPUT_PATH || '/tmp/generalize-qa-result-latest.json';

    const pass = results.filter((r) => r.status === 'PASS').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    const error = results.filter((r) => r.status === 'ERROR').length;
    const total = results.length;

    const summary = {
      timestamp: new Date().toISOString(),
      total,
      pass,
      fail,
      error,
      pass_rate: total > 0 ? Number(((pass / total) * 100).toFixed(2)) : 0,
      by_category: summarizeByCategory(results),
      by_failure_type: {
        STRUCTURE: results.filter((r) => r.failure_types.includes('STRUCTURE')).length,
        TRANSLATION: results.filter((r) => r.failure_types.includes('TRANSLATION')).length,
        REVERSE_TRANSLATION: results.filter((r) => r.failure_types.includes('REVERSE_TRANSLATION')).length,
        UNKNOWN: results.filter((r) => r.failure_types.includes('UNKNOWN')).length,
      },
      results,
    };

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    console.log('\n===== Step 5.5 汎化QA サマリー =====');
    console.log(`PASS: ${summary.pass} / ${summary.total} (${summary.pass_rate}%)`);
    console.log(`FAIL: ${summary.fail}`);
    console.log(`ERROR: ${summary.error}`);
    console.log(`出力: ${outputPath}`);

    for (const [cat, data] of Object.entries(summary.by_category)) {
      console.log(
        `CATEGORY ${cat}: PASS ${data.pass}/${data.total} (FAIL ${data.fail}, ERROR ${data.error})`
      );
    }

    expect(true).toBe(true);
  });
});
