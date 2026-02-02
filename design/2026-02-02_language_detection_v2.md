# 言語検出 v2 設計書

## 問題点（v1の失敗）
- 固有文字がないと全部英語になる
- 「Guten Tag」「Buongiorno」「Bom dia」が英語判定された

## 解決策：3段階方式

### Stage 1: CJK言語（確実）
Unicode範囲で100%判定可能
- 日本語: ひらがな・カタカナ
- 韓国語: ハングル
- 中国語: 漢字（日本語判定後）

### Stage 2: 固有文字（高確度）
特定の文字があれば確定
- チェコ語: ě, š, č, ř, ž, ů, ť, ď, ň
- ドイツ語: ß
- スペイン語: ¿, ¡, ñ
- ポルトガル語: ã, õ
- フランス語: œ, æ

### Stage 3: 単語リスト＋スコアリング（新規）
頻出単語のマッチ数でスコアリング

---

## 各言語の単語リスト

### ドイツ語
```
der, die, das, ein, eine, und, ist, sind, war, waren,
ich, du, er, sie, es, wir, ihr, nicht, mit, für, auf,
haben, werden, kann, guten, tag, morgen, danke, bitte,
wie, geht, ihnen, mir, gut, ja, nein
```

### イタリア語
```
il, la, lo, gli, le, un, una, e, è, sono, ho, hai, ha,
non, che, di, a, da, in, con, per, come, questo, quella,
buongiorno, buonasera, grazie, ciao, prego, scusi, bene
```

### ポルトガル語
```
o, a, os, as, um, uma, e, é, são, tem, não, que, de,
em, para, com, por, isso, este, esta, muito, bem,
bom, dia, obrigado, obrigada, olá, oi, tudo
```

### フランス語
```
le, la, les, un, une, et, est, sont, je, tu, il, elle,
nous, vous, ils, elles, ne, pas, que, qui, de, à, en,
pour, avec, ce, cette, très, bien, oui, non,
bonjour, merci, comment, allez
```

### スペイン語
```
el, la, los, las, un, una, y, es, son, no, que, de,
en, a, para, por, con, este, esta, muy, bien,
hola, buenos, días, gracias, cómo, estás
```

### 英語
```
the, a, an, is, are, was, were, be, been, have, has, had,
do, does, did, will, would, can, could, not, and, or, but,
this, that, these, those, I, you, he, she, it, we, they,
hello, hi, good, morning, thank, please, yes, no, how
```

---

## スコアリングロジック

```typescript
// 単語境界でマッチ（部分一致を防ぐ）
const countMatches = (text: string, words: string[]): number => {
  const textLower = text.toLowerCase();
  let score = 0;
  for (const word of words) {
    // 単語境界: \b${word}\b
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
};
```

## 判定ロジック

```
1. CJK判定 → 確定
2. 固有文字判定 → 確定
3. 全言語でスコア計算
4. 最高スコアの言語を返す
5. 同点なら英語（デフォルト）
6. 全て0点なら英語
```

---

## 閾値とボーナス

- 挨拶フレーズ（guten tag, buongiorno, bom dia）: +10点ボーナス
- 2単語以上マッチ: その言語を採用
- 英語との差が2点以上: その言語を採用
- 差が小さい場合: 英語を優先（安全側）
