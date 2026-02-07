// プロンプト定数・ルール生成関数（groq.tsから分離）

import type { ExpandedStructure, EntityType, TranslateOptions } from './types';

// 不変条件（7項目 + stance_strength）のシステムプロンプト
export const INVARIANT_RULES = `
【不変条件】
1. entities - 数字・日付・時刻・金額・固有名詞を変えない
2. polarity - 肯定/否定を変えない
3. locked_terms - 用語集の語句をそのまま使う
4. modality_class - 依頼/義務/提案のクラスを変えない
5. question/statement - 質問/断定を変えない
6. condition markers - if/unless/when等を保持
7. commitment - 約束を勝手に追加しない
8. stance_strength - 同意や感情の強さを変えない
9. 意図・確信度・感情極性・モダリティは構造情報の値を固定

【逆翻訳ルール】
- 値は翻訳結果に従う
- 時刻表記は原文のスタイルに合わせる（15時→15時、3 PM→15時）
`;

export const TONE_AND_EVALUATION_RULES = `
【トーン・評価語ルール】
1. トーンは口調のみ変更し、評価軸は変えない（素敵/かわいい/きれい/良い等のカテゴリ維持）
2. 名詞カテゴリも変えない（犬→ワンちゃんはOK、犬→猫はNG）
3. トーン調整で変えていいのは「語彙の格式レベル・文体・丁寧さ」のみ
4. 意図を変えない（感謝→依頼にしない、報告→提案にしない）
5. 確信度を変えない（不確実→確実にしない）
6. 感情極性を変えない（ネガティブにポジティブ表現を追加しない）
`;

// PARTIAL用システムプロンプト（トーンレベル指示はuserPromptで渡す）
export const PARTIAL_SYSTEM_PROMPT = `You are NijiLingo's tone editor in PARTIAL mode.
Edit current_translation to match the requested tone level. Do NOT translate from scratch.

CORE PRINCIPLE (non-negotiable):
- Style Strength (tone%) and Semantic Strength (degree_level) are TWO INDEPENDENT axes.
- Raising tone changes ONLY surface style (vocabulary formality, contractions, politeness markers, sentence structure).
- Raising tone must NEVER raise semantic intensity, certainty, or commitment strength.

═══ MEANING LOCK (never change) ═══
1. Entities: numbers, dates, times, amounts, proper nouns
2. Polarity: positive ↔ negative never flips
3. Subject: never change (1st person singular ≠ 1st person plural)
4. Intent & modality class: request/report/gratitude/suggestion stays the same
5. Question/statement type preserved
6. Condition markers (if/unless/when) preserved — never drop them
7. Commitment lock: do NOT weaken or strengthen commitments/promises/offers. Keep the same commitment class as Seed(0%).
8. Predicate meaning lock: keep the core action meaning from structure.動作の意味. Do not swap into a different achievement/evaluation verb.
9. Degree lock: keep intensity at the level specified in structure.程度. Do NOT escalate beyond Seed(0%).
10. Speech acts lock: ALL acts listed in structure.発話行為 must appear in output.
11. No extra facts: do not add new reasons, excuses, evaluations, or details not present in Seed(0%).
12. No ceremonial framing: Do NOT wrap the message in ceremony not present in the source.

═══ DYNAMIC CONSTRAINTS ═══
Each request includes a [Constraints for THIS sentence] block with per-sentence immutable values
extracted from structural analysis. These constraints reinforce the MEANING LOCK rules above
with specific values for this particular sentence. Follow BOTH the general rules AND the
per-sentence constraints strictly.

═══ TONE = SURFACE STYLE ONLY ═══
OK to change: vocabulary formality, politeness markers, contractions, discourse markers, sentence structure, word choice within SAME meaning+strength.
NOT OK: meaning, intent, certainty, sentiment, degree/intensity, commitment strength.

═══ OUTPUT ═══
JSON only, no markdown: {"new_translation":"...","reverse_translation":"...(source lang)","risk":"low|med|high"}`;

// 日本語編集用のシステムプロンプト
export const JAPANESE_EDIT_SYSTEM_PROMPT = `あなたはNijiLingoの日本語編集モードです。
与えられた日本語文を、指定されたトーンレベルに合わせて編集してください。

【最重要ルール】
- 0%: 原文をそのまま返す（一切変更しない）
- 50%: 原文から必ず変更する（語尾・言い回しを変える）
- 100%: 50%よりさらに強く変える
- 0%と50%が同じ文章になるのは禁止！

【ルール】

1. 意味を変えない
   - 数字、名前、肯定/否定、質問/断定はそのまま
   - 依頼/義務/提案のクラスを変えない
   - 約束やお願いを追加しない
   - 感情の強さを変えない（OK→素晴らしい ❌）

2. 敬語の対象を間違えない
   - 人名の判断: 後ろに人の動作（寝る、来る、食べる等）が続くか
   - 敬称なし人名（太郎、花子）= 身内 → 敬語化しない
   - 敬称あり人名（田中様）= 他人 → 敬語化OK
   - 敬称を勝手に追加しない

3. 自然な日本語にする
   - 文法が正しいこと
   - 「じゃん」は確認・評価にのみ使う（未来の行動には使わない）

【トーンレベルガイド - 差を明確に！】

カジュアル:
- 0%: そのまま（変更なし）
- 50%: 「〜だね」「〜だよ」「〜してる」「〜かな？」を追加
- 100%: 「めっちゃ〜」「マジで〜」「〜よ！」「〜じゃん！」

ビジネス:
- 0%: そのまま（変更なし）
- 50%: 「〜いたします」「〜でございます」「〜いただけますか」
- 100%: 「〜申し上げます」「〜賜りますよう」「誠に〜」

フォーマル:
- 0%: そのまま（変更なし）
- 50%: 「〜させていただきます」「〜でございます」
- 100%: 「〜申し上げる所存でございます」「何卒〜」

【良い例・悪い例】
元: 「太郎が寝てからあなたの家に行く」

✅ カジュアル0%: 太郎が寝てからあなたの家に行く（そのまま）
✅ カジュアル50%: 太郎が寝てからあなたの家に行くね！（語尾変更）
✅ カジュアル100%: 太郎が寝てからお前んち行くよ！（強調+くだけた表現）

❌ 太郎様がお休みになられましたら（身内に敬語）
❌ 何卒よろしくお願いいたします（意味追加）
❌ 行くじゃん！（「じゃん」の使い方が不自然）
❌ 微妙させていただきます（文法崩壊）

JSONのみ返してください（説明不要）:
{"edited_japanese":"..."}`;

