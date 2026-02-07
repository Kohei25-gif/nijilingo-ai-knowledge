// 多言語テキスト関数（groq.tsから分離）

/**
 * 「〜との違い」を各言語で返す（ISO 639-1 言語コード）
 */
export function getDifferenceFromText(langCode: string, level: number): string {
  switch (langCode) {
    case 'ja': return `${level}%との違い`
    case 'en': return `Difference from ${level}%`
    case 'es': return `Diferencia del ${level}%`
    case 'fr': return `Différence par rapport à ${level}%`
    case 'zh': return `与${level}%的差异`
    case 'ko': return `${level}%와의 차이`
    case 'de': return `Unterschied zu ${level}%`
    case 'it': return `Differenza dal ${level}%`
    case 'pt': return `Diferença de ${level}%`
    case 'cs': return `Rozdíl od ${level}%`
    default: return `Difference from ${level}%`
  }
}

/**
 * 「まだ生成されていません」を各言語で返す（ISO 639-1 言語コード）
 */
export function getNotYetGeneratedText(langCode: string): string {
  switch (langCode) {
    case 'ja': return '前のレベルの翻訳がまだ生成されていません。'
    case 'en': return 'Previous level translation not yet generated.'
    case 'es': return 'La traducción del nivel anterior aún no se ha generado.'
    case 'fr': return 'La traduction du niveau précédent n\'a pas encore été générée.'
    case 'zh': return '上一级别的翻译尚未生成。'
    case 'ko': return '이전 레벨의 번역이 아직 생성되지 않았습니다.'
    case 'de': return 'Die Übersetzung der vorherigen Stufe wurde noch nicht generiert.'
    case 'it': return 'La traduzione del livello precedente non è stata ancora generata.'
    case 'pt': return 'A tradução do nível anterior ainda não foi gerada.'
    case 'cs': return 'Překlad předchozí úrovně ještě nebyl vygenerován.'
    default: return 'Previous level translation not yet generated.'
  }
}

/**
 * 「生成に失敗しました」を各言語で返す（ISO 639-1 言語コード）
 */
export function getFailedToGenerateText(langCode: string): string {
  switch (langCode) {
    case 'ja': return '解説の生成に失敗しました。'
    case 'en': return 'Failed to generate explanation.'
    case 'es': return 'Error al generar la explicación.'
    case 'fr': return 'Échec de la génération de l\'explication.'
    case 'zh': return '生成解释失败。'
    case 'ko': return '설명 생성에 실패했습니다.'
    case 'de': return 'Erklärung konnte nicht generiert werden.'
    case 'it': return 'Impossibile generare la spiegazione.'
    case 'pt': return 'Falha ao gerar a explicação.'
    case 'cs': return 'Generování vysvětlení se nezdařilo.'
    default: return 'Failed to generate explanation.'
  }
}

/**
 * 「変化なし」を各言語で返す（ISO 639-1 言語コード）
 */
export function getNoChangeText(langCode: string): string {
  switch (langCode) {
    case 'ja': return 'このレベルでは前のレベルと同じ表現になりました。'
    case 'en': return 'No change from the previous level.'
    case 'es': return 'Sin cambios respecto al nivel anterior.'
    case 'fr': return 'Pas de changement par rapport au niveau précédent.'
    case 'zh': return '与上一级别相同，没有变化。'
    case 'ko': return '이전 레벨과 동일하여 변화가 없습니다.'
    case 'de': return 'Keine Änderung gegenüber der vorherigen Stufe.'
    case 'it': return 'Nessun cambiamento rispetto al livello precedente.'
    case 'pt': return 'Sem alteração em relação ao nível anterior.'
    case 'cs': return 'Žádná změna oproti předchozí úrovni.'
    default: return 'No change from the previous level.'
  }
}

/**
 * 言語名からISOコードを取得
 */
export function getLangCodeFromName(langName: string): string {
  const map: Record<string, string> = {
    '日本語': 'ja', 'Japanese': 'ja',
    '英語': 'en', 'English': 'en',
    'スペイン語': 'es', 'Spanish': 'es',
    'フランス語': 'fr', 'French': 'fr',
    '中国語': 'zh', 'Chinese': 'zh',
    '韓国語': 'ko', 'Korean': 'ko',
    'ドイツ語': 'de', 'German': 'de',
    'イタリア語': 'it', 'Italian': 'it',
    'ポルトガル語': 'pt', 'Portuguese': 'pt',
    'チェコ語': 'cs', 'Czech': 'cs',
  }
  const result = map[langName]
  if (!result) {
    console.warn(`[getLangCodeFromName] Unknown langName: "${langName}", defaulting to 'en'`)
  }
  return result || 'en'
}

/**
 * ISOコードから英語言語名を取得（AIプロンプト用）
 */
export function getLangNameFromCode(langCode: string): string {
  const map: Record<string, string> = {
    'ja': 'Japanese',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'zh': 'Chinese',
    'ko': 'Korean',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'cs': 'Czech',
  }
  return map[langCode] || 'English'
}
