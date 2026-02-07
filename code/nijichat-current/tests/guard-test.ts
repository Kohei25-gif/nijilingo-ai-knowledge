/**
 * ガード関数のユニットテスト
 *
 * APIを使わずにガード関数のロジックをテスト
 */

// applyReverseTranslationGuardの挙動をテスト
// 関数をエクスポートしていないので、ロジックをここで再現してテスト

interface TranslationResult {
  translation: string;
  reverse_translation: string;
  risk: 'low' | 'med' | 'high';
}

// 日本語文字が含まれているか
function hasJapaneseCharacters(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// groq.tsのapplyReverseTranslationGuardと同じロジック
function applyReverseTranslationGuard(
  sourceLang: string,
  result: TranslationResult
): TranslationResult {
  let reverseText = result.reverse_translation?.trim() ?? '';

  // 英語→日本語の場合：逆翻訳は英語であるべき
  if (sourceLang !== '日本語') {
    // 日本語が含まれていたら除去してrisk=high
    if (hasJapaneseCharacters(reverseText)) {
      console.warn('[applyReverseTranslationGuard] Japanese found in reverse_translation for non-Japanese source:', reverseText);
      // 日本語部分を除去（全て日本語の場合は空文字列になる）
      const cleanedReverse = reverseText.replace(/[ぁ-んァ-ン一-龯！？。、「」『』（）]+/g, '').trim();
      return { ...result, reverse_translation: cleanedReverse, risk: 'high' };
    }
    return result;
  }

  // 日本語→英語の場合：逆翻訳は日本語であるべき
  if (!reverseText || !hasJapaneseCharacters(reverseText)) {
    return { ...result, reverse_translation: reverseText, risk: 'high' };
  }
  return { ...result, reverse_translation: reverseText };
}

interface TestCase {
  name: string;
  sourceLang: string;
  input: TranslationResult;
  expectRisk: 'low' | 'med' | 'high';
  expectReverseHasJapanese: boolean;
}

const testCases: TestCase[] = [
  // 英語→日本語のテスト
  {
    name: '英語→日本語: 正しく英語の逆翻訳',
    sourceLang: '英語',
    input: {
      translation: 'かっこいい',
      reverse_translation: 'Very cool',
      risk: 'low',
    },
    expectRisk: 'low',
    expectReverseHasJapanese: false,
  },
  {
    name: '英語→日本語: 誤って日本語の逆翻訳',
    sourceLang: '英語',
    input: {
      translation: 'かっこいい',
      reverse_translation: 'とてもかっこいい',
      risk: 'low',
    },
    expectRisk: 'high',
    expectReverseHasJapanese: false, // 除去後は日本語なし
  },
  {
    name: '英語→日本語: 混在した逆翻訳',
    sourceLang: '英語',
    input: {
      translation: 'かっこいい',
      reverse_translation: 'Very cool かっこいい',
      risk: 'low',
    },
    expectRisk: 'high',
    expectReverseHasJapanese: false, // 除去後は日本語なし
  },
  // 日本語→英語のテスト
  {
    name: '日本語→英語: 正しく日本語の逆翻訳',
    sourceLang: '日本語',
    input: {
      translation: 'That outfit looks great!',
      reverse_translation: 'その服素敵だね！',
      risk: 'low',
    },
    expectRisk: 'low',
    expectReverseHasJapanese: true,
  },
  {
    name: '日本語→英語: 誤って英語の逆翻訳',
    sourceLang: '日本語',
    input: {
      translation: 'That outfit looks great!',
      reverse_translation: 'That outfit looks great!',
      risk: 'low',
    },
    expectRisk: 'high',
    expectReverseHasJapanese: false,
  },
  {
    name: '日本語→英語: 空の逆翻訳',
    sourceLang: '日本語',
    input: {
      translation: 'Hello',
      reverse_translation: '',
      risk: 'low',
    },
    expectRisk: 'high',
    expectReverseHasJapanese: false,
  },
];

function runTests() {
  console.log('=== ガード関数ユニットテスト ===\n');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const tc of testCases) {
    console.log(`テスト: ${tc.name}`);
    console.log(`  sourceLang: ${tc.sourceLang}`);
    console.log(`  入力 reverse_translation: "${tc.input.reverse_translation}"`);

    const result = applyReverseTranslationGuard(tc.sourceLang, tc.input);

    console.log(`  出力 reverse_translation: "${result.reverse_translation}"`);
    console.log(`  出力 risk: ${result.risk}`);

    const riskOk = result.risk === tc.expectRisk;
    const jpOk = hasJapaneseCharacters(result.reverse_translation) === tc.expectReverseHasJapanese;

    if (riskOk && jpOk) {
      console.log(`  ✅ PASS\n`);
      passed++;
    } else {
      console.log(`  ❌ FAIL`);
      if (!riskOk) {
        console.log(`    - risk: 期待=${tc.expectRisk}, 実際=${result.risk}`);
      }
      if (!jpOk) {
        console.log(`    - 日本語チェック: 期待=${tc.expectReverseHasJapanese}, 実際=${hasJapaneseCharacters(result.reverse_translation)}`);
      }
      console.log('');
      failed++;
      failures.push(tc.name);
    }
  }

  console.log('=== テスト結果 ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\n失敗したテスト:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