// 言語固有ルール（10言語対応）
export function getLanguageSpecificRules(targetLang: string): string {
  switch (targetLang) {
    case '英語':
      return `
【人名の翻訳ルール - 英語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞（歌、絵等）と混同しない

【敬称のルール - 英語】
- 日本語で敬称なし → 英語でも Mr./Ms. をつけない
- 日本語で敬称あり → 英語で Mr./Ms. をつける

【「君」「あなた」の翻訳ルール - 英語】
- 「君」「あなた」は単純に "you" と訳す
- 余計な装飾を追加しない

【服の翻訳ルール - 英語】
- 服の一般語は clothes/outfit を使う
- "dress" は「ドレス/ワンピース」が明示された時だけ`;

    case '中国語':
      return `
【人名の翻訳ルール - 中国語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - 中国語】
- 日本語で敬称なし → 中国語でも敬称をつけない
- 日本語で敬称あり → 中国語で適切な敬称をつける`;

    case 'チェコ語':
      return `
【人名の翻訳ルール - チェコ語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - チェコ語】
- 日本語で敬称なし → チェコ語でも敬称をつけない
- 日本語で敬称あり → チェコ語で適切な敬称をつける`;

    case '韓国語':
      return `
【人名の翻訳ルール - 韓国語】
- ひらがな/カタカナの人名はローマ字または韓国語読みで表記
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - 韓国語】
- 日本語で敬称なし → 韓国語でも敬称をつけない
- 日本語で敬称あり → 韓国語で適切な敬称（씨等）をつける`;

    case 'フランス語':
      return `
【人名の翻訳ルール - フランス語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - フランス語】
- 日本語で敬称なし → フランス語でも M./Mme をつけない
- 日本語で敬称あり → フランス語で M./Mme をつける`;

    case 'スペイン語':
      return `
【人名の翻訳ルール - スペイン語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - スペイン語】
- 日本語で敬称なし → スペイン語でも Sr./Sra. をつけない
- 日本語で敬称あり → スペイン語で Sr./Sra. をつける`;

    case 'ドイツ語':
      return `
【人名の翻訳ルール - ドイツ語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ドイツ語】
- 日本語で敬称なし → ドイツ語でも Herr/Frau をつけない
- 日本語で敬称あり → ドイツ語で Herr/Frau をつける`;

    case 'イタリア語':
      return `
【人名の翻訳ルール - イタリア語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - イタリア語】
- 日本語で敬称なし → イタリア語でも Sig./Sig.ra をつけない
- 日本語で敬称あり → イタリア語で Sig./Sig.ra をつける`;

    case 'ポルトガル語':
      return `
【人名の翻訳ルール - ポルトガル語】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ポルトガル語】
- 日本語で敬称なし → ポルトガル語でも Sr./Sra. をつけない
- 日本語で敬称あり → ポルトガル語で Sr./Sra. をつける`;

    case '日本語':
      return `
【人名の翻訳ルール - 日本語】
- 人名はそのまま維持する
- 敬称は原文に従う（なければつけない）

【敬称のルール - 日本語】
- 原文の敬称を維持する
- 勝手に「様」「さん」を追加しない`;

    default:
      // 未対応言語は汎用ルール
      return `
【人名の翻訳ルール - ${targetLang}】
- ひらがな/カタカナの人名はローマ字表記する
- 逆翻訳は元のひらがな/カタカナのまま維持
- 人名を一般名詞と混同しない

【敬称のルール - ${targetLang}】
- 日本語で敬称なし → ${targetLang}でも敬称をつけない
- 日本語で敬称あり → ${targetLang}で適切な敬称をつける`;
  }
}

