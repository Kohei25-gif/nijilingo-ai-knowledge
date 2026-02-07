import { describe, it, expect } from 'vitest';
import {
  getDifferenceFromText,
  getNotYetGeneratedText,
  getFailedToGenerateText,
  getNoChangeText,
  getLangCodeFromName,
  getLangNameFromCode,
} from '../i18n';

const SUPPORTED_LANGS = ['ja', 'en', 'es', 'fr', 'zh', 'ko', 'de', 'it', 'pt', 'cs'];

// ============================================
// getDifferenceFromText
// ============================================
describe('getDifferenceFromText', () => {
  it('日本語: レベル値を含む', () => {
    expect(getDifferenceFromText('ja', 50)).toBe('50%との違い');
  });

  it('英語: レベル値を含む', () => {
    expect(getDifferenceFromText('en', 75)).toBe('Difference from 75%');
  });

  it('全サポート言語で値を返す', () => {
    for (const lang of SUPPORTED_LANGS) {
      const result = getDifferenceFromText(lang, 50);
      expect(result).toBeTruthy();
      expect(result).toContain('50');
    }
  });

  it('未対応言語: 英語フォールバック', () => {
    expect(getDifferenceFromText('xx', 50)).toBe('Difference from 50%');
  });
});

// ============================================
// getNotYetGeneratedText
// ============================================
describe('getNotYetGeneratedText', () => {
  it('日本語', () => {
    expect(getNotYetGeneratedText('ja')).toContain('まだ生成されていません');
  });

  it('英語', () => {
    expect(getNotYetGeneratedText('en')).toContain('not yet generated');
  });

  it('全サポート言語で値を返す', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(getNotYetGeneratedText(lang)).toBeTruthy();
    }
  });

  it('未対応言語: 英語フォールバック', () => {
    expect(getNotYetGeneratedText('xx')).toContain('not yet generated');
  });
});

// ============================================
// getFailedToGenerateText
// ============================================
describe('getFailedToGenerateText', () => {
  it('日本語', () => {
    expect(getFailedToGenerateText('ja')).toContain('失敗');
  });

  it('英語', () => {
    expect(getFailedToGenerateText('en')).toContain('Failed');
  });

  it('全サポート言語で値を返す', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(getFailedToGenerateText(lang)).toBeTruthy();
    }
  });
});

// ============================================
// getNoChangeText
// ============================================
describe('getNoChangeText', () => {
  it('日本語', () => {
    expect(getNoChangeText('ja')).toContain('同じ表現');
  });

  it('英語', () => {
    expect(getNoChangeText('en')).toContain('No change');
  });

  it('全サポート言語で値を返す', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(getNoChangeText(lang)).toBeTruthy();
    }
  });
});

// ============================================
// getLangCodeFromName
// ============================================
describe('getLangCodeFromName', () => {
  it('日本語名 → ISOコード', () => {
    expect(getLangCodeFromName('日本語')).toBe('ja');
    expect(getLangCodeFromName('英語')).toBe('en');
    expect(getLangCodeFromName('中国語')).toBe('zh');
    expect(getLangCodeFromName('韓国語')).toBe('ko');
    expect(getLangCodeFromName('フランス語')).toBe('fr');
    expect(getLangCodeFromName('スペイン語')).toBe('es');
    expect(getLangCodeFromName('ドイツ語')).toBe('de');
    expect(getLangCodeFromName('イタリア語')).toBe('it');
    expect(getLangCodeFromName('ポルトガル語')).toBe('pt');
    expect(getLangCodeFromName('チェコ語')).toBe('cs');
  });

  it('英語名 → ISOコード', () => {
    expect(getLangCodeFromName('Japanese')).toBe('ja');
    expect(getLangCodeFromName('English')).toBe('en');
    expect(getLangCodeFromName('Chinese')).toBe('zh');
    expect(getLangCodeFromName('Korean')).toBe('ko');
  });

  it('未対応 → en（デフォルト）', () => {
    expect(getLangCodeFromName('Unknown')).toBe('en');
  });
});

// ============================================
// getLangNameFromCode
// ============================================
describe('getLangNameFromCode', () => {
  it('ISOコード → 英語名', () => {
    expect(getLangNameFromCode('ja')).toBe('Japanese');
    expect(getLangNameFromCode('en')).toBe('English');
    expect(getLangNameFromCode('zh')).toBe('Chinese');
    expect(getLangNameFromCode('ko')).toBe('Korean');
    expect(getLangNameFromCode('fr')).toBe('French');
    expect(getLangNameFromCode('es')).toBe('Spanish');
    expect(getLangNameFromCode('de')).toBe('German');
    expect(getLangNameFromCode('it')).toBe('Italian');
    expect(getLangNameFromCode('pt')).toBe('Portuguese');
    expect(getLangNameFromCode('cs')).toBe('Czech');
  });

  it('未対応 → English（デフォルト）', () => {
    expect(getLangNameFromCode('xx')).toBe('English');
  });
});
