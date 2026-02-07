import { describe, it, expect } from 'vitest';
import {
  calculateEditDistance,
  normalizeForCompare,
  isTooSimilarText,
  extractEntities,
  extractPolarityMarkers,
  isQuestion,
  extractConditionMarkers,
  hasJapaneseCharacters,
  checkInvariantConditions,
  extractModalityClass,
  checkAlignmentScore,
  checkModalityConsistency,
  checkPolitenessGuard,
  shouldFallbackToFull,
  applyEvaluationWordGuard,
  fixDoubleEnding,
  applyReverseTranslationGuard,
  applyTranslationLanguageGuard,
} from '../guards';

// ============================================
// calculateEditDistance
// ============================================
describe('calculateEditDistance', () => {
  it('同一文字列 → 距離0', () => {
    expect(calculateEditDistance('abc', 'abc')).toBe(0);
  });

  it('空文字列との距離', () => {
    expect(calculateEditDistance('', 'abc')).toBe(3);
    expect(calculateEditDistance('abc', '')).toBe(3);
  });

  it('1文字の違い', () => {
    expect(calculateEditDistance('cat', 'bat')).toBe(1); // 置換
    expect(calculateEditDistance('cat', 'cats')).toBe(1); // 挿入
    expect(calculateEditDistance('cats', 'cat')).toBe(1); // 削除
  });

  it('日本語文字列', () => {
    expect(calculateEditDistance('こんにちは', 'こんばんは')).toBe(2);
  });
});

// ============================================
// normalizeForCompare
// ============================================
describe('normalizeForCompare', () => {
  it('空白のトリムと正規化', () => {
    expect(normalizeForCompare('  hello  world  ')).toBe('hello world');
  });

  it('大文字小文字の正規化', () => {
    expect(normalizeForCompare('Hello World')).toBe('hello world');
  });

  it('ストレート引用符の正規化', () => {
    // normalizeForCompareは " → " 変換（同一文字）
    const result = normalizeForCompare('"Hello"');
    expect(result).toBe('"hello"');
  });
});

// ============================================
// isTooSimilarText
// ============================================
describe('isTooSimilarText', () => {
  it('完全一致 → true', () => {
    expect(isTooSimilarText('hello', 'hello')).toBe(true);
  });

  it('大文字小文字違いのみ → true', () => {
    expect(isTooSimilarText('Hello', 'hello')).toBe(true);
  });

  it('まったく異なる文字列 → false', () => {
    expect(isTooSimilarText('hello world', 'goodbye universe')).toBe(false);
  });

  it('空文字列同士 → true', () => {
    expect(isTooSimilarText('', '')).toBe(true);
  });
});

// ============================================
// extractEntities
// ============================================
describe('extractEntities', () => {
  it('数字を抽出', () => {
    const result = extractEntities('3時に会議');
    expect(result).toContain('3');
    expect(result).toContain('3時');
  });

  it('金額を抽出', () => {
    const result = extractEntities('$100と¥200');
    expect(result.some(e => e.includes('100'))).toBe(true);
    expect(result.some(e => e.includes('200'))).toBe(true);
  });

  it('エンティティなし → 空配列', () => {
    expect(extractEntities('こんにちは')).toEqual([]);
  });
});

// ============================================
// extractPolarityMarkers
// ============================================
describe('extractPolarityMarkers', () => {
  it('英語の否定検出', () => {
    const result = extractPolarityMarkers("I don't like it");
    expect(result.negative).toBe(true);
  });

  it('日本語の否定検出', () => {
    const result = extractPolarityMarkers('できない');
    expect(result.negative).toBe(true);
  });

  it('英語の肯定検出', () => {
    const result = extractPolarityMarkers('yes, of course');
    expect(result.positive).toBe(true);
  });

  it('中立 → 両方false', () => {
    const result = extractPolarityMarkers('hello');
    expect(result.positive).toBe(false);
    expect(result.negative).toBe(false);
  });
});

// ============================================
// isQuestion
// ============================================
describe('isQuestion', () => {
  it('英語の疑問符', () => {
    expect(isQuestion('Are you okay?')).toBe(true);
  });

  it('日本語の疑問符', () => {
    expect(isQuestion('大丈夫？')).toBe(true);
  });

  it('助動詞で始まる英語', () => {
    expect(isQuestion('Do you like it')).toBe(true);
    expect(isQuestion('Is it raining')).toBe(true);
  });

  it('日本語の「か」で終わる', () => {
    expect(isQuestion('行きますか')).toBe(true);
  });

  it('平叙文 → false', () => {
    expect(isQuestion('I like cats.')).toBe(false);
  });
});

// ============================================
// extractConditionMarkers
// ============================================
describe('extractConditionMarkers', () => {
  it('英語のif', () => {
    const result = extractConditionMarkers('If it rains, stay home');
    expect(result.length).toBeGreaterThan(0);
  });

  it('日本語の条件表現', () => {
    const result = extractConditionMarkers('もし雨なら家にいる');
    expect(result.length).toBeGreaterThan(0);
  });

  it('条件なし → 空', () => {
    expect(extractConditionMarkers('今日は晴れです')).toEqual([]);
  });
});