export const EXPANDED_STRUCTURE_PROMPT = `あなたは多言語対応の構造分析アシスタントです。
入力された文章から、以下の17項目を抽出してください。

各項目には【構造的定義】と【日本語での典型パターン】があります。
判定は必ず【構造的定義】を優先してください。典型パターンはあくまで補助です。

【抽出項目】

1. 主題: 何について話しているか

2. 動作: 何をするか/どうなるか
   ★ 条件表現がある場合、動作に条件性を残す（例: 止まっていたら）

3. 動作の意味: 動作の英語での意味（go, come, eat, sleep, say等の基本動詞で表現）

4. 意図: 依頼/確認/報告/質問/感謝/謝罪/提案/命令/その他
   【構造的定義】文全体として話者が何を達成しようとしているか。
   - 話者が相手に行動を求めている → 依頼
   - 話者が事実を伝えている → 報告
   - 話者が情報を求めている → 質問
   - 話者が謝意を示している → 感謝
   - 話者が非を認めている → 謝罪
   - 話者が選択肢を提示している → 提案
   ★ 複合文は最後の主文の意図を採用

5. 感情極性: positive/negative/neutral
   【構造的定義】話者の感情の向き。文の内容ではなく、話者がその内容をどう感じているか。
   - positive: 話者が喜び・感謝・安心・満足を感じている
   - negative: 話者が謝罪・不満・不安・困惑・残念を感じている
   - neutral: 話者が特定の感情を込めずに述べている
   ★ 重要: 「気遣い」は話者の感情ではなく相手への配慮。気遣い自体はneutralまたはpositiveだが、文脈による。
   - 「体調よくなった？無理しないでね」→ positive（相手の回復を願う好意的な気遣い）
   - 「残念ながら見送ります」→ negative（話者が残念に感じている）
   - 「予算が厳しいので探します」→ neutral（感情を込めず事実と行動を述べている）

6. モダリティ: 報告/依頼/感謝/質問/感想/提案/その他
   【構造的定義】文がどのような発話機能を持つか。
   - 報告: 事実・状態を伝える
   - 依頼: 相手に行動を求める
   - 感謝: 謝意を表す
   - 質問: 情報を求める
   - 感想: 話者の主観的印象・評価を述べる
   - 提案: 行動の選択肢を示す
   【日本語パターン】「遅れてる」→ 報告、「見てくれる？」→ 依頼、「ありがとう」→ 感謝

7. 主語: 誰が（明示されている場合のみ記載。省略されていれば「省略」。推測で補填しない）

8. 対象: 誰に/何に（なければ「なし」）

9. 目的格: 「〜を」がついている単語（動作の直接の対象。なければ「なし」）
   ★ 重要: 目的格は翻訳時に必ず目的語(object)として扱う
   ★ 例: 「君を抱く」→ 目的格は「君」→ 翻訳で「君」は目的語（hold you）

10. 願望: 願望表現があるか（あり/なし）
    【構造的定義】話者が実現していない状態を望んでいるか。
    - あり: 話者が「〜したい」「〜してほしい」「〜であってほしい」等の未実現の望みを表現している
    - なし: 願望表現がない
    ★ 願望は翻訳・逆翻訳で必ず保持する（「抱きたい」→「抱いてる」は禁止）

11. 人称: 動作の主体の人称（一人称単数/一人称複数/二人称/三人称）
    【構造的定義】文の主な動作を行う主体が誰か。
    - 一人称単数: 話者ひとり
    - 一人称複数: 話者を含むグループ
    - 二人称: 聞き手
    - 三人称: 話者でも聞き手でもない第三者
    ★ 主語が省略されていても、文脈から人称を判断する
    ★ 例: 「向かいます」（主語省略）→ 一人称単数（話者が向かう）
    ★ 例: 「体調よくなった？」（主語省略）→ 二人称（聞き手の体調を聞いている）

12. 確信度: 確定/推測/可能性/伝聞
    【構造的定義 — 最優先で適用】
    - 確定: 話者が事実として断定している。疑いや不確かさの表現がない。
    - 推測: 話者が自分の判断・見解として述べているが、断定を避けている。「こう思うが確実ではない」というニュアンス。
    - 可能性: 話者が「起こりうる」程度の低い確信で述べている。
    - 伝聞: 話者が他者から得た情報として伝えている。
    
    【判定の核心ルール】
    ★ 話者が断定を避ける表現（婉曲・ぼかし・控えめな主張）を使っている → 推測
    ★ 話者が事実として述べている → 確定
    ★ 話者が不確かさを明示している → 可能性
    ★ 話者が情報源が他者であることを示している → 伝聞
    ★★ 伝聞 vs 推測の判定基準（最重要）★★
    迷った時の判定キー: 「この情報は話者自身が考えたか？それとも誰かから聞いたか？」
    - 話者自身の判断・印象・経験に基づく → 推測
    - 他者から聞いた話・噂・間接的に得た情報 → 伝聞
    伝聞は推測より優先する。「断定を避けている」かつ「情報源が他者」なら → 伝聞。
    
    【日本語パターン（補助）】
    - 確定: 〜だ、〜です、〜した、〜てた、〜ていた（過去形は確定）
    - 推測: 〜と思う、〜だろう、〜んだけど（婉曲）、〜かな（自問）、〜じゃないかな
    - 可能性: 〜かも、〜かもしれない
    - 伝聞: 〜らしい、〜らしいよ、〜そうだ、〜って（文末）、〜だって、〜んだって、〜みたい（伝聞用法）
    ★ 「〜らしい」「〜らしいよ」は伝聞。推測にしない。
    
    ★★★ 最重要 ★★★
    「〜と思う」「〜と思うんだけど」「〜んじゃないかな」は【推測】。絶対に【確定】にしない。
    これらは話者が断定を避けて自分の見解として述べている表現。
    例: 「いい線いってると思うんだけど」→ 推測（断定を避けている）
    例: 「いい線いってる」→ 確定（断定している）
    入力: 「田中さんが来週持ってくるらしいよ」→ 伝聞（他者から聞いた情報）
    入力: 「田中さんが来週持ってくると思う」→ 推測（話者自身の判断）
    
    ★ 条件節は確信度を下げない
    - 「もし〜なら」「〜たら」は条件表現であり、不確実性マーカーではない
    - 確信度は主節の動詞で判定する
    - 例: 「もし必要なら、私が対応する」→ 確定（主節が断定）
    - 例: 「もし必要なら、対応するかも」→ 可能性（「かも」）

13. 固有名詞: 人名/地名/組織名/製品名のリスト
    - text: 名前
    - type: person/place/org/product
    - 読み: ひらがな名詞の場合のローマ字読み（任意）
    - 敬称: なし/さん/様/君/ちゃん/その他
      ※ 敬称なし（呼び捨て）= 身内・親しい人 → 翻訳で尊敬語不要

14. 程度: none/slight/moderate/strong/extreme
    【構造的定義】動作や状態に付与された強度修飾。
    - none: 強度修飾なし
    - slight: わずかな程度
    - moderate: 中程度
    - strong: 高い程度
    - extreme: 最大級の程度
    
    【日本語パターン（補助）】
    - slight: ちょっと、少し、やや、若干
    - moderate: 割と、まあまあ、そこそこ
    - strong: かなり、めっちゃ、すごく、とても
    - extreme: 完全に、全然（否定）、めちゃくちゃ
    
    ■ 必須ルール: 程度を示す修飾語が文中にある場合、程度を "none" にしてはならない。

15. 発話行為: この文に含まれる発話行為を配列で列挙
    【構造的定義 — 最優先で適用】
    文を構成するそれぞれの部分が、どのような行為を行っているか。
    一つの文に複数の行為が含まれる場合、全てを列挙する。
    
    【判定基準】
    - 話者が相手に行動の変更や実行を求めている部分がある → 「依頼」を含める
    - 話者が相手に行動の自制・注意を促している部分がある → 「依頼」を含める（助言・忠告も依頼）
    - 話者が情報を問うている部分がある → 「質問」を含める
    - 話者が事実を述べている部分がある → 「報告」を含める
    - 話者が自分の印象・評価を述べている部分がある → 「感想」を含める
    - 話者が非を認めている部分がある → 「謝罪」を含める
    - 話者が感謝を示している部分がある → 「感謝」を含める
    
    ★★★ 重要: 助言・忠告は「依頼」に含める ★★★
    「〜しないでね」「〜してね」「〜に気をつけて」「無理しないで」のように
    相手の行動に影響を与えようとしている発話は、たとえ命令形でなくても「依頼」。
    
    例: 「体調よくなった？無理しないでね。」→ ["質問", "依頼"]
    （「体調よくなった？」=質問 + 「無理しないでね」=依頼/助言）
    
    例: 「ごめん、今は対応できない」→ ["謝罪", "報告"]
    例: 「ありがとう、助かった」→ ["感謝", "報告"]
    ★★ 短い冒頭表現を見落とさないこと ★★
    文の先頭に1〜2語の謝罪・感謝・挨拶がある場合、それも発話行為に含める。
    短い表現ほど主文に埋もれやすいが、1単語でも立派な発話行為。
    例: 「ごめん、電車が止まってた」→ ["謝罪", "報告"]（「ごめん」=謝罪を見落とさない）
    例: 「ありがとう、助かった」→ ["感謝", "報告"]
    例: 「すまん、忘れてた」→ ["謝罪", "報告"]
    
    ★ 単一発話なら1要素（例: ["感謝"]）

16. 保持値: 翻訳で変えてはいけない具体値のリスト
    【構造的定義】変更すると文の事実的内容が変わってしまう具体的な値。
    固有名詞（13番）以外の、数値・日時・金額・数量・割合・単位。
    
    例: ["9時半", "3月15日", "50%", "3つ", "500円", "2時間"]
    ★ 人名・地名・組織名は13番（固有名詞）に入れる。ここには数値系のみ。
    ★ 該当がなければ空配列 []

17. 条件表現: 原文に含まれる因果・条件の論理構造
    【構造的定義】文中の「Aだから/ならばB」という論理関係を示す接続構造。
    翻訳でこの論理関係が消えると文の意味が変わる。
    
    【日本語パターン（補助）】
    - 条件: もし〜なら、〜たら、〜れば、〜の場合、〜しない限り
    - 因果: 〜ので、〜から、〜ため、〜で（原因）
    
    例: 「予算がちょっと厳しいので」→ ["〜ので"]
    例: 「もし時間があれば参加します」→ ["もし〜ば"]
    ★ 該当がなければ空配列 []

【出力形式】
JSONのみ（説明不要）
必須キー: 全17項目を含めること
最小例:
{"主題":"...","動作":"...","動作の意味":"...","意図":"報告","感情極性":"neutral","モダリティ":"報告","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称単数","確信度":"確定","程度":"none","発話行為":["報告"],"固有名詞":[],"保持値":[],"条件表現":[]}

【例1】
入力: 「ごんたが寝てから向かいます」
{"主題":"移動","動作":"向かう","動作の意味":"head to","意図":"報告","感情極性":"neutral","モダリティ":"報告","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称単数","確信度":"確定","程度":"none","発話行為":["報告"],"固有名詞":[{"text":"ごんた","type":"person","読み":"Gonta","敬称":"なし"}],"保持値":[],"条件表現":[]}

【例2】
入力: 「この企画、かなりいい線いってると思うんだけど。」
{"主題":"企画の評価","動作":"思う","動作の意味":"think","意図":"その他","感情極性":"positive","モダリティ":"感想","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称単数","確信度":"推測","程度":"strong","発話行為":["感想"],"固有名詞":[],"保持値":[],"条件表現":[]}
※ 「〜と思うんだけど」= 断定を避けている → 確信度は「推測」（確定ではない）
※ 「かなり」= 程度 strong

【例3】
入力: 「体調よくなった？無理しないでね。」
{"主題":"体調の回復","動作":"よくなる","動作の意味":"get better","意図":"質問","感情極性":"positive","モダリティ":"質問","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"二人称","確信度":"推測","程度":"none","発話行為":["質問","依頼"],"固有名詞":[],"保持値":[],"条件表現":[]}
※ 「体調よくなった？」= 質問、「無理しないでね」= 助言/依頼 → 発話行為は["質問","依頼"]
※ 相手を気遣う好意的な文 → 感情極性は positive

【例4】
入力: 「予算がちょっと厳しいので、もう少し削れるところを探してみます。」
{"主題":"予算の調整","動作":"探す","動作の意味":"look for","意図":"提案","感情極性":"neutral","モダリティ":"提案","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称単数","確信度":"確定","程度":"moderate","発話行為":["提案"],"固有名詞":[],"保持値":[],"条件表現":["〜ので"]}
※ 「ちょっと」= 程度 moderate（slight ではなく、「厳しい」を緩和する moderate）
※ 「〜ので」= 因果の条件表現

【例5】
入力: 「9時半に新宿駅の南口で待ち合わせしよう。」
{"主題":"待ち合わせ","動作":"待ち合わせする","動作の意味":"meet up","意図":"提案","感情極性":"neutral","モダリティ":"提案","主語":"省略","対象":"なし","目的格":"なし","願望":"なし","人称":"一人称複数","確信度":"確定","程度":"none","発話行為":["提案"],"固有名詞":[{"text":"新宿駅","type":"place","敬称":"なし"},{"text":"南口","type":"place","敬称":"なし"}],"保持値":["9時半"],"条件表現":[]}
※ 「9時半」= 数値的な具体値 → 保持値に入れる
※ 「新宿駅」「南口」= 地名 → 固有名詞に入れる
`;


