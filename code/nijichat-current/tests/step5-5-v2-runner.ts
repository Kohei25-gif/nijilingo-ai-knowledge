/*
 * Step 5.5 v2 Runner (Generation Only)
 * - Uses production functions: extractStructure -> translateFull -> translatePartial
 * - Generates 12 translations + 12 reverse translations per input
 * - No automated judgment (manual C-mode review only)
 */

import fs from 'node:fs';
import path from 'node:path';

// API base URL must be set before importing services/api.ts
// @ts-expect-error custom global for services/api.ts
(globalThis as { API_BASE_URL?: string }).API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface V2Case {
  id: number;
  round: number;
  input: string;
  source_lang: 'ja';
  target_lang: 'en';
}

interface V2CaseFile {
  version: string;
  description: string;
  total_cases: number;
  cases: V2Case[];
}

interface ToneSeed {
  tone_category: 'casual' | 'polite' | 'business';
  tone_key: 'casual' | 'formal' | 'business';
  seed_translation: string;
  seed_reverse_translation: string;
  seed_risk: string;
}

interface ToneOutput {
  tone_category: 'casual' | 'polite' | 'business';
  tone_key: 'casual' | 'formal' | 'business';
  tone_percent: 25 | 50 | 75 | 100;
  translation: string;
  reverse_translation: string;
  risk: string;
  generator: 'translatePartial' | 'translateFull_fallback';
}

interface CaseResult {
  id: number;
  round: number;
  input: string;
  source_lang: 'ja';
  target_lang: 'en';
  structure: Record<string, unknown>;
  seeds: ToneSeed[];
  outputs: ToneOutput[];
}

interface RoundOutput {
  generated_at: string;
  round: number;
  total_cases: number;
  generation_summary: {
    partial_count: number;
    fallback_full_count: number;
  };
  case_results: CaseResult[];
}

const usage = `Usage:\n  API_BASE_URL=http://localhost:3000 npx tsx tests/step5-5-v2-runner.ts --round 1 --logDir /path/to/logs`;

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeJsonParse<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const body = match ? match[0] : cleaned;
  return JSON.parse(body) as T;
}

