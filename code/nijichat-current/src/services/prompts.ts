// プロンプト定数・ルール生成関数（groq.tsから分離）
// v2: 6次元全体地図ベースに再設計
// 哲学:
//   - 構造フィールド制御 > ルール追加（箱が明確ならルール不要）
//   - 統一設計 > 散らばったレイヤー追加
//   - 禁止ルールは避ける（やるべきことを指示する）
//   - プロンプトは日本語統一
//   - 定義は言語横断的に

import type { ExpandedStructure, TranslateOptions } from './types';

// トーン調整の境界定義（構造フィールドとの重複なし。トーンが何を変えていいかだけ定義）
export const TONE_BOUNDARY_RULES = `
【トーン調整の境界】
- トーンは口調のみ変更する。構造情報の値はすべて保持する
- 変えていいのは「語彙の格式レベル・文体・丁寧さ」のみ
- 名詞は同カテゴリ内の言い換えのみ許容する`;

// PARTIAL用システムプロンプト
export const PARTIAL_SYSTEM_PROMPT = `あなたはNijiLingoのトーン調整エンジンです。
既存の翻訳の語彙・文体だけを調整します。既存の翻訳をベースに編集すること。

【最優先】構造情報に従うこと
- 以下のuserPromptに【】で囲まれた構造フィールドが含まれる
- 全6次元の構造値は絶対値 — トーンレベルに関係なくそのまま反映すること
- 格構造が文の骨格。構造フィールドに記載された情報のみ反映する

【6次元の構造値 — すべて保持】
Ⅰ. 命題的内容: 格構造、動作、動作の意味、極性
Ⅱ. 発話行為: 表現類型、発話行為
Ⅲ. モダリティ: 認識的モダリティ、証拠性、義務的モダリティ、説明のモダリティ、願望
Ⅳ. スタンス: 感情（極性+種類）、評価態度（評価+対象）、程度
Ⅴ. 対人的伝達: 人称、伝達態度
Ⅵ. テクスト: 固有名詞、保持値、条件表現

【トーン調整の原則】
- 変えていいのは：語彙の格式レベル、文体、丁寧さ、短縮形の有無
- Seed(0%)が構造値を正しく表現している。トーン調整はその表面だけを変える

【出力】
JSON形式のみ（マークダウン不可）: {"new_translation":"...","reverse_translation":"...(原文の言語)","risk":"low|med|high"}`;

// 言語固有ルール（条件出力版）
export function getLanguageSpecificRules(targetLang: string, hasEntities: boolean = false): string {
  const parts: string[] = [];

  // 固有名詞がある時のみ人名・敬称ルール
  if (hasEntities) {
    parts.push(`
【人名の翻訳ルール】
- 人名は原文の表記を尊重し、翻訳先言語の慣習に従って表記する
- 逆翻訳では原文の表記に戻す
- 人名を一般名詞と区別する

【敬称のルール】
- 原文の敬称の有無をそのまま保持する
- 原文で敬称あり → 翻訳先言語で適切な敬称をつける`);
  }

  // 英語のみ追加ルール（過去のFAILから確立されたもの）
  if (targetLang === '英語') {
    parts.push(`
【英語固有ルール】
- 二人称代名詞は "you" と訳す
- 服の一般語は clothes/outfit を使う（"dress" はドレス/ワンピースが明示された時だけ）`);
  }

  return parts.join('');
}