// ============================================
// hasJapaneseCharacters
// ============================================
describe('hasJapaneseCharacters', () => {
  it('ひらがな → true', () => {
    expect(hasJapaneseCharacters('こんにちは')).toBe(true);
  });

  it('カタカナ → true', () => {
    expect(hasJapaneseCharacters('カタカナ')).toBe(true);
  });

  it('漢字 → true', () => {
    expect(hasJapaneseCharacters('漢字')).toBe(true);
  });

  it('英語のみ → false', () => {
    expect(hasJapaneseCharacters('Hello World')).toBe(false);
  });
});

// ============================================
// checkInvariantConditions
// ============================================
describe('checkInvariantConditions', () => {
  it('正常: 数字保持・極性一致 → passed', () => {
    const result = checkInvariantConditions(
      '3時に行く',
      'Going at 3',
      '3時に行く'
    );
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('数字が失われた → violation', () => {
    const result = checkInvariantConditions(
      '3時に行く',
      'Going later',
      '後で行く'
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('entities'))).toBe(true);
  });

  it('否定が消えた → violation', () => {
    const result = checkInvariantConditions(
      '行かない',
      "I don't go",
      '行く'
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('polarity'))).toBe(true);
  });

  it('疑問文→平叙文 → violation', () => {
    const result = checkInvariantConditions(
      '行きますか？',
      'Are you going?',
      '行きます'
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('question'))).toBe(true);
  });

  it('条件マーカーが消えた → violation', () => {
    const result = checkInvariantConditions(
      'もし雨なら行かない',
      "If it rains, I won't go",
      '雨でも行く'
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('condition'))).toBe(true);
  });
});

// ============================================
// extractModalityClass
// ============================================
describe('extractModalityClass', () => {
  it('request: Can you〜', () => {
    expect(extractModalityClass('Can you help me?')).toBe('request');
  });

  it('request: 日本語のお願い', () => {
    expect(extractModalityClass('お願いします')).toBe('request');
  });

  it('confirmation: Are you〜?', () => {
    expect(extractModalityClass('Are you okay?')).toBe('confirmation');
  });

  it('suggestion: Let\'s〜', () => {
    expect(extractModalityClass("Let's go")).toBe('suggestion');
  });

  it('obligation: must', () => {
    expect(extractModalityClass('You must go')).toBe('obligation');
  });

  it('statement: 通常の文', () => {
    expect(extractModalityClass('I like cats')).toBe('statement');
  });
});

// ============================================
// checkAlignmentScore
// ============================================
describe('checkAlignmentScore', () => {
  it('同一テキスト → score 1.0', () => {
    const result = checkAlignmentScore('電車が止まった', '電車が止まった');
    expect(result.score).toBe(1.0);
    expect(result.hasIssue).toBe(false);
  });

  it('空テキスト → hasIssue', () => {
    const result = checkAlignmentScore('', '何か');
    expect(result.hasIssue).toBe(true);
  });

  it('数字が共通 → スコアが0より大きい', () => {
    // 数字キーワードが共通するケース（キーワード抽出で数字は個別に取れる）
    const result = checkAlignmentScore('3時に行く', '3時に向かう');
    expect(result.score).toBeGreaterThan(0);
    expect(result.details).toContain('keyword_match');
  });

  it('全く違う → スコア低め', () => {
    const result = checkAlignmentScore('電車が止まった', '天気がいい');
    expect(result.score).toBeLessThan(0.5);
  });
});

// ============================================
// checkModalityConsistency
// ============================================
describe('checkModalityConsistency', () => {
  it('同じmodality → passed', () => {
    const result = checkModalityConsistency('Can you help?', 'Could you assist?');
    expect(result.passed).toBe(true);
  });

  it('request→confirmation → failed', () => {
    const result = checkModalityConsistency('Can you help me?', 'Did you help me?');
    expect(result.passed).toBe(false);
  });

  it('statement同士 → passed', () => {
    const result = checkModalityConsistency('I like cats', 'I love cats');
    expect(result.passed).toBe(true);
  });
});

// ============================================
// checkPolitenessGuard
// ============================================
describe('checkPolitenessGuard', () => {
  it('casualトーンはスキップ → passed', () => {
    const result = checkPolitenessGuard('casual', 'めっちゃいい！');
    expect(result.passed).toBe(true);
  });

  it('businessトーンで敬語あり → passed', () => {
    const result = checkPolitenessGuard('business', 'ありがとうございます。');
    expect(result.passed).toBe(true);
  });

  it('businessトーンで敬語なし → failed', () => {
    const result = checkPolitenessGuard('business', 'めっちゃいいじゃん');
    expect(result.passed).toBe(false);
  });

  it('businessで「です」語尾 → passed', () => {
    const result = checkPolitenessGuard('business', 'そうです');
    expect(result.passed).toBe(true);
  });

  it('formalトーンでカジュアル語 → failed', () => {
    const result = checkPolitenessGuard('formal', 'マジでヤバいじゃん！');
    expect(result.passed).toBe(false);
  });
});