function escapeInline(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function sortOutputs(outputs: ToneOutput[]): ToneOutput[] {
  const toneOrder: Record<ToneOutput['tone_category'], number> = {
    casual: 0,
    polite: 1,
    business: 2,
  };
  return [...outputs].sort((a, b) => {
    const t = toneOrder[a.tone_category] - toneOrder[b.tone_category];
    if (t !== 0) return t;
    return a.tone_percent - b.tone_percent;
  });
}

async function run(): Promise<void> {
  const rawLog = console.log.bind(console);
  // Suppress verbose service logs ([translateFull]/[translatePartial]/prompt dumps)
  console.log = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (first.startsWith('[Round ') || first.startsWith('Round ') || first.startsWith('- ')) {
      rawLog(...args);
    }
  };

  const roundArg = argValue('--round');
  const logDirArg = argValue('--logDir');
  if (!roundArg) {
    console.error(usage);
    process.exit(1);
  }

  const round = Number(roundArg);
  if (!Number.isInteger(round) || round < 1 || round > 5) {
    console.error(`Invalid --round: ${roundArg}`);
    process.exit(1);
  }

  const logDir = logDirArg || '/Users/takakikohei/clawd/nijilingo-ai-knowledge/logs/step5-5-v2';
  ensureDir(logDir);

  const casesPath = '/Users/takakikohei/NijiChat/tests/step5-5-v2-cases.json';
  const caseFile = safeJsonParse<V2CaseFile>(fs.readFileSync(casesPath, 'utf8'));
  const roundCases = caseFile.cases.filter((c) => c.round === round);

  if (roundCases.length !== 20) {
    console.error(`Round ${round} expected 20 cases, got ${roundCases.length}`);
    process.exit(1);
  }

  const { extractStructure, translateFull, translatePartial } = await import('../src/services/groq');

  const toneConfigs: Array<{ category: 'casual' | 'polite' | 'business'; toneKey: 'casual' | 'formal' | 'business' }> = [
    { category: 'casual', toneKey: 'casual' },
    { category: 'polite', toneKey: 'formal' },
    { category: 'business', toneKey: 'business' },
  ];

  const toneLevels: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];
  const results: CaseResult[] = [];
  let partialCount = 0;
  let fallbackFullCount = 0;

  for (const tc of roundCases) {
    console.log(`[Round ${round}] Case ${tc.id} start`);

    const sourceLangName = '日本語';
    const targetLangName = '英語';

    const structure = await extractStructure(tc.input);
    const seeds: ToneSeed[] = [];
    const outputs: ToneOutput[] = [];

    for (const cfg of toneConfigs) {
      const seed = await translateFull({
        sourceText: tc.input,
        sourceLang: sourceLangName,
        targetLang: targetLangName,
        isNative: false,
        tone: cfg.toneKey,
        toneLevel: 0,
        structure,
      });

      seeds.push({
        tone_category: cfg.category,
        tone_key: cfg.toneKey,
        seed_translation: seed.translation,
        seed_reverse_translation: seed.reverse_translation,
        seed_risk: seed.risk,
      });

      let prevTranslation = seed.translation;
      let prevReverse = seed.reverse_translation;
      let prevLevel = 0;

      for (const level of toneLevels) {
        try {
          const partial = await translatePartial({
            sourceText: tc.input,
            sourceLang: sourceLangName,
            targetLang: targetLangName,
            isNative: false,
            tone: cfg.toneKey,
            toneLevel: level,
            currentTranslation: prevTranslation,
            currentReverseTranslation: prevReverse,
            seedTranslation: seed.translation,
            previousTranslation: prevTranslation,
            previousLevel: prevLevel,
            structure,
          });

          outputs.push({
            tone_category: cfg.category,
            tone_key: cfg.toneKey,
            tone_percent: level,
            translation: partial.translation,
            reverse_translation: partial.reverse_translation,
            risk: partial.risk,
            generator: 'translatePartial',
          });

          partialCount += 1;
          prevTranslation = partial.translation;
          prevReverse = partial.reverse_translation;
          prevLevel = level;
        } catch (error) {
          const fallback = await translateFull({
            sourceText: tc.input,
            sourceLang: sourceLangName,
            targetLang: targetLangName,
            isNative: false,
            tone: cfg.toneKey,
            toneLevel: level,
            structure,
          });

          outputs.push({
            tone_category: cfg.category,
            tone_key: cfg.toneKey,
            tone_percent: level,
            translation: fallback.translation,
            reverse_translation: fallback.reverse_translation,
            risk: fallback.risk,
            generator: 'translateFull_fallback',
          });

          fallbackFullCount += 1;
          prevTranslation = fallback.translation;
          prevReverse = fallback.reverse_translation;
          prevLevel = level;

          console.warn(
            `[Round ${round}] Case ${tc.id} fallback at ${cfg.category}-${level}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    results.push({
      id: tc.id,
      round: tc.round,
      input: tc.input,
      source_lang: tc.source_lang,
      target_lang: tc.target_lang,
      structure: structure as Record<string, unknown>,
      seeds,
      outputs: sortOutputs(outputs),
    });

    console.log(`[Round ${round}] Case ${tc.id} generated`);
  }

  const roundOutput: RoundOutput = {
    generated_at: new Date().toISOString(),
    round,
    total_cases: results.length,
    generation_summary: {
      partial_count: partialCount,
      fallback_full_count: fallbackFullCount,
    },
    case_results: results,
  };

  const outputsPath = path.join(logDir, `round-${round}-outputs.json`);
  fs.writeFileSync(outputsPath, JSON.stringify(roundOutput, null, 2));

  // Manual judgment template (C-mode)
  const judgmentsMdPath = path.join(logDir, `round-${round}-judgments.md`);
  const judgmentLines: string[] = [];
  judgmentLines.push(`# Step 5.5 v2 Round ${round} Judgments (C-mode Manual)`);
  judgmentLines.push('');
  judgmentLines.push('- 判定方式: C（こでくんが出力を読んで判定）');
  judgmentLines.push('- 自動判定API: 使用しない');
  judgmentLines.push('');

  for (const r of results) {
    judgmentLines.push(`## ${r.id}. ${r.input}`);
    judgmentLines.push('- Overall: PENDING');
    judgmentLines.push('- Checks: structure=PENDING, naturalness=PENDING, tone_difference=PENDING');
    judgmentLines.push('- Reason: PENDING');
    judgmentLines.push('- Outputs:');
    for (const o of r.outputs) {
      const key = `${o.tone_category}-${o.tone_percent}`;
      judgmentLines.push(`  - ${key} [${o.generator}]: EN="${escapeInline(o.translation)}" | JA="${escapeInline(o.reverse_translation)}"`);
    }
    judgmentLines.push('');
  }
  fs.writeFileSync(judgmentsMdPath, judgmentLines.join('\n'));

  const summaryMdPath = path.join(logDir, `round-${round}-summary.md`);
  const summaryLines: string[] = [];
  summaryLines.push(`# Step 5.5 v2 Round ${round} Summary`);
  summaryLines.push('');
  summaryLines.push('- 判定方式: C（manual）');
  summaryLines.push(`- Total cases: ${results.length}`);
  summaryLines.push(`- Generated outputs per case: 12 translation + 12 reverse_translation`);
  summaryLines.push(`- partial outputs: ${partialCount}`);
  summaryLines.push(`- fallback full outputs: ${fallbackFullCount}`);
  summaryLines.push('- PASS/WARN/FAIL: PENDING (manual review required)');
  fs.writeFileSync(summaryMdPath, summaryLines.join('\n'));

  console.log(`Round ${round} completed`);
  console.log(`- outputs: ${outputsPath}`);
  console.log(`- judgments: ${judgmentsMdPath}`);
  console.log(`- summary: ${summaryMdPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