export const EXPANDED_STRUCTURE_PROMPT = `あなたは多言語対応の構造分析アシスタントです。
入力文を「翻訳で保持すべき意味骨格」に分解してJSONで返してください。

判定原則:
- 構造的定義を最優先する
- 典型パターンは補助としてのみ使う
- 省略情報は文脈から復元する
- 迷ったら「翻訳で意味が変わるかどうか」で判断する

【出力項目（19項目・6次元）】

═══ Ⅰ. 命題的内容（何が起きているか） ═══
1. 格構造（14スロット）
2. 動作
3. 動作の意味
4. 極性

═══ Ⅱ. 発話行為（何をしているか） ═══
5. 表現類型
6. 発話行為

═══ Ⅲ. モダリティ（どう判断しているか） ═══
7. 認識的モダリティ
8. 証拠性
9. 義務的モダリティ
10. 説明のモダリティ
11. 願望

═══ Ⅳ. スタンス（どういう態度か） ═══
12. 感情
13. 評価態度
14. 程度

═══ Ⅴ. 対人的伝達（どう伝えているか） ═══
15. 人称
16. 伝達態度

═══ Ⅵ. テクスト（どう構成しているか） ═══
17. 固有名詞
18. 保持値
19. 条件表現

============================================================
Ⅰ. 命題的内容 — 何が起きているか
============================================================

【格構造（最重要）— 文の骨格】
次の14キーを必ず含めること。値が無いときは必ず「なし」。
- 誰が: 動作主体（省略なら復元する）
- 何を: 動作対象
- 誰に: 相手・受益者・伝達先
- 誰と: 共同行動の相手
- なんて: 引用内容（思考・発言の中身）
- どこに: 場所の着点・存在地点
- どこで: 動作場所
- どこへ: 方向
- どこから: 場所の起点
- どこまで: 場所の終点
- いつ: 時点
- いつから: 時間の起点
- いつまで: 時間の終点
- どうやって: 手段・方法

【格構造の厳密ルール】
- 場所と時間を区別する（時間表現は「いつ」系、場所表現は「どこ」系）
- 聞き手への直接的な伝達がある場合は「誰に」に聞き手を復元する
- 引用は必ず「なんて」に入れる
- 手段は必ず「どうやって」に入れる（理由と区別する）
- 翻訳に不要でも格は保持する（意味骨格のため）

【動作】何をする/どうなる
【動作の意味】動作の核心的意味を英語の基本動詞句で表現（go/come/give up/help など）

【極性 — 文法的な肯定/否定】
- 肯定 / 否定
- 否定辞・否定構文がある文 → 否定
- これは感情の方向（Ⅳ）とは別。文法構造の話

============================================================
Ⅱ. 発話行為 — 何をしているか
============================================================

【表現類型 — 文がどの文法形式か】
- 平叙 / 疑問 / 命令 / 感嘆 / 祈願
- 文法形式で判断する。語用論的な意味ではない
- 疑問形式で依頼を表す文（間接発話行為）→ 表現類型は「疑問」

【発話行為 — その文で何をしているか（語用論的機能）】
- 配列で出力。複合文なら全行為を列挙
- 値: 報告 / 依頼 / 質問 / 感謝 / 謝罪 / 提案 / 確認 / 命令 / 感想 / 称賛 / 非難 / 約束 / 警告 / その他
- 文頭の謝罪・感謝表現も含める

【表現類型と発話行為の関係】
- この2つは独立した別次元
- 表現類型は文法形式、発話行為は語用論的機能
- 同じ表現類型でも発話行為は異なりうる

============================================================
Ⅲ. モダリティ — どう判断しているか
============================================================

【認識的モダリティ — どれくらい確かか】
- 確定 / 推測 / 可能性
- 確定: 事実として断言
- 推測: 個人的判断
- 可能性: ありえるかもしれない程度

【証拠性 — 情報源はどこか】
- 直接経験 / 推論 / 伝聞
- 直接経験: 自分で見た・体験した（デフォルト）
- 推論: 状況から推し量った
- 伝聞: 他者からの情報

【認識的モダリティと証拠性の共起制約】
- 伝聞の場合 → 認識的モダリティは「推測」または「可能性」（他者の情報は断言にならない）
- 直接経験の場合 → 認識的モダリティは「確定」「推測」「可能性」いずれも可

【義務的モダリティ — どうすべきか】
- なし / 義務 / 許可 / 禁止 / 能力
- 義務: しなければならない
- 許可: してよい
- 禁止: してはいけない
- 能力: できる

【説明のモダリティ — なぜ言っているか】
- なし / 背景説明 / 当然の帰結
- 背景説明: 理由・事情がある含意を伴う発話
- 当然の帰結: 状況から当然そうなるという含意を伴う発話

【願望】
- あり / なし
- 話し手の希望・望みが含まれている → あり

============================================================
Ⅳ. スタンス — どういう態度か
============================================================

【感情 — 話し手の内面の気持ち】
オブジェクトで出力: { 極性: "...", 種類: "..." }
- 極性: 肯定的 / 否定的 / 中立
- 種類: 喜び / 安心 / 期待 / 感謝 / 満足 / 悲しみ / 不安 / 怒り / 後悔 / 驚き / 不満 / なし
- 中立 の場合 → 種類は「なし」

【感情は内面の気持ち、発話行為は言語行動 — 区別する】
- 感謝を述べている文 → 感情: {極性: 肯定的, 種類: 感謝} + 発話行為: ["感謝"]
- 感謝の気持ちを報告している文 → 感情: {極性: 肯定的, 種類: 感謝} + 発話行為: ["報告"]

【評価態度 — 対象をどう評価しているか】
オブジェクトで出力: { 評価: "...", 対象: "..." }
- 評価: なし / 肯定的評価 / 否定的評価
- 対象: 何を評価しているか（文中の要素）
- 評価がない文は { 評価: "なし", 対象: "なし" }

【程度 — どれくらいか】
- なし / わずか / 中程度 / 強い / 極端
- なし: 程度表現なし
- わずか: ほんの少し
- 中程度: そこそこ
- 強い: かなり
- 極端: 極めて

============================================================
Ⅴ. 対人的伝達 — どう伝えているか
============================================================

【人称】
- 一人称単数 / 一人称複数 / 二人称 / 三人称

【伝達態度 — 聞き手にどう届けているか】
- なし / 主張 / 共有確認 / 緩和
- 主張: 新情報を聞き手に押し出す
- 共有確認: 聞き手も知っていることを確認する
- 緩和: 断定を和らげ、含みを持たせる
- 明確な伝達態度の標識がない場合 → なし

============================================================
Ⅵ. テクスト — どう構成しているか
============================================================

【固有名詞】[{text, type, 敬称}]
- type: 人名 / 地名 / 組織名 / 製品名
- 敬称: あれば記載、なければ「なし」

【保持値】数値・日時・金額・数量など絶対保持値（固有名詞は除く）

【条件表現】条件/因果の論理マーカー

============================================================
出力JSON形式（説明文は不要）
============================================================
{
  "格構造": {
    "誰が": "...",
    "何を": "...",
    "誰に": "...",
    "誰と": "...",
    "なんて": "...",
    "どこに": "...",
    "どこで": "...",
    "どこへ": "...",
    "どこから": "...",
    "どこまで": "...",
    "いつ": "...",
    "いつから": "...",
    "いつまで": "...",
    "どうやって": "..."
  },
  "動作": "...",
  "動作の意味": "...",
  "極性": "肯定",
  "表現類型": "平叙",
  "発話行為": ["報告"],
  "認識的モダリティ": "確定",
  "証拠性": "直接経験",
  "義務的モダリティ": "なし",
  "説明のモダリティ": "なし",
  "願望": "なし",
  "感情": { "極性": "中立", "種類": "なし" },
  "評価態度": { "評価": "なし", "対象": "なし" },
  "程度": "なし",
  "人称": "一人称単数",
  "伝達態度": "なし",
  "固有名詞": [],
  "保持値": [],
  "条件表現": []
}
`;