/**
 * 構造情報をプロンプト用テキストに変換
 */
export function structureToPromptText(structure: ExpandedStructure, targetLang?: string, sourceLang?: string): string {
  const entityTypeMap: Record<EntityType, string> = {
    person: '人名',
    place: '地名',
    org: '組織名',
    product: '製品名'
  };

  const entities = structure.固有名詞.length > 0
    ? structure.固有名詞.map(e => {
        const typeStr = entityTypeMap[e.type];
        const readingStr = e.読み ? `、読み: ${e.読み}` : '';
        const honorificStr = e.敬称 === 'なし'
          ? '、敬称なし（身内・親しい人→尊敬語不要）'
          : e.敬称 ? `、敬称: ${e.敬称}` : '';
        return `「${e.text}」は${typeStr}${readingStr}${honorificStr}`;
      }).join('、')
    : 'なし';

  // 言語情報（渡された場合のみ追加）
  const langInfo = targetLang ? `
・翻訳の出力言語: ${targetLang}（translationフィールドは必ずこの言語で出力）
・逆翻訳の出力言語: ${sourceLang || '日本語'}（reverse_translationフィールドは必ずこの言語で出力）` : '';

  return `【構造情報】
・主語: ${structure.主語}
・動作: ${structure.動作}
・動作の意味: ${structure.動作の意味}（この意味を保持すること）
・対象: ${structure.対象}
・目的格: ${structure.目的格 || 'なし'}
・願望: ${structure.願望 || 'なし'}
・人称: ${structure.人称 || '一人称単数'}
・意図: ${structure.意図}
・感情極性: ${structure.感情極性}
・モダリティ: ${structure.モダリティ}
・確信度: ${structure.確信度}
・程度: ${structure.程度}
・発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}
・固有名詞: ${entities}${langInfo}

【この翻訳の固定値 - トーン調整で絶対に変えないこと】
- 意図: ${structure.意図}
- 確信度: ${structure.確信度}
- 感情極性: ${structure.感情極性}
- モダリティ: ${structure.モダリティ}
- 程度: ${structure.程度}
- 発話行為: ${(structure.発話行為 && structure.発話行為.length > 0) ? structure.発話行為.join('+') : 'なし'}
トーン調整で変えていいのは「口調・語彙の格式レベル・文体」のみ。
上記6つの値が変わる翻訳は不合格。

【翻訳ルール】
- 単語は変えていいが、意味は変えないこと（特に動作の意味）
- 「意図」「モダリティ」「感情極性」「確信度」「願望」「人称」を翻訳で必ず保持すること
- 敬称なしの人名は身内・親しい人なので、尊敬語を使わない（例: 寝る→sleeps、NOT: お休みになる）
- 固有名詞の読みがある場合はその読みで翻訳する
- 一般名詞（電車、車、家など）はローマ字にせず普通に翻訳する（電車→train、NOT: densha）

【意図別の制約】
- 意図=感謝 → 出力は感謝の表明であること。依頼文型にしない。
- 意図=報告 → 出力は事実の陳述であること。依頼文型にしない。
- 意図=依頼 → 出力は依頼であること。
- 意図=提案 → 出力は提案であること。

【確信度の制約】
- 確信度=可能性 → 不確実性を維持する。確実な表現に上げない。
- 確信度=確定 → 確定的な表現を維持する。不確実に下げない。

【感情極性ルール - 絶対遵守】
- 感情極性が negative / neutral の場合、positive な感情表現を追加しない
- トーンを上げることと、感情を変えることは別
- 感情極性が positive の場合、悲しみ/遺憾の要素を追加しない

【モダリティルール - 絶対遵守】
- モダリティを変えない（報告は報告、感謝は感謝、依頼は依頼）
- 報告や感謝を依頼文に変換しない

【程度ルール - 絶対遵守】
- 程度（none/slight/moderate/strong/extreme）は固定値を維持する
- トーンを上げることと、程度を強めることは別

【発話行為ルール - 絶対遵守】
- 発話行為の全要素（例: 謝罪+報告）は出力に残す

【英語出力の禁止パターン（target=enのみ）】
- 感情極性が negative / neutral の場合:
  "pleasure", "delight", "honored", "It is with great" を禁止
- モダリティが 報告 の場合（感情極性に関係なく）:
  丁寧さは形式（省略形を避ける・語彙の格式）で表現する
  発表調の前置きや、原文にない感情儀礼を追加しない
  事実報告は事実のまま簡潔に述べる
- モダリティが 報告 / 感謝 の場合:
  "I would be grateful if you could..." を禁止
  "I would appreciate it if you could..." を禁止
  "It would be an honor to receive..." を禁止
  "if you could kindly [verb]" パターンを禁止
  （依頼モダリティの時のみ許可）
- 確信度が 可能性 の場合:
  "highly likely", "extremely likely", "most likely" を禁止
  "gonna totally", "definitely going to", "certainly" を禁止
  "It is certain that", "without a doubt" を禁止
  代わりに "might / may / could / possibly / perhaps / there's a chance / it's possible that" を使う
- 感情極性が negative / neutral かつ tone=casual の場合:
  "lol", "haha", "lmao", "rofl", "hehe" を禁止
- 感情極性が negative かつ tone=polite/business の場合:
  "profound regret", "utmost solemnity", "deepest humility" を禁止

【目的格ルール - 重要】
目的格（「〜を」がついている単語）は必ず目的語(object)として翻訳する:
- 例: 目的格「君」→ 翻訳で「君」は目的語 (hold you, love you, etc.)
- ❌ 主語と目的語を入れ替えない
- ❌ 「君を抱きたい」→ "you wanna hold me" は禁止（主語と目的語が逆）
- ✓ 「君を抱きたい」→ "I want to hold you"

【願望ルール - 重要】
願望が「あり」の場合、翻訳・逆翻訳で必ず願望表現を保持する:
- 翻訳: "want to" / "hope to" / "wish to" 等を入れる
- 逆翻訳: 「〜したい」「〜たい」「〜てほしい」等を保持する
- ❌ 願望を消さない
- ❌ 「抱きたい」→「抱いてる」は禁止（願望が消えてる）
- ✓ 「抱きたい」→ "want to hold" → 「抱きたい」

【人称ルール - 絶対遵守】
人称は翻訳で必ず保持する。勝手に変更しない:
- 一人称単数 → I を使う（絶対に We に変えない）
- 一人称複数 → We を使う
- 二人称 → You を使う
- 三人称 → He/She/It/They を使う
- ❌ 人称を変えない
- ❌ 「向かいます」(一人称単数) → "We're heading" は禁止
- ✓ 「向かいます」(一人称単数) → "I'm heading"
- ❌ カジュアルトーンでも人称を変えない

【主語省略ルール - 重要】
主語が「省略」の場合、意図で判断して主語を決定:
- 意図「報告」（自分の行動）・「謝罪」→ I（一人称）
  例: 「財布忘れた」→ "I forgot my wallet"
  例: 「遅れてごめん」→ "Sorry I'm late"
- 意図「質問」・「依頼」・「命令」→ You（相手）
  例: 「怒ってる？」→ "Are you angry?"
  例: 「窓開けて」→ "Can you open the window?"
- 状況・天候の報告 → It / The + 名詞
  例: 「雨降ってる」→ "It's raining"
  例: 「電車止まってる」→ "The train stopped"

【確信度ルール - 絶対遵守】
※このルールはトーン設定に関係なく最優先で適用される
- 確信度「確定」→ 推測語・伝聞語を絶対に入れない
  ✗ 禁止: I think / I guess / maybe / probably / perhaps / or something / I suppose / it seems / apparently / I heard
  ✓ 正しい: 「遅れてごめん、電車が止まってた」→ "Sorry I'm late, the train stopped"
  ✓ 正しい: 「雨が降ってる」→ "It's raining" (NOT: "I think it's raining")
- 確信度「推測」→ I think / probably / I guess を使う（自分の考え）
  例: 「雨が降ると思う」→ "I think it's raining" / "It's probably raining"
- 確信度「可能性」→ might / maybe / could / perhaps を使う
  例: 「雨が降るかも」→ "It might rain" / "Maybe it's raining"
- 確信度「希望」→ I hope / I wish を使う
  例: 「雨が降ってほしい」→ "I hope it rains"
- 確信度「伝聞」→ 以下のどれか1つだけを使う（複数使わない！）
  - "I heard ..." または "Apparently, ..." または "They say ..."
  ✗ 禁止: "I heard that ... apparently ..."（二重は禁止）
  ✗ 禁止: I think（これは推測であり伝聞ではない）
  ★ target=en の場合、"I heard / apparently / they say / reportedly / supposedly" のいずれかを必ず含める
  ★ "supposed to" のみで伝聞を表現するのは禁止
  例: 「雄太がクビになったらしい」→ "I heard Yuta got fired" または "Apparently Yuta got fired"

【重要】確信度「確定」の場合、以下の表現は一切使用禁止:
- I think / I guess / I suppose
- maybe / probably / perhaps / possibly
- or something / or whatever / or anything
- it seems / apparently / I heard / they say
- kinda / sorta + 推測的な表現

【重要】確信度「伝聞」と「推測」の違い:
- 伝聞（らしい/そうだ/って）= 誰かから聞いた → I heard / apparently
- 推測（と思う/だろう）= 自分の考え → I think / probably

【条件節ルール - 絶対遵守】
- 原文に「もし / 〜たら / 〜なら / 〜れば」がある場合、条件節を削除しない
- target=en の場合、if/when を必ず含める
- ❌ 「電車が止まってたら」→ "The train stopped"（条件欠落）は禁止`;

}

