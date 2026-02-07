import { describe, it, expect } from 'vitest';
import {
  INVARIANT_RULES,
  TONE_AND_EVALUATION_RULES,
  PARTIAL_SYSTEM_PROMPT,
  JAPANESE_EDIT_SYSTEM_PROMPT,
  EXPANDED_STRUCTURE_PROMPT,
  getLanguageSpecificRules,
  structureToPromptText,
  getToneStyleInstruction,
  getFullDifferenceInstruction,
  getToneInstruction,
  getReverseTranslationInstruction,
  getToneStyleForJapanese,
} from '../prompts';
import type { ExpandedStructure } from '../types';

// ============================================
// プロンプト定数の存在確認
// ============================================
describe('プロンプト定数', () => {
  it('INVARIANT_RULES が不変条件を含む', () => {
    expect(INVARIANT_RULES).toContain('entities');
    expect(INVARIANT_RULES).toContain('polarity');
    expect(INVARIANT_RULES).toContain('modality_class');
  });

  it('TONE_AND_EVALUATION_RULES がトーンルールを含む', () => {
    expect(TONE_AND_EVALUATION_RULES).toContain('トーン');
    expect(TONE_AND_EVALUATION_RULES).toContain('評価語');
  });

  it('PARTIAL_SYSTEM_PROMPT がPARTIALモード指示を含む', () => {
    expect(PARTIAL_SYSTEM_PROMPT).toContain('PARTIAL mode');
    expect(PARTIAL_SYSTEM_PROMPT).toContain('new_translation');
    expect(PARTIAL_SYSTEM_PROMPT).toContain('reverse_translation');
    expect(PARTIAL_SYSTEM_PROMPT).toContain('CORE PRINCIPLE');
    expect(PARTIAL_SYSTEM_PROMPT).toContain('Speech acts lock');
  });

  it('JAPANESE_EDIT_SYSTEM_PROMPT が日本語編集指示を含む', () => {
    expect(JAPANESE_EDIT_SYSTEM_PROMPT).toContain('日本語編集モード');
    expect(JAPANESE_EDIT_SYSTEM_PROMPT).toContain('edited_japanese');
  });

  it('EXPANDED_STRUCTURE_PROMPT が構造抽出指示を含む', () => {
    expect(EXPANDED_STRUCTURE_PROMPT).toContain('構造分析');
    expect(EXPANDED_STRUCTURE_PROMPT).toContain('固有名詞');
    expect(EXPANDED_STRUCTURE_PROMPT).toContain('確信度');
    expect(EXPANDED_STRUCTURE_PROMPT).toContain('感情極性');
    expect(EXPANDED_STRUCTURE_PROMPT).toContain('モダリティ');
  });
});

// ============================================
// getLanguageSpecificRules
// ============================================
describe('getLanguageSpecificRules', () => {
  it('英語: 敬称・服のルール', () => {
    const rules = getLanguageSpecificRules('英語');
    expect(rules).toContain('Mr./Ms.');
    expect(rules).toContain('dress');
    expect(rules).toContain('clothes');
  });

  it('中国語: 敬称ルール', () => {
    const rules = getLanguageSpecificRules('中国語');
    expect(rules).toContain('中国語');
    expect(rules).toContain('敬称');
  });

  it('韓国語: 씨の敬称', () => {
    const rules = getLanguageSpecificRules('韓国語');
    expect(rules).toContain('씨');
  });

  it('フランス語: M./Mme', () => {
    const rules = getLanguageSpecificRules('フランス語');
    expect(rules).toContain('M./Mme');
  });

  it('日本語: 敬称維持', () => {
    const rules = getLanguageSpecificRules('日本語');
    expect(rules).toContain('敬称');
  });

  it('未対応言語: 汎用ルール', () => {
    const rules = getLanguageSpecificRules('タガログ語');
    expect(rules).toContain('タガログ語');
    expect(rules).toContain('敬称');
  });
});