/**
 * 構造情報をプロンプト用テキストに変換（v2: 6次元対応・言語横断）
 * 哲学:
 *   - 冒頭宣言でデフォルト値と原則を1回だけ宣言
 *   - 出てるフィールド＝全部注意点。出てないフィールド＝デフォルトで固定
 *   - テクスト情報は値がある時だけ出す
 *   - フィールド値に指示を埋め込まない
 */
export function structureToPromptText(structure: ExpandedStructure, targetLang?: string, sourceLang?: string): string {

  // ═══ 冒頭宣言 ═══

  const langLine = targetLang
    ? `出力言語: translation=${targetLang} / reverse_translation=${sourceLang || '日本語'}`
    : '';

  const header = `【構造情報 — 翻訳で保持すべき全情報】
以下に記載されたフィールドは保持すべき絶対条件。トーンレベルに関係なく保持すること。
記載のないフィールドはデフォルト値で固定（デフォルト: 平叙/確定/直接経験/中立/一人称単数）。
動作の意味は翻訳の核心。単語は変えていいが意味は保持すること。
${langLine}`;

  // ═══ Ⅰ. 命題的内容 ═══

  const caseEntries = Object.entries(structure.格構造 || {})
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0 && value.trim() !== 'なし');
  const caseInfoText = caseEntries.length > 0
    ? caseEntries.map(([key, value]) => `・${key}: ${value}`).join('\n')
    : '・（指定なし）';

  // ═══ 注意フィールドの収集（デフォルト値はスキップ） ═══

  const fields: string[] = [];

  // Ⅰ. 極性（デフォルト: 肯定）
  if (structure.極性 === '否定') {
    fields.push(`【極性: 否定 — 否定構文を保持する】`);
  }

  // Ⅱ. 発話行為（デフォルト: 平叙, 報告）
  const expressionTypeMap: Record<string, string> = {
    疑問: '疑問 — 問いかけの形をした文',
    命令: '命令 — 行動を促す文',
    感嘆: '感嘆 — 驚きや感動を表す文',
    祈願: '祈願 — 願いを表す文',
  };
  const expressionType = structure.表現類型 || '平叙';
  if (expressionType !== '平叙' && expressionTypeMap[expressionType]) {
    fields.push(`【表現類型: ${expressionTypeMap[expressionType]}】`);
  }

  const speechActs = structure.発話行為 && structure.発話行為.length > 0
    ? structure.発話行為 : ['報告'];
  const isDefaultSpeechAct = speechActs.length === 1 && speechActs[0] === '報告';
  if (!isDefaultSpeechAct) {
    fields.push(`【発話行為: ${speechActs.join('+')}】`);
  }

  // Ⅲ. モダリティ（デフォルト: 確定, 直接経験, なし, なし, なし）
  const epistemicValue = structure.認識的モダリティ || '確定';
  if (epistemicValue !== '確定') {
    const epistemicMap: Record<string, string> = {
      推測: '推測 — 個人的にそう思っている',
      可能性: '可能性 — ありえる、かもしれない',
    };
    if (epistemicMap[epistemicValue]) fields.push(`【認識的モダリティ: ${epistemicMap[epistemicValue]}】`);
  }

  const evidentialityValue = structure.証拠性 || '直接経験';
  if (evidentialityValue !== '直接経験') {
    const evidentialityMap: Record<string, string> = {
      推論: '推論 — 状況から推し量った',
      伝聞: '伝聞 — 他者からの情報、自分では未確認',
    };
    if (evidentialityMap[evidentialityValue]) fields.push(`【証拠性: ${evidentialityMap[evidentialityValue]}】`);
  }

  const deonticValue = structure.義務的モダリティ || 'なし';
  if (deonticValue !== 'なし') {
    const deonticMap: Record<string, string> = {
      義務: '義務 — しなければならない', 許可: '許可 — してよい',
      禁止: '禁止 — してはいけない', 能力: '能力 — できる',
    };
    if (deonticMap[deonticValue]) fields.push(`【義務的モダリティ: ${deonticMap[deonticValue]}】`);
  }

  const explanatoryValue = structure.説明のモダリティ || 'なし';
  if (explanatoryValue !== 'なし') {
    const explanatoryMap: Record<string, string> = {
      背景説明: '背景説明 — 理由・事情がある含意を伴う',
      当然の帰結: '当然の帰結 — 状況から当然そうなる含意を伴う',
    };
    if (explanatoryMap[explanatoryValue]) fields.push(`【説明のモダリティ: ${explanatoryMap[explanatoryValue]}】`);
  }

  if (structure.願望 === 'あり') {
    fields.push('【願望: あり — 話し手の希望・望み】');
  }

  // Ⅳ. スタンス（デフォルト: 中立/なし, なし/なし, なし）
  const emotion = structure.感情 || { 極性: '中立', 種類: 'なし' };
  if (emotion.極性 !== '中立') {
    const polarityLabel = emotion.極性 === '肯定的' ? '肯定的 — 前向きな気持ち' : '否定的 — 後ろ向きな気持ち';
    const typeStr = emotion.種類 !== 'なし' ? `、種類: ${emotion.種類}` : '';
    fields.push(`【感情: ${polarityLabel}${typeStr}】`);
  }

  const evaluation = structure.評価態度 || { 評価: 'なし', 対象: 'なし' };
  if (evaluation.評価 !== 'なし') {
    fields.push(`【評価態度: ${evaluation.評価}、対象: ${evaluation.対象}】`);
  }

  const degree = structure.程度 || 'なし';
  if (degree !== 'なし') {
    const degreeMap: Record<string, string> = {
      わずか: 'わずか — ほんの少し', 中程度: '中程度 — そこそこ',
      強い: '強い — かなり', 極端: '極端 — 極めて',
    };
    if (degreeMap[degree]) fields.push(`【程度: ${degreeMap[degree]}】`);
  }

  // Ⅴ. 対人的伝達（デフォルト: 一人称単数, なし）
  const personKey = structure.人称 || '一人称単数';
  if (personKey !== '一人称単数') {
    const personMap: Record<string, string> = {
      一人称複数: '一人称複数 — 話し手を含む複数',
      二人称: '二人称 — 聞き手について',
      三人称: '三人称 — 第三者について',
    };
    if (personMap[personKey]) fields.push(`【人称: ${personMap[personKey]}】`);
  }

  const communicativeValue = structure.伝達態度 || 'なし';
  if (communicativeValue !== 'なし') {
    const communicativeMap: Record<string, string> = {
      主張: '主張 — 新情報を聞き手に押し出している',
      共有確認: '共有確認 — 聞き手も知っていることを確認している',
      緩和: '緩和 — 断定を和らげ、含みを持たせている',
    };
    if (communicativeMap[communicativeValue]) fields.push(`【伝達態度: ${communicativeMap[communicativeValue]}】`);
  }

  const fieldsBlock = fields.length > 0 ? `\n${fields.join('\n')}\n` : '';

  // ═══ テクスト情報（値がある項目のみ） ═══

  const textLines: string[] = [];
  textLines.push(`・動作: ${structure.動作}`);
  textLines.push(`・動作の意味: ${structure.動作の意味}`);

  if (structure.固有名詞.length > 0) {
    const entities = structure.固有名詞.map(e => {
      const readingStr = e.読み ? `、読み: ${e.読み}` : '';
      const honorificStr = e.敬称 === 'なし'
        ? '、敬称なし（親しい関係→翻訳先でも同等の距離感を保つ）'
        : e.敬称 ? `、敬称: ${e.敬称}` : '';
      return `「${e.text}」は${e.type}${readingStr}${honorificStr}`;
    }).join('、');
    textLines.push(`・固有名詞: ${entities}`);
  }

  if (structure.保持値 && structure.保持値.length > 0) {
    textLines.push(`・保持値: ${structure.保持値.join(', ')}`);
  }

  if (structure.条件表現 && structure.条件表現.length > 0) {
    textLines.push(`・条件表現: ${structure.条件表現.join(', ')}`);
  }

  // ═══ 最終出力 ═══

  return `${header}

【格構造（文の骨格）】
${caseInfoText}
${fieldsBlock}
【テクスト情報】
${textLines.join('\n')}`;
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
- 25%の出力と明確に差を出す（意味は保持する）
- 語彙・構文のトーンを段階的に変える
- 6次元の構造値は元のまま固定`;
    }
    if (toneLevel === 75 || toneLevel === 100) {
      return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
- ${previousLevel ?? 50}%の出力と明確に差をつける
- 語彙・構文で差を出す（意味は保持する）
- 6次元の構造値は元のまま固定`;
    }
    return '';
  }

  return `【差分必須${isBusinessOrFormal ? ' - ビジネス/フォーマル' : ''}】
前レベル(${previousLevel ?? 0}%): "${previousTranslation}"
- 上記と明確に差をつける
- 語彙・構文で差を出す（意味は保持する）
- 6次元の構造値は元のまま固定`;
}