// ============================================
// shouldFallbackToFull
// ============================================
describe('shouldFallbackToFull', () => {
  it('parseError → fallback', () => {
    const result = shouldFallbackToFull('テスト', null, true);
    expect(result.shouldFallback).toBe(true);
    expect(result.reason).toBe('json_parse_error');
  });

  it('null result → fallback', () => {
    const result = shouldFallbackToFull('テスト', null);
    expect(result.shouldFallback).toBe(true);
  });

  it('risk=high → fallback', () => {
    // 編集距離チェックを通過するために、originalTextとtranslationを近い値に
    const longText = 'これは長いテスト文章です。今日はいい天気ですね。';
    const result = shouldFallbackToFull(longText, {
      translation: longText,  // 同じ文字列で編集距離=0
      reverse_translation: longText,
      risk: 'high',
    });
    expect(result.shouldFallback).toBe(true);
    expect(result.reason).toBe('high_risk');
  });

  it('正常な結果 → no fallback', () => {
    const longText = 'これは長いテスト文章です。今日はいい天気ですね。';
    const result = shouldFallbackToFull(longText, {
      translation: longText,  // 編集距離=0
      reverse_translation: longText,
      risk: 'low',
    });
    expect(result.shouldFallback).toBe(false);
  });
});

// ============================================
// applyEvaluationWordGuard
// ============================================
describe('applyEvaluationWordGuard', () => {
  it('「素敵」が逆翻訳に保持 → そのまま', () => {
    const result = applyEvaluationWordGuard('素敵な服', {
      translation: 'Nice outfit',
      reverse_translation: '素敵な服装',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });

  it('「素敵」が逆翻訳に欠落 → risk=high', () => {
    const result = applyEvaluationWordGuard('素敵な服', {
      translation: 'Nice outfit',
      reverse_translation: 'いい服装',
      risk: 'low',
    });
    expect(result.risk).toBe('high');
  });

  it('「服」がdressに変換 → risk=high', () => {
    const result = applyEvaluationWordGuard('かわいい服だね', {
      translation: 'Cute dress',
      reverse_translation: 'かわいいドレスだね',
      risk: 'low',
    });
    expect(result.risk).toBe('high');
  });

  it('「ドレス」がdressに変換 → 正常', () => {
    const result = applyEvaluationWordGuard('かわいいドレスだね', {
      translation: 'Cute dress',
      reverse_translation: 'かわいいドレスだね',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });
});

// ============================================
// fixDoubleEnding
// ============================================
describe('fixDoubleEnding', () => {
  it('ですねね → ですね。', () => {
    expect(fixDoubleEnding('楽しいですねね')).toBe('楽しいですね。');
  });

  it('ございますございます → ございます', () => {
    expect(fixDoubleEnding('ございますございます')).toBe('ございます');
  });

  it('ですです → です。', () => {
    expect(fixDoubleEnding('楽しいですです')).toBe('楽しいです。');
  });

  it('二重語尾なし → 変更なし', () => {
    expect(fixDoubleEnding('楽しいです')).toBe('楽しいです');
  });
});

// ============================================
// applyReverseTranslationGuard
// ============================================
describe('applyReverseTranslationGuard', () => {
  it('日本語→英語: 日本語の逆翻訳はそのまま', () => {
    const result = applyReverseTranslationGuard('日本語', {
      translation: 'test',
      reverse_translation: 'テスト',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });

  it('日本語→英語: 逆翻訳が空 → risk=high', () => {
    const result = applyReverseTranslationGuard('日本語', {
      translation: 'test',
      reverse_translation: '',
      risk: 'low',
    });
    expect(result.risk).toBe('high');
  });

  it('英語→日本語: 逆翻訳に日本語混入 → risk=high', () => {
    const result = applyReverseTranslationGuard('英語', {
      translation: 'テスト',
      reverse_translation: 'test テスト mixed',
      risk: 'low',
    });
    expect(result.risk).toBe('high');
  });

  it('英語→日本語: 正常な逆翻訳 → そのまま', () => {
    const result = applyReverseTranslationGuard('英語', {
      translation: 'テスト',
      reverse_translation: 'This is a test',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });
});

// ============================================
// applyTranslationLanguageGuard
// ============================================
describe('applyTranslationLanguageGuard', () => {
  it('ターゲット日本語 → スキップ', () => {
    const result = applyTranslationLanguageGuard('日本語', {
      translation: 'テスト日本語',
      reverse_translation: 'test',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });

  it('ターゲット英語で日本語混入 → risk=high', () => {
    const result = applyTranslationLanguageGuard('英語', {
      translation: 'hello テスト world',
      reverse_translation: 'こんにちはテスト世界',
      risk: 'low',
    });
    expect(result.risk).toBe('high');
  });

  it('ターゲット英語で正常 → そのまま', () => {
    const result = applyTranslationLanguageGuard('英語', {
      translation: 'hello world',
      reverse_translation: 'こんにちは世界',
      risk: 'low',
    });
    expect(result.risk).toBe('low');
  });
});