// ============================================
// structureToPromptText
// ============================================
describe('structureToPromptText', () => {
  const baseStructure: ExpandedStructure = {
    主題: '移動',
    動作: '向かう',
    動作の意味: 'go/head',
    意図: '報告',
    感情極性: 'neutral',
    モダリティ: '報告',
    主語: '省略',
    対象: 'なし',
    目的格: 'なし',
    願望: 'なし',
    人称: '一人称単数',
    確信度: '確定',
    程度: 'none',
    発話行為: ['報告'],
    固有名詞: [],
  };

  it('基本構造の出力確認', () => {
    const result = structureToPromptText(baseStructure);
    expect(result).toContain('主語: 省略');
    expect(result).toContain('動作: 向かう');
    expect(result).toContain('動作の意味: go/head');
    expect(result).toContain('意図: 報告');
    expect(result).toContain('感情極性: neutral');
    expect(result).toContain('モダリティ: 報告');
    expect(result).toContain('確信度: 確定');
    expect(result).toContain('程度: none');
    expect(result).toContain('発話行為: 報告');
    expect(result).toContain('人称: 一人称単数');
  });

  it('固有名詞あり（敬称なし）', () => {
    const structure: ExpandedStructure = {
      ...baseStructure,
      固有名詞: [{ text: 'ごんた', type: 'person', 読み: 'Gonta', 敬称: 'なし' }],
    };
    const result = structureToPromptText(structure);
    expect(result).toContain('ごんた');
    expect(result).toContain('Gonta');
    expect(result).toContain('身内・親しい人');
  });

  it('固有名詞あり（敬称あり）', () => {
    const structure: ExpandedStructure = {
      ...baseStructure,
      固有名詞: [{ text: '田中', type: 'person', 敬称: 'さん' }],
    };
    const result = structureToPromptText(structure);
    expect(result).toContain('田中');
    expect(result).toContain('敬称: さん');
  });

  it('言語情報を含む', () => {
    const result = structureToPromptText(baseStructure, '英語', '日本語');
    expect(result).toContain('翻訳の出力言語: 英語');
    expect(result).toContain('逆翻訳の出力言語: 日本語');
  });

  it('目的格ルールを含む', () => {
    const result = structureToPromptText(baseStructure);
    expect(result).toContain('目的格ルール');
    expect(result).toContain('目的語');
  });

  it('願望ルールを含む', () => {
    const result = structureToPromptText(baseStructure);
    expect(result).toContain('願望ルール');
    expect(result).toContain('want to');
  });

  it('人称ルールを含む', () => {
    const result = structureToPromptText(baseStructure);
    expect(result).toContain('人称ルール');
    expect(result).toContain('We に変えない');
  });

  it('確信度ルールを含む', () => {
    const result = structureToPromptText(baseStructure);
    expect(result).toContain('確信度ルール');
    expect(result).toContain('I think');
  });
});

// ============================================
// getToneStyleInstruction
// ============================================
describe('getToneStyleInstruction', () => {
  it('toneLevel < 25: 原文そのまま', () => {
    const result = getToneStyleInstruction('casual', 10);
    expect(result).toContain('原文そのまま');
  });

  it('casual 50%: カジュアル', () => {
    const result = getToneStyleInstruction('casual', 50);
    expect(result).toContain('カジュアル');
  });

  it('casual 100%: めちゃくちゃカジュアル', () => {
    const result = getToneStyleInstruction('casual', 100);
    expect(result).toContain('めちゃくちゃカジュアル');
    expect(result).toContain('gonna');
  });

  it('business 50%: 標準のビジネス', () => {
    const result = getToneStyleInstruction('business', 50);
    expect(result).toContain('ビジネス');
    expect(result).toContain('Could you please');
  });

  it('business 100%: めちゃくちゃビジネス', () => {
    const result = getToneStyleInstruction('business', 100);
    expect(result).toContain('めちゃくちゃビジネス');
  });

  it('formal 100%: めちゃくちゃ丁寧', () => {
    const result = getToneStyleInstruction('formal', 100);
    expect(result).toContain('めちゃくちゃ丁寧');
    expect(result).toContain('謙譲語');
  });

  it('custom オジサン構文: チェックリスト', () => {
    const result = getToneStyleInstruction('custom', 100, 'オジサン構文');
    expect(result).toContain('オジサン構文');
    expect(result).toContain('絵文字');
    expect(result).toContain('チェックリスト');
  });

  it('custom 限界オタク: 感情爆発', () => {
    const result = getToneStyleInstruction('custom', 100, '限界オタク');
    expect(result).toContain('限界オタク');
    expect(result).toContain('感情');
  });

  it('custom 赤ちゃん言葉: 幼児化', () => {
    const result = getToneStyleInstruction('custom', 100, '赤ちゃん言葉');
    expect(result).toContain('赤ちゃん言葉');
    expect(result).toContain('でしゅ');
  });

  it('custom ギャル: ギャル語', () => {
    const result = getToneStyleInstruction('custom', 100, 'ギャル');
    expect(result).toContain('ギャル');
    expect(result).toContain('まじ');
  });

  it('custom 自由入力: ユーザー指定', () => {
    const result = getToneStyleInstruction('custom', 100, 'ラッパー風');
    expect(result).toContain('ラッパー風');
    expect(result).toContain('Lv5');
  });

  it('tone未設定: シンプル', () => {
    const result = getToneStyleInstruction(undefined, 50);
    expect(result).toContain('原文の意味をそのまま');
  });
});

