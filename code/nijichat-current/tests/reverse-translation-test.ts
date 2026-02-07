/**
 * 逆翻訳バグのテスト
 *
 * バグ: 英語→日本語翻訳で、逆翻訳が英語に戻らず日本語のまま
 *
 * 使い方: npx ts-node tests/reverse-translation-test.ts
 *
 * 環境変数:
 * - API_BASE_URL: APIのベースURL（デフォルト: http://localhost:3000）
 */

// APIベースURLを設定（vercel dev用）
// @ts-expect-error globalThis assignment
globalThis.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

import { translateFull } from '../src/services/groq';

interface TestCase {
  name: string;
  input: {
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    tone?: string;
    toneLevel?: number;
  };
  expect: {
    translationLang: string;  // 翻訳結果の期待言語
    reverseLang: string;       // 逆翻訳の期待言語
  };
}

// 日本語かどうか判定（ひらがな・カタカナ・漢字が含まれてるか）
function isJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// 英語かどうか判定（ASCII文字のみ）
function isEnglish(text: string): boolean {
  return /^[A-Za-z0-9\s.,!?'"()-]+$/.test(text);
}

function checkLanguage(text: string, expectedLang: string): boolean {
  if (expectedLang === '日本語') {
    return isJapanese(text);
  } else if (expectedLang === '英語') {
    return isEnglish(text);
  }
  return true;
}

const testCases: TestCase[] = [
  {
    name: '英語→日本語: 逆翻訳が英語に戻るか',
    input: {
      sourceText: 'very cool',
      sourceLang: '英語',
      targetLang: '日本語',
      tone: 'casual',
      toneLevel: 100
    },
    expect: {
      translationLang: '日本語',
      reverseLang: '英語'
    }
  },
  {
    name: '英語→日本語: ビジネストーン100%',
    input: {
      sourceText: 'Could you send that file later?',
      sourceLang: '英語',
      targetLang: '日本語',
      tone: 'business',
      toneLevel: 100
    },
    expect: {
      translationLang: '日本語',
      reverseLang: '英語'
    }
  },
  {
    name: '日本語→英語: 逆翻訳が日本語であるか',
    input: {
      sourceText: 'その服素敵だね',
      sourceLang: '日本語',
      targetLang: '英語',
      tone: 'casual',
      toneLevel: 50
    },
    expect: {
      translationLang: '英語',
      reverseLang: '日本語'
    }
  }
];

async function runTests() {
  console.log('=== 逆翻訳テスト開始 ===\n');
  
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const tc of testCases) {
    console.log(`テスト: ${tc.name}`);
    console.log(`  入力: "${tc.input.sourceText}"`);
    
    try {
      const result = await translateFull({
        sourceText: tc.input.sourceText,
        sourceLang: tc.input.sourceLang,
        targetLang: tc.input.targetLang,
        isNative: false,
        tone: tc.input.tone,
        toneLevel: tc.input.toneLevel
      });

      console.log(`  翻訳: "${result.translation}"`);
      console.log(`  逆翻訳: "${result.reverse_translation}"`);

      // 翻訳結果の言語チェック
      const translationOk = checkLanguage(result.translation, tc.expect.translationLang);
      // 逆翻訳の言語チェック
      const reverseOk = checkLanguage(result.reverse_translation, tc.expect.reverseLang);

      if (translationOk && reverseOk) {
        console.log(`  ✅ PASS\n`);
        passed++;
      } else {
        console.log(`  ❌ FAIL`);
        if (!translationOk) {
          console.log(`    - 翻訳が${tc.expect.translationLang}じゃない`);
        }
        if (!reverseOk) {
          console.log(`    - 逆翻訳が${tc.expect.reverseLang}じゃない（実際: ${isJapanese(result.reverse_translation) ? '日本語' : '英語?'}）`);
        }
        console.log('');
        failed++;
        failures.push(tc.name);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error}`);
      failed++;
      failures.push(tc.name);
    }
  }

  console.log('=== テスト結果 ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log('\n失敗したテスト:');
    failures.forEach(f => console.log(`  - ${f}`));
  }

  // 終了コード: 失敗があれば1
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