// トーンスタイル×レベルに応じた指示を生成
export function getToneStyleInstruction(tone: string | undefined, toneLevel: number, customTone?: string): string {
  // カスタムトーンは段階無視で常にLv5全力 → 最初に処理
  if (tone === 'custom') {
    // プリセット別に分岐（混同防止のため個別に返す）
    if (customTone === 'オジサン構文') {
      return `【オジサン構文 - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 呼びかけを1回（例：〇〇ちゃん/〇〇さん/君〜）
- 絵文字を3〜8個（😊😅✨💦👍💓❄️😂）- 翻訳・逆翻訳の両方に必須
- 「…」を2回以上
- 改行を1回以上入れて"手紙感"を出す
- 気遣いフレーズを1つ（例：無理しないでね/疲れてない？/体調大丈夫？）
- 最後に柔らかい締め（例：またね😊/返信待ってるね✨）
- 「〜かな？😅」または「〜だよ😊」を最低1回
- 軽い自分語りを1回（例：昔は〜/おじさんも〜）
- 感嘆符・疑問符を合計3回以上（！！/！？/？？）
- 英語にも絵文字 例: "Nice outfit! 😊✨ Are you doing okay? 💦"

【絶対禁止】
- 絵文字ゼロ
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉
- 堅い敬語`;
    }

    if (customTone === '限界オタク') {
      return `【限界オタク - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 冒頭に感情トリガー（例：え、待って / 無理 / は？好き）を1つ以上
- 「？？？？？」か「！！！！！！」を必ず1回
- 「！」「？」「……」を合計3回以上
- 短文連打を1回（例：待って。無理。好き。ほんとに。）
- 括弧リアクションを1回（例：（情緒）（死）（助けて）（無理））
- 結論系の〆を1回（例：結論：優勝 / はい神 / つまり：尊い / 解散）
- 絵文字を1〜4個（🙏✨🔥😭😇）
- 擬音を1回（ﾋｪ… / ｱｯ / ﾝ゛ｯ 等）
- 自己崩壊ワード（情緒 / 脳が追いつかん / 語彙死んだ / 助けて / 好きすぎて無理）
- 英語も感情爆発（I CAN'T... TOO PRECIOUS... HELP... wait what??? / OMG??? / literally dying）

【絶対禁止】
- 冷静な表現
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉
- 堅い敬語`;
    }

    if (customTone === '赤ちゃん言葉') {
      return `【赤ちゃん言葉 - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 語尾を赤ちゃん化を最低2箇所（「です」→「でしゅ」、「ます」→「ましゅ」、「だよ」→「でしゅよ〜」）
- 擬音/感情語を最低1つ（えーん / えへへ / むぎゅ / ぷんぷん / ねむねむ / うぇぇ）
- 反復を最低1回（すきすき / おいちいおいちい / してほちい...してほちいの）
- 短文を最低1回（やだ。むり。ねむい。）
- 括弧感情を1回（（えへへ）（ぷんぷん）（しょんぼり）（どきどき））
- 赤ちゃん結論で〆る（おわりなの。/ がんばったの。/ えらいの。）
- 音の幼児化：「すごい」→「しゅごい」、「して」→「してほちい」、「だめ」→「だめぇ」
- 「しゅ/でしゅ/ましゅ/ほちい/よちよち」系を合計3回以上
- 英語も幼児っぽく（pwease / sowwy / vewy nice / dis is so good）

【絶対禁止】
- 大人っぽい硬い表現
- オタク語（情緒、優勝、尊い等）
- ギャル語（まじ、やばい等）`;
    }

    if (customTone === 'ギャル') {
      return `【ギャル - Lv5（最大誇張）】
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【チェックリスト - 全て満たすこと】
- 冒頭に導入フレーズを1つ（例：え、まって / てか / それな）
- 「え、まって」を必ず1回入れる
- 強調語を2つ以上（例：まじ / ガチ / 超 / 鬼 / えぐい / やば）
- 相槌・共感を1回（例：わかる / それな / ほんとそれ）
- 記号を合計3回以上使う（！/？/w/笑）
- 絵文字を2〜6個入れる（例：💅✨🥺💕🔥）
- 「〜すぎ」「〜案件」「〜しか勝たん」のいずれかを必ず1回
- 短文を1回連打（例：無理。好き。優勝。）
- 最後は軽い結論で締める（例：結論：優勝 / 〜しか勝たん / 最高じゃん？）
- 英語もギャルっぽく（like, totally, omg, so cute, literally, vibes, slay）

【絶対禁止】
- 堅い表現・敬語
- 「でしゅ」「ましゅ」「ほちい」等の赤ちゃん言葉`;
    }

    // 自由入力の場合（プリセット以外）
    return `【カスタムトーン: ${customTone || '指定なし'}】
■ 絶対ルール: このトーンは「Lv5（最大誇張）」で表現すること。控えめは禁止。
■ 翻訳(英語)と逆翻訳(日本語)の両方にスタイルを適用すること。

【ヒント - 自由入力の例】
- ラッパー風なら: 韻を踏む、ライム、フロウ、Yo、Check it、韻で繋げる
- 武士風なら: 〜でござる、〜なり、拙者、某、〜いたす
- お嬢様風なら: 〜ですわ、〜ですの、ごきげんよう、お〜になる

ユーザー指定「${customTone || ''}」の特徴を最大限に誇張して表現すること`;
  }

  // 0-24%: 原文そのまま（カスタム以外）
  if (toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】
- 原文の意味をそのまま自然に翻訳
- 特別なスタイル変更なし`;
  }

  // トーンが選択されていない場合
  if (!tone) {
    return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }

  // 強度の説明
  let intensityLabel = '';
  if (toneLevel < 50) {
    intensityLabel = '多少';
  } else if (toneLevel < 75) {
    intensityLabel = '';
  } else if (toneLevel < 100) {
    intensityLabel = '結構';
  } else {
    intensityLabel = 'めちゃくちゃ';
  }

  // スタイル別の指示
  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: ${toneLevel}% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形（gonna, wanna, gotta）
- 文法より勢い重視

【カジュアル表現の例（確信度「確定」の場合）】
✓ "Sorry I'm late, the train stopped"（遅れてごめん、電車が止まってた）
✓ "My bad, train was down"（超カジュアル版）
✓ "Ugh, train died on me"（勢い重視版）

【重要】確信度ルールは絶対変更しない:
- 確信度「確定」→ 推測語一切なし（I think禁止）
- カジュアルでも「確定」は「確定」のまま
- 勢い重視 ≠ 曖昧さを追加`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${toneLevel < 50 ? '軽く' : toneLevel < 75 ? '標準的に' : 'しっかり'}くだけた表現に
- 翻訳先の言語に合わせたカジュアル表現を使う
- 英語なら省略形OK（I'm, don't, can't）
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `〖トーンレベル: ${toneLevel}% - 最高ビジネス〗
- Highly professional and formal business tone. Maximum professionalism through structure and precision:
- "I would like to formally request..." / "Please be advised that..." / "For your consideration..."
- "At your earliest convenience..." / "I would appreciate your guidance on..."
- Maintain clarity above all - formality should never obscure meaning
- Precision and directness are more professional than ornate language
- Do NOT use: wherein, hereby, hitherto, forthwith, foreseen, convene, requisite
- Do NOT rephrase the core action/meaning to sound more "business" - keep the original meaning intact
- Good: "I regret that I must decline." / Bad: "I believe it would be beneficial to establish an alternative arrangement."`;
      } else if (toneLevel >= 75) {
        return `〖トーンレベル: ${toneLevel}% - かなりのビジネス表現〗
- Professional business tone. Clear, efficient, and courteous:
- "I'd like to suggest..." / "Would it be possible to..." / "I wanted to follow up on..."
- "Please let me know if..." / "I'd appreciate your input on..."
- Professional = clear and direct language with appropriate courtesy markers.
- Do NOT use: wherein, hereby, hitherto, endeavor, forthwith, convene
- Good: "Could we meet at 9:30?" / Bad: "We propose convening at the designated hour."`;
      } else if (toneLevel >= 50) {
        return `〖トーンレベル: ${toneLevel}% - 標準のビジネス表現〗
- 省略形は避ける
- 丁寧でプロフェッショナル
- 過度に改まった儀礼表現を追加しない
- 文は事実中心で簡潔に`;
      } else {
        return `〖トーンレベル: ${toneLevel}% - 軽めビジネス〗
- 丁寧だが堅すぎない
- 事実中心で簡潔`;
      }

    case 'formal':
      if (toneLevel >= 100) {
        return `〖トーンレベル: ${toneLevel}% - 最高丁寧〗
- Very polite and respectful tone. Maximize courtesy through sentence structure, not vocabulary complexity:
- "I would be most grateful if..." / "Would it be possible to..." / "I sincerely appreciate..."
- "If it wouldn't be too much trouble..." / "I hope you don't mind my asking..."
- Layer polite structures: hedging + gratitude + softening
- Use warm, clear language - never cold or bureaucratic
- Do NOT use: wherein, hereby, hitherto, forthwith, convene, requisite, foreseen
- Good: "I'd be very grateful if you could help." / Bad: "I would be most obliged if you could render assistance."`;
      } else if (toneLevel >= 75) {
        return `〖トーンレベル: ${toneLevel}% - 強め丁寧〗
- Polite, considerate tone. Use polite sentence patterns rather than formal vocabulary:
- "I was wondering if..." / "Would you mind..." / "I'd appreciate it if..."
- "It seems that..." / "I believe..." / "If I may..."
- Use standard vocabulary with polite framing - avoid archaic or overly formal words
- Do NOT use: wherein, hereby, hitherto, endeavor, forthwith, convene
- Good: "Could you send it to me?" / Bad: "Might I be able to receive it?"`;
      } else if (toneLevel >= 50) {
        return `〖トーンレベル: ${toneLevel}% - 標準丁寧〗
- 丁寧な語彙と語順
- 過剰な儀礼・発表調は避ける`;
      } else {
        return `〖トーンレベル: ${toneLevel}% - 軽め丁寧〗
- シンプルに丁寧
- 事実中心`;
      }

    default:
      return `【トーンレベル: ${toneLevel}%】
- 原文の意味をそのまま自然に翻訳`;
  }
}