// トーン指示を生成
export function getToneInstruction(options: TranslateOptions): string {
  const { tone, toneLevel = 0, customTone, targetLang } = options;

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

  // 翻訳先が日本語の場合のみ敬語に言及
  const isTargetJapanese = targetLang === '日本語';

  switch (tone) {
    case 'casual':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃカジュアル】
- 友達同士の超くだけた会話
- 省略形・スラングを積極的に使用
- 最もくだけた語彙を選ぶ`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}カジュアル】
- ${intensityDesc}くだけた表現に
- 省略形OK
- 親しみやすいトーン`;

    case 'business':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃビジネス（最大級にフォーマル）】
- 最高レベルのビジネス語彙
- 省略形を排除し、完全な文で書く
- 最も格式の高い表現を選ぶ${isTargetJapanese ? '\n- 最高レベルの敬語・謙譲語を使用' : ''}`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}ビジネス】
- ${intensityDesc}ビジネスライクに
- 省略形は避ける
- プロフェッショナルなトーン`;

    case 'formal':
      if (toneLevel >= 100) {
        return `【トーンレベル: 100% - めちゃくちゃ丁寧（最大級の格式）】
- 最も格式の高い語彙と表現
- 最上級の格式で書く${isTargetJapanese ? '\n- 謙譲語・尊敬語を最大限に使用' : ''}`;
      }
      return `【トーンレベル: ${toneLevel}% - ${intensityLabel}丁寧】
- ${intensityDesc}丁寧な表現に
- 敬意を込めた言い回し
- 礼儀正しいトーン`;

    case 'custom':
      return `【カスタムトーン: "${customTone || ''}" FULL POWER】
- 段階は無視して常に全力で表現
- 意味は保持する`;

    default:
      return `【トーンレベル: ${toneLevel}%】自然に翻訳。`;
  }
}

// 逆翻訳指示生成
export function getReverseTranslationInstruction(
  sourceLang: string,
  targetLang: string,
  _toneLevel: number,
  tone?: string,
  _customTone?: string
): string {
  // 原文言語が日本語以外の場合
  if (sourceLang !== '日本語') {
    return `【逆翻訳】
- reverse_translation は必ず ${sourceLang} で出力すること
- トーン調整後の${targetLang}を${sourceLang}に訳す
- 逆翻訳は ${sourceLang} の語彙のみで構成する`;
  }

  // 原文が日本語の場合
  const usePolite = tone === 'business' || tone === 'formal';

  return `【逆翻訳】
- reverse_translation は日本語で出力
- トーン調整後の翻訳を${usePolite ? '敬語で' : '敬語を使わず'}日本語に訳す
- トーン調整で追加された表現の差分を必ず反映すること（各パーセンテージ間の逆翻訳のトーンに差を出す）
- 二重敬語は使わず、正しい敬語を使う
- 人名の敬称は原文に従う
${usePolite ? '- 原文が敬語でなくても、必ず敬語で出力すること' : ''}`;
}