// ============================================
// getFullDifferenceInstruction
// ============================================
describe('getFullDifferenceInstruction', () => {
  it('75%: 差分必須', () => {
    const result = getFullDifferenceInstruction(75);
    expect(result).toContain('差分必須');
  });

  it('100%: 差分必須', () => {
    const result = getFullDifferenceInstruction(100);
    expect(result).toContain('差分必須');
  });

  it('50%: 差分推奨', () => {
    const result = getFullDifferenceInstruction(50);
    expect(result).toContain('差分推奨');
  });

  it('75% + 前の翻訳あり: 前レベルを含む', () => {
    const result = getFullDifferenceInstruction(75, "I'm heading there", 50);
    expect(result).toContain("I'm heading there");
    expect(result).toContain('50%');
  });

  it('business 75%: ビジネス指示', () => {
    const result = getFullDifferenceInstruction(75, undefined, undefined, 'business');
    expect(result).toContain('ビジネス');
  });
});

// ============================================
// getToneInstruction
// ============================================
describe('getToneInstruction', () => {
  it('オプションを透過する', () => {
    const result = getToneInstruction({
      sourceText: 'テスト',
      sourceLang: '日本語',
      targetLang: '英語',
      isNative: true,
      tone: 'casual',
      toneLevel: 75,
    });
    expect(result).toContain('カジュアル');
  });
});

// ============================================
// getReverseTranslationInstruction
// ============================================
describe('getReverseTranslationInstruction', () => {
  it('日本語原文: 日本語で逆翻訳', () => {
    const result = getReverseTranslationInstruction('日本語', '英語', 50);
    expect(result).toContain('日本語で出力');
  });

  it('日本語原文 + business: 敬語', () => {
    const result = getReverseTranslationInstruction('日本語', '英語', 50, 'business');
    expect(result).toContain('敬語');
  });

  it('日本語原文 + casual: 敬語を使わず', () => {
    const result = getReverseTranslationInstruction('日本語', '英語', 50, 'casual');
    expect(result).toContain('敬語を使わず');
  });

  it('英語原文: 英語で逆翻訳', () => {
    const result = getReverseTranslationInstruction('英語', '日本語', 50);
    expect(result).toContain('英語');
    expect(result).toContain('英語以外の言語は絶対に使わない');
  });
});

// ============================================
// getToneStyleForJapanese
// ============================================
describe('getToneStyleForJapanese', () => {
  it('casual 100%: 超カジュアル', () => {
    expect(getToneStyleForJapanese('casual', 100)).toContain('超カジュアル');
  });

  it('business 100%: 最高ビジネス', () => {
    expect(getToneStyleForJapanese('business', 100)).toContain('最高ビジネス');
  });

  it('formal 50%: 丁寧敬語', () => {
    expect(getToneStyleForJapanese('formal', 50)).toContain('丁寧敬語');
  });

  it('custom: トーン名を含む', () => {
    expect(getToneStyleForJapanese('custom', 100, 'ラッパー風')).toContain('ラッパー風');
  });
});