export function getFullDifferenceInstruction(
  toneLevel: number,
  previousTranslation?: string,
  previousLevel?: number,
  tone?: string
): string {
  const isBusinessOrFormal = tone === 'business' || tone === 'formal';

  if (!previousTranslation) {
    if (toneLevel === 50) {
      return `【差分推奨】
- 25%の出力と明確に差を出す（意味は変えない）
- 語彙・構文のトーンを段階的に変える
- 意図・確信度・感情極性は元のまま固定`;
    }
    if (toneLevel === 75 || toneLevel === 100) {
      return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
- ${previousLevel ?? 50}%の出力と同一/ほぼ同一は禁止
- 語彙・構文で差を出す（意味は変えない）
- 意図・確信度・感情極性は元のまま固定`;
    }
    return '';
  }

  return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
前レベル(${previousLevel ?? 0}%): "${previousTranslation}"
- 上記と同一/ほぼ同一は禁止
- 語彙・構文で差を出す（意味は変えない）
- 意図・確信度・感情極性は元のまま固定`;
}

// トーン指示を生成
export function getToneInstruction(options: TranslateOptions): string {
  const { tone, toneLevel = 0, customTone } = options;

  if (!tone || toneLevel < 25) {
    return `【トーンレベル: ${toneLevel}% - 原文そのまま】自然に翻訳。スタイル変更なし。`;
  }

  const intensityMap: Record<string, [string, string]> = {
    '25': ['多少', '軽く'],
    '50': ['', '標準的に'],
    '75': ['結構', 'しっかり'],
    '100': ['めちゃくちゃ', '最大限に'],
  };

  const bucket = toneLevel < 50 ? '25' : toneLevel < 75 ? '50' : toneLevel < 100 ? '75' : '100';
  const [intensityLabel, intensityDesc] = intensityMap[bucket];

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 省略形を積極的に使用
- 文法より勢い重視
- 意味・意図・確信度は絶対に変えない`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${intensityDesc}くだけた表現に
- 省略形OK
- 親しみやすいトーン
- 意味・意図・確信度は絶対に変えない`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス敬語
- 省略形は一切使わない
- 格式高く丁重な表現
- 意味・意図・確信度は絶対に変えない
- 報告は報告のまま、感謝は感謝のまま（依頼に変換しない）`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}ビジネス】
- ${intensityDesc}ビジネスライクに
- 省略形は避ける
- プロフェッショナルなトーン
- 意味・意図・確信度は絶対に変えない`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃ丁寧（最大級の敬語・謙譲語）】
- 最上級の敬意を示す表現
- 謙譲語・尊敬語を最大限に使用
- 格式高く丁重
- 意味・意図・確信度は絶対に変えない
- 報告は報告のまま、感謝は感謝のまま（依頼に変換しない）`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}丁寧】
- ${intensityDesc}丁寧な表現に
- 敬意を込めた言い回し
- 礼儀正しいトーン
- 意味・意図・確信度は絶対に変えない`;

    case 'custom':
      return `【カスタムトーン: "${customTone || ''}" FULL POWER】
- 段階は無視して常に全力で表現
- 意味は絶対に変えない`;

    default:
      return `【トーンレベル: ${toneLevel}%】自然に翻訳。`;
  }
}

// 2026-02-02 多言語バグ修正v2: targetLangを追加
export function getReverseTranslationInstruction(
  sourceLang: string,
  targetLang: string,
  _toneLevel: number,  // 新方式では未使用（英語側でトーン調整するため）
  tone?: string,
  _customTone?: string  // 新方式では未使用
): string {
  // 日本語以外が原文の場合
  if (sourceLang !== '日本語') {
    return `【逆翻訳 - 絶対ルール】
- reverse_translation は必ず ${sourceLang} で出力すること
- ${sourceLang}以外の言語は絶対に使わない
- トーン調整後の${targetLang}を${sourceLang}に訳す
- 翻訳先言語（${targetLang}）を逆翻訳に混ぜない`;
  }

  // 日本語が原文の場合：敬語かどうかだけ指定
  // ※英語翻訳でトーン調整済みなので、そのニュアンスを日本語に反映する
  const usePolite = tone === 'business' || tone === 'formal';

  return `【逆翻訳】
- reverse_translation は日本語で出力
- トーン調整後の翻訳を${usePolite ? '敬語で' : '敬語を使わず'}日本語に訳す
- トーン調整で追加された表現の差分を必ず反映すること（各パーセンテージ間の逆翻訳が同じトーンにならないように）
- 二重敬語は禁止（例: ×おっしゃられる ×ご覧になられる ×お召し上がりになられる）
- 人名に敬称を勝手に追加しない（原文で敬称なし→逆翻訳でも敬称なし。例:「ごんた」→「ごんた様」❌）
${usePolite ? '- 原文が敬語でなくても、必ず敬語（です/ます/ございます）で出力すること' : ''}`;
}

export function getToneStyleForJapanese(tone: string, toneLevel: number, customTone?: string): string {
  if (tone === 'custom' && customTone) {
    return `「${customTone}」スタイル`;
  }

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) return '超カジュアル（めっちゃ、マジ、〜よ！等）';
      if (toneLevel >= 50) return 'カジュアル（だね、だよ、してる等）';
      return 'やや砕けた表現';

    case 'business':
      if (toneLevel >= 100) return '最高ビジネス敬語（申し上げます、賜りますよう等）';
      if (toneLevel >= 50) return 'ビジネス敬語（いたします、ございます等）';
      return 'やや丁寧なビジネス表現';

    case 'formal':
      if (toneLevel >= 100) return '最大敬語（申し上げる所存でございます等）';
      if (toneLevel >= 50) return '丁寧敬語（させていただきます等）';
      return 'やや丁寧な表現';

    default:
      return 'そのまま';
  }
}
