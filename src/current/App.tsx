import React, { useState, useRef, useEffect } from 'react'
import { Settings, Mic, ArrowLeft, Search, Camera, Check, Plus, X, Clipboard, Pin, Tag, Trash2, Volume2, Loader2, Home } from 'lucide-react'
import './App.css'
import { translateFull, translateWithGuard, translatePartnerMessage, generateExplanation, generateToneDifferenceExplanation, editJapaneseForTone, extractStructure, getDifferenceFromText, getNotYetGeneratedText, getFailedToGenerateText, getLangCodeFromName, type TranslationResult, type ExpandedStructure } from './services/groq'
import nijii1 from './assets/nijii-1.png'
import nijii2 from './assets/nijii-2.png'
import nijii3 from './assets/nijii-3.png'
import nijii4 from './assets/nijii-4.png'
import nijii5 from './assets/nijii-5.png'

const splashData = [
  { image: nijii1, bg: 'linear-gradient(to top, #f8e8e8 0%, #f8f4e8 100%)' },
  { image: nijii2, bg: 'linear-gradient(to top, #f8e8e8 0%, #f8f4e8 100%)' },
  { image: nijii3, bg: 'linear-gradient(to top, #f8e8e8 0%, #f8f4e8 100%)' },
  { image: nijii4, bg: 'linear-gradient(to top, #f8e8e8 0%, #f8f4e8 100%)' },
  { image: nijii5, bg: 'linear-gradient(to top, #f8e8e8 0%, #f8f4e8 100%)' },
]

// Web Speech API 型定義
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionClass {
  new (): SpeechRecognitionInstance
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionClass
    webkitSpeechRecognition: SpeechRecognitionClass
  }
}

// 言語コードマッピング
const langCodeMap: { [key: string]: string } = {
  '日本語': 'ja-JP',
  '英語': 'en-US',
  'スペイン語': 'es-ES',
  'フランス語': 'fr-FR',
  '中国語': 'zh-CN',
  '韓国語': 'ko-KR',
  'ドイツ語': 'de-DE',
  'イタリア語': 'it-IT',
  'ポルトガル語': 'pt-BR',
  'チェコ語': 'cs-CZ',
}

// localStorage キー定義
const STORAGE_KEYS = {
  PARTNERS: 'nijilingo_partners',
  TAGS: 'nijilingo_tags',
  LOCKED_TONE: 'nijilingo_locked_tone',
  LOCKED_LEVEL: 'nijilingo_locked_level',
} as const;

// localStorage ヘルパー関数
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', key, e);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', key, e);
  }
}

// 型定義
interface Explanation {
  point: string
  explanation: string
}

interface Message {
  id: number
  type: 'partner' | 'self'
  original: string
  translation: string
  reverseTranslation: string
  explanation: Explanation
}

interface Partner {
  id: number
  name: string
  language: string
  flag: string
  avatar: string
  avatarImage?: string | null
  lastMessage: string
  lastTime: string
  messages: Message[]
  tag?: string
  isPinned?: boolean
}

interface Tag {
  id: string
  name: string
  isDefault: boolean
}

interface Preview {
  translation: string
  reverseTranslation: string
  explanation: Explanation
  noChange?: boolean  // 前のレベルと英語が同じ場合にtrue
}

interface Tone {
  id: string
  label: string
}

// ToneSlider用Props（Appの外に移動してre-render時の再作成を防ぐ）
interface ToneSliderProps {
  selectedTone: string | null
  toneUiValue: number
  sliderDisabled: boolean
  tones: Tone[]
  getToneLabel: (toneId: string) => { left: string; right: string }
  currentBucketRef: React.MutableRefObject<number>
  triggerHaptic: () => void
  setToneUiValue: (value: number) => void
  setActiveToneBucket: (value: number) => void
  setToneLevel: (value: number) => void
  updatePreviewFromCache: (bucket: number) => void
  getBucketValue: (value: number) => number
}

const ToneSlider = React.memo(({
  selectedTone,
  toneUiValue,
  sliderDisabled,
  tones: _tones,
  getToneLabel: _getToneLabel,
  currentBucketRef,
  triggerHaptic,
  setToneUiValue,
  setActiveToneBucket,
  setToneLevel,
  updatePreviewFromCache,
  getBucketValue,
}: ToneSliderProps) => {
  // _tones, _getToneLabel は将来の拡張用に残す（現在は未使用）
  void _tones
  void _getToneLabel
  if (!selectedTone) return null

  const levels = [0, 50, 100]
  const currentLevel = Math.round(toneUiValue / 50) + 1

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    setToneUiValue(newValue)

    const newBucket = getBucketValue(newValue)
    if (newBucket !== currentBucketRef.current) {
      const prevBucket = currentBucketRef.current
      currentBucketRef.current = newBucket
      triggerHaptic()
      console.log('[ToneSlider] bucket changed:', prevBucket, '->', newBucket)
      setActiveToneBucket(newBucket)
      updatePreviewFromCache(newBucket)
    }
  }

  const handleEnd = () => {
    const finalBucket = getBucketValue(toneUiValue)
    setToneLevel(finalBucket)
    setActiveToneBucket(finalBucket)
    setToneUiValue(finalBucket)
    updatePreviewFromCache(finalBucket)
  }

  const getSliderTitle = () => {
    switch (selectedTone) {
      case 'casual': return 'カジュアル度を調整'
      case 'business': return 'ビジネス度を調整'
      case 'formal': return '丁寧さを調整'
      case 'custom': return 'カスタム度を調整'
      default: return 'トーンを調整'
    }
  }

  return (
    <div id="step-slider-container" className={`step-slider-container ${sliderDisabled ? 'disabled' : ''}`}>
      <div className="step-slider-header">
        <span className="step-slider-title">{getSliderTitle()}</span>
        <span className="step-slider-badge">
          {currentLevel === 1 ? '0%（原文）' : currentLevel === 2 ? '50%' : '100%'}
        </span>
      </div>
      <div className="step-slider-body">
        {/* スライダー行 */}
        <div className="step-slider-row">
          <span className="step-slider-label">😊</span>
          <div className="step-slider-track-wrapper">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={toneUiValue}
              onChange={handleChange}
              onMouseUp={handleEnd}
              onTouchEnd={handleEnd}
              className="step-slider-input"
              disabled={sliderDisabled}
            />
            <div
              className="step-slider-progress"
              style={{ width: `${toneUiValue}%` }}
            />
          </div>
          <span className="step-slider-label">💪</span>
        </div>
        {/* 目盛り点（スライダーの下） */}
        <div className="step-slider-dots-row">
          {levels.map((level) => (
            <div
              key={level}
              className={`step-slider-dot ${toneUiValue >= level ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

interface LanguageOption {
  label: string
  flag: string
  code: string  // ISO 639-1 言語コード
}

function App() {
  // 画面管理
  const [currentScreen, setCurrentScreen] = useState<'translate' | 'list' | 'chat' | 'face-to-face'>('translate')
  const [prevScreenBeforeFaceToFace, setPrevScreenBeforeFaceToFace] = useState<'translate' | 'list' | 'chat'>('translate')
  const [currentPartnerId, setCurrentPartnerId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // TranslateScreen専用の一時メッセージ
  const [translateMessages, setTranslateMessages] = useState<Message[]>([])

  // TranslateScreen用の入力テキスト
  const [translatePartnerText, setTranslatePartnerText] = useState('')
  const [translateSelfText, setTranslateSelfText] = useState('')
  const [hidePartnerSection, setHidePartnerSection] = useState(false)
  const [hideSelfSection, setHideSelfSection] = useState(false)

  // TranslateScreen用の言語選択
  const [translatePartnerSourceLang, setTranslatePartnerSourceLang] = useState('自動認識')
  const [translatePartnerTargetLang, setTranslatePartnerTargetLang] = useState('日本語')
  const [translateSelfSourceLang, setTranslateSelfSourceLang] = useState('自動認識')
  const [translateSelfTargetLang, setTranslateSelfTargetLang] = useState('英語')

  // 自動認識結果
  const [detectedPartnerLang, setDetectedPartnerLang] = useState('')
  const [detectedSelfLang, setDetectedSelfLang] = useState('')

  // モーダル管理
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showSelectPartnerModal, setShowSelectPartnerModal] = useState(false)

  // 言語の手動設定フラグ
  const [selfTargetLangManuallySet, setSelfTargetLangManuallySet] = useState(false)

  // フォアグラウンド事前生成用（handleToneSelectの選択トーン生成）
  const foregroundAbortRef = useRef<AbortController | null>(null)
  const selectedToneRef = useRef<string | null>(null)
  
  // 構造化M抽出の結果を保持（トーン切り替え時も使い回す）
  const extractedStructureRef = useRef<ExpandedStructure | undefined>(undefined)
  const structureSourceTextRef = useRef<string>('')  // どの原文の構造情報か

  // 対面モード関連
  const [faceToFaceMode, setFaceToFaceMode] = useState<'idle' | 'self' | 'partner'>('idle')
  const [faceToFaceInput, setFaceToFaceInput] = useState('')
  const [faceToFaceResult, setFaceToFaceResult] = useState<{ original: string; translation: string } | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const faceToFaceInputRef = useRef('')
  const faceToFaceModeRef = useRef<'idle' | 'self' | 'partner'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const [f2fMyLanguage, setF2fMyLanguage] = useState('日本語')
  const [f2fPartnerLanguage, setF2fPartnerLanguage] = useState('英語')
  const SILENCE_TIMEOUT = 3000 // 3秒

  // タグ管理
  const [tags, setTags] = useState<Tag[]>(() =>
    loadFromStorage(STORAGE_KEYS.TAGS, [
      { id: 'all', name: 'すべて', isDefault: true },
      { id: 'friends', name: '友達', isDefault: false },
      { id: 'business', name: 'ビジネス', isDefault: false }
    ])
  )
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')

  // 相手リスト
  const [partners, setPartners] = useState<Partner[]>(() =>
    loadFromStorage(STORAGE_KEYS.PARTNERS, [])
  )

  // チャット関連のstate
  const [inputText, setInputText] = useState('')
  const [previewSourceText, setPreviewSourceText] = useState('')  // キャッシュキー用（inputTextは変動するので固定）
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [lockedTone, setLockedTone] = useState<string | null>(() =>
    loadFromStorage(STORAGE_KEYS.LOCKED_TONE, null)
  )
  const [lockedLevel, setLockedLevel] = useState<number>(() =>
    loadFromStorage(STORAGE_KEYS.LOCKED_LEVEL, 0)
  )
  const [toneLevel, setToneLevel] = useState(0)
  const [toneUiValue, setToneUiValue] = useState(0)  // スライダーUI用（0-100連続値）
  const [activeToneBucket, setActiveToneBucket] = useState(0)  // スライダーが指しているバケット（ドラッグ中も更新）
  const [isNative, setIsNative] = useState(false)
  const [customTone, setCustomTone] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [expandedExplanation, setExpandedExplanation] = useState<number | string | null>(null)
  const [showPartnerInput, setShowPartnerInput] = useState(false)
  const [partnerInputText, setPartnerInputText] = useState('')
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAddPartner, setShowAddPartner] = useState(false)
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerLanguage, setNewPartnerLanguage] = useState('英語')

  // 長押しメニュー関連
  const [contextMenuPartner, setContextMenuPartner] = useState<Partner | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagChangeModal, setShowTagChangeModal] = useState(false)
  const longPressTimer = useRef<number | null>(null)

  const [preview, setPreview] = useState<Preview>({
    translation: '',
    reverseTranslation: '',
    explanation: {
      point: '',
      explanation: ''
    }
  })
  // トーンレベル間の違い解説用state
  const [toneDiffExplanation, setToneDiffExplanation] = useState<{ point: string; explanation: string } | null>(null)
  const [toneDiffLoading, setToneDiffLoading] = useState(false)
  const [toneDiffExpanded, setToneDiffExpanded] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [splashIndex] = useState(() => Math.floor(Math.random() * splashData.length))
  const [translationError, setTranslationError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nuanceContainerRef = useRef<HTMLDivElement>(null)
  const nuanceBottomRef = useRef<HTMLDivElement>(null)
  const explanationRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // 現在の相手を取得
  const currentPartner = partners.find(p => p.id === currentPartnerId)
  const messages = currentPartner?.messages || []

  // スプラッシュ画面
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // スライダー表示時のスクロール制御
  useEffect(() => {
    if (selectedTone) {
      nuanceBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [selectedTone])

  // 解説展開時の自動スクロール
  useEffect(() => {
    if (expandedExplanation !== null) {
      // 少し遅延させてDOMが更新されてからスクロール
      setTimeout(() => {
        const key = String(expandedExplanation)
        const element = explanationRefs.current[key]
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }, [expandedExplanation])

  // トーンレベル変更時・入力テキスト変更時に解説をリセット
  useEffect(() => {
    setToneDiffExplanation(null)
    setToneDiffExpanded(false)
  }, [activeToneBucket, selectedTone, previewSourceText])

  // localStorage への自動保存
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PARTNERS, partners);
  }, [partners]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TAGS, tags);
  }, [tags]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LOCKED_TONE, lockedTone);
  }, [lockedTone]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LOCKED_LEVEL, lockedLevel);
  }, [lockedLevel]);

  const tones: Tone[] = [
    { id: 'casual', label: '👋 友達' },
    { id: 'business', label: '💼 仕事' },
    { id: 'formal', label: '🎩 丁寧に' },
    { id: 'custom', label: 'カスタム' }
  ]

  const languageOptions: LanguageOption[] = [
    { label: '日本語', flag: '🇯🇵', code: 'ja' },
    { label: '英語', flag: '🇺🇸', code: 'en' },
    { label: 'スペイン語', flag: '🇪🇸', code: 'es' },
    { label: 'フランス語', flag: '🇫🇷', code: 'fr' },
    { label: '中国語', flag: '🇨🇳', code: 'zh' },
    { label: '韓国語', flag: '🇰🇷', code: 'ko' },
    { label: 'ドイツ語', flag: '🇩🇪', code: 'de' },
    { label: 'イタリア語', flag: '🇮🇹', code: 'it' },
    { label: 'ポルトガル語', flag: '🇧🇷', code: 'pt' },
    { label: 'チェコ語', flag: '🇨🇿', code: 'cs' },
  ]

  const avatarOptions = ['👨', '👩', '👨‍💼', '👩‍💼', '🧑', '👴', '👵', '🧔', '👱‍♀️', '👱‍♂️']

  // バケット判定（3段階: 0/50/100）
  const getBucketValue = (value: number): number => {
    if (value < 25) return 0
    if (value < 75) return 50
    return 100
  }

  // UIは3段階（0/50/100）、内部生成は5段階（0/25/50/75/100）
  const UI_TONE_LEVELS = [0, 50, 100]

  const normalizeLevel = (value: number): number => {
    return UI_TONE_LEVELS.reduce((closest, level) => {
      return Math.abs(level - value) < Math.abs(closest - value) ? level : closest
    }, UI_TONE_LEVELS[0])
  }

  const PROMPT_VERSION = '2026-01-21-1'

  // L1キャッシュ: バケットごとに翻訳結果を保存
  // キー形式: "PROMPT_VERSION|sourceText|tone_toneBucket"
  const [translationCache, setTranslationCache] = useState<Record<string, {
    translation: string
    reverseTranslation: string
    noChange?: boolean  // 前のレベルと英語が同じ場合にtrue
  }>>({})

  // キャッシュの同期参照用ref（useEffectから最新値を参照するため）
  const translationCacheRef = useRef<Record<string, { translation: string; reverseTranslation: string; noChange?: boolean }>>({})

  // キャッシュキーを生成
  const getCacheKey = (
    tone: string | null,
    toneBucket: number,
    sourceText: string,
    customToneText?: string,
    sourceLang?: string,
    targetLang?: string,
    isNativeFlag?: boolean
  ): string => {
    // 0%時はtoneを'none'に統一してキャッシュを共有（トーン変更時の再生成を防ぐ）
    const normalizedTone = toneBucket === 0 ? 'none' : (tone || 'none')
    const customPart = tone === 'custom' && customToneText ? `_${customToneText}` : ''
    const langPart = `${sourceLang || 'auto'}->${targetLang || 'unknown'}`
    const nativePart = isNativeFlag ? '_native' : ''
    return `${PROMPT_VERSION}|${langPart}|${sourceText}|${normalizedTone}_${toneBucket}${customPart}${nativePart}`
  }

  // キャッシュを更新（ref + state両方を更新して再レンダリングをトリガー）
  const updateTranslationCache = (updates: Record<string, { translation: string; reverseTranslation: string; noChange?: boolean }>) => {
    // refを即座に更新（同期的に参照可能）
    Object.assign(translationCacheRef.current, updates)
    // stateを更新（再レンダリングをトリガー）
    setTranslationCache(prev => ({ ...prev, ...updates }))
  }

  // キャッシュ到着時に自動でプレビュー更新（スライダーを動かさなくても反映）
  useEffect(() => {
    if (!selectedTone || !previewSourceText.trim()) return
    const effectiveSourceLang = currentScreen === 'translate' ? (detectedSelfLang || '日本語') : '日本語'
    const effectiveTargetLang = currentScreen === 'translate' ? translateSelfTargetLang : currentPartner?.language
    const key = getCacheKey(selectedTone, activeToneBucket, previewSourceText, customTone, effectiveSourceLang, effectiveTargetLang, isNative)
    const cached = translationCacheRef.current[key]
    if (!cached) {
      console.log('[AutoUpdate] MISS', { activeToneBucket, key })
      return
    }
    // すでに表示中と同じなら何もしない
    if (cached.translation === preview.translation && cached.reverseTranslation === preview.reverseTranslation && cached.noChange === preview.noChange) return
    console.log('[AutoUpdate] HIT - updating preview', { activeToneBucket, key, noChange: cached.noChange })
    setPreview(prev => ({ ...prev, translation: cached.translation, reverseTranslation: cached.reverseTranslation, noChange: cached.noChange }))
  }, [selectedTone, activeToneBucket, previewSourceText, translationCache, currentScreen, detectedSelfLang, translateSelfTargetLang, currentPartner, isNative])

  // TranslateScreen: 「あなたが送りたい文章」- 入力欄が空の時だけリセット
  // v3.5: debounce検出を削除、翻訳ボタン押した時だけ検出する
  useEffect(() => {
    if (currentScreen !== 'translate') return
    // 入力欄が空になったらリセット
    if (!translateSelfText.trim()) {
      setDetectedSelfLang('')
    }
    // 入力中は検出しない（翻訳ボタン押した時に検出）
  }, [translateSelfText, currentScreen])

  // TranslateScreen: 「翻訳したい文章」- 入力欄が空の時だけリセット
  // v3.5: debounce検出を削除、翻訳ボタン押した時だけ検出する
  useEffect(() => {
    if (currentScreen !== 'translate') return
    // 入力欄が空になったらリセット
    if (!translatePartnerText.trim()) {
      setDetectedPartnerLang('')
    }
    // 入力中は検出しない（翻訳ボタン押した時に検出）
  }, [translatePartnerText, currentScreen])

  // 音声認識クリーンアップ
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // 対面モードのref同期（stale closure対策）
  useEffect(() => {
    faceToFaceInputRef.current = faceToFaceInput
  }, [faceToFaceInput])

  useEffect(() => {
    faceToFaceModeRef.current = faceToFaceMode
  }, [faceToFaceMode])

  // ElevenLabs音声のクリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }
    }
  }, [])

  const hasTranslationResult = showPreview && Boolean(preview.translation.trim())

  const normalizeForCompare = (text: string) =>
    text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[“”]/g, '"')

  const calculateEditDistance = (str1: string, str2: string): number => {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          )
        }
      }
    }
    return dp[m][n]
  }

  const isTooSimilar = (a: string, b: string): boolean => {
    const normalizedA = normalizeForCompare(a)
    const normalizedB = normalizeForCompare(b)
    if (normalizedA === normalizedB) return true

    const maxLen = Math.max(normalizedA.length, normalizedB.length)
    if (maxLen === 0) return true
    const distance = calculateEditDistance(normalizedA, normalizedB)
    const distanceRatio = distance / maxLen
    const lengthRatio = Math.abs(normalizedA.length - normalizedB.length) / maxLen
    const shortThreshold = maxLen < 20 ? 1 : Math.floor(maxLen * 0.08)

    return distance <= shortThreshold || (distanceRatio <= 0.08 && lengthRatio <= 0.08)
  }

  /**
   * 3段階UI（0/50/100）向けに翻訳を生成してキャッシュする。
   * 日本語→外国語: 日本語を編集してから翻訳（日本語ベース方式）
   * 外国語→日本語: 従来通り英語を編集（英語ベース方式）
   */
  const generateAndCacheUiBuckets = async (params: {
    tone: string
    isNative: boolean
    sourceText: string
    currentUiBucket: number
    customToneOverride?: string
    targetLang?: string
    sourceLang?: string
    signal?: AbortSignal
    structurePromise?: Promise<ExpandedStructure | undefined>  // 構造化M抽出のPromise（0%と並列実行）
    cachedStructure?: ExpandedStructure  // 既にrefに保存済みの構造情報
  }) => {
    const { tone, isNative, sourceText, currentUiBucket, customToneOverride, targetLang, sourceLang, signal, structurePromise, cachedStructure } = params

    // targetLang/sourceLangが渡されたらそれを使う、なければcurrentPartner依存
    const effectiveTargetLang = targetLang || currentPartner?.language
    const effectiveSourceLang = sourceLang || '日本語'
    if (!effectiveTargetLang) return

    const customToneValue =
      typeof customToneOverride === 'string'
        ? customToneOverride
        : tone === 'custom'
          ? customTone
          : undefined

    // ★ キャッシュチェック: 全レベル（0, 50, 100）が既にあればスキップ
    const allCached = UI_TONE_LEVELS.every((bucket) => {
      const key = getCacheKey(tone, bucket, sourceText, customToneValue, effectiveSourceLang, effectiveTargetLang, isNative)
      return Boolean(translationCacheRef.current[key])
    })
    if (allCached) {
      console.log(`[generateAndCacheUiBuckets] ★ All levels cached, skipping generation for tone: ${tone}`)
      return
    }

    // ⚠️ 必ず updateTranslationCache を使う（refだけの更新は再レンダリングされない）
    const cacheBucket = (bucket: number, result: TranslationResult, noChange?: boolean) => {
      const cacheKey = getCacheKey(tone, bucket, sourceText, customToneValue, effectiveSourceLang, effectiveTargetLang, isNative)
      updateTranslationCache({
        [cacheKey]: {
          translation: result.translation,
          reverseTranslation: result.reverse_translation,
          noChange
        }
      })
    }

    const buildOptions = (toneLevel: number, srcText?: string, current?: TranslationResult, prevLevel?: number) => ({
      sourceText: srcText || sourceText,
      sourceLang: effectiveSourceLang,
      targetLang: effectiveTargetLang,
      isNative,
      tone,
      toneLevel,
      customTone: customToneValue,
      currentTranslation: current?.translation,
      currentReverseTranslation: current?.reverse_translation,
      // 2026-02-03: 逆翻訳で差分を表現するための前レベル情報
      previousTranslation: current?.translation,
      previousLevel: prevLevel,
      signal
    })

    // custom は FULL一発を共有
    if (tone === 'custom') {
      const result = await translateFull(buildOptions(100))
      UI_TONE_LEVELS.forEach((b) => cacheBucket(b, result))
      return
    }

    // Native=ON は FULL一発を共有
    if (isNative) {
      const result = await translateFull(buildOptions(currentUiBucket))
      UI_TONE_LEVELS.forEach((b) => cacheBucket(b, result))
      return
    }

    // ========================================
    // 日本語ベース方式（日本語→外国語の場合）- 日本語先確定版
    // ========================================
    if (effectiveSourceLang === '日本語') {
      // ★ 構造化M抽出は0%翻訳と並列で実行中
      // 50%/100%の処理前にawaitする

      // ★ Step 1: 日本語を3パターン先に確定
      const confirmedJa: Record<number, string> = { 0: sourceText }

      // 日本語品質チェック関数
      const isJapaneseValid = (original: string, edited: string, tone?: string): boolean => {
        // 1. commitment追加チェック
        const commitmentPatterns = [
          /お願い(申し上げ|いたし)/,
          /ご理解(賜り|いただ)/,
          /ご了承/,
          /ご検討/,
          /何卒/,
          /よろしくお願い/
        ]
        const originalHasCommitment = commitmentPatterns.some(p => p.test(original))
        const editedHasCommitment = commitmentPatterns.some(p => p.test(edited))
        if (!originalHasCommitment && editedHasCommitment) {
          console.log(`[JaCheck] NG: commitmentが追加された`)
          return false
        }

        // 3. 敬称追加チェック
        const honorificPatterns = [/様/, /さん/, /君/, /ちゃん/]
        const originalHasHonorific = honorificPatterns.some(p => p.test(original))
        const editedHasHonorific = honorificPatterns.some(p => p.test(edited))
        if (!originalHasHonorific && editedHasHonorific) {
          console.log(`[JaCheck] NG: 敬称が追加された`)
          return false
        }

        // 4. 文法崩壊チェック（シンプル版）
        const brokenPatterns = [
          /微妙させて/,
          /良いでございます/,
          /いいでございます/,
        ]
        if (brokenPatterns.some(p => p.test(edited))) {
          console.log(`[JaCheck] NG: 文法崩壊`)
          return false
        }

        // 5. ローマ字チェック（日本語文字がないならNG）
        const hasJapanese = /[ぁ-んァ-ン一-龯]/.test(edited)
        if (!hasJapanese) {
          console.log(`[JaCheck] NG: ローマ字のみ`)
          return false
        }

        // 6. じゃん追加チェック（casualトーン以外で原文になければNG）
        if (tone !== 'casual' && !original.includes('じゃん') && edited.includes('じゃん')) {
          console.log(`[JaCheck] NG: じゃんが追加された`)
          return false
        }

        // 7. 尊敬語追加チェック（原文になければNG）
        const honorificVerbPatterns = [
          /お休みになら/,
          /いらっしゃ/,
          /おっしゃ/,
          /ご覧にな/,
          /召し上が/,
        ]
        const originalHasHonorificVerb = honorificVerbPatterns.some(p => p.test(original))
        const editedHasHonorificVerb = honorificVerbPatterns.some(p => p.test(edited))
        if (tone !== 'business' && tone !== 'formal' && !originalHasHonorificVerb && editedHasHonorificVerb) {
          console.log(`[JaCheck] NG: 尊敬語が追加された`)
          return false
        }

        return true
      }

      // 敬語レベル一貫性チェック（business/formalで前レベルより敬語が弱くなっていないか）
      const checkIsMorePolite = (prev: string, current: string, tone: string): boolean => {
        if (tone !== 'business' && tone !== 'formal') return true

        // 敬語の強さを示すパターン（強い順）
        const politePatterns = [
          { pattern: /ございます/, weight: 3 },
          { pattern: /いただ/, weight: 3 },
          { pattern: /申し上げ/, weight: 3 },
          { pattern: /させていただ/, weight: 2 },
          { pattern: /でしょうか/, weight: 2 },
          { pattern: /ます[。！!]?$/, weight: 1 },
          { pattern: /です[。！!]?$/, weight: 1 },
        ]

        const getPoliteScore = (text: string): number => {
          let score = 0
          for (const { pattern, weight } of politePatterns) {
            if (pattern.test(text)) score += weight
          }
          return score
        }

        const prevScore = getPoliteScore(prev)
        const currentScore = getPoliteScore(current)

        // 現在のスコアが前より低い場合はNG
        if (currentScore < prevScore) {
          console.log(`[checkIsMorePolite] NG: prevScore=${prevScore}, currentScore=${currentScore}`)
          return false
        }
        return true
      }

      // ★ 構造化M抽出の完了を先に待つ（0%にも構造情報を渡すため）
      // structurePromiseがあればawait、なければcachedStructureを使う
      let extractedStructure: ExpandedStructure | undefined
      if (structurePromise) {
        extractedStructure = await structurePromise
        console.log('[JaBase] Structure extraction completed:', extractedStructure)
      } else if (cachedStructure) {
        extractedStructure = cachedStructure
        console.log('[JaBase] Using cached structure:', extractedStructure)
      } else {
        // refから取得を試みる（フォールバック）
        extractedStructure = extractedStructureRef.current
        console.log('[JaBase] Using structure from ref:', extractedStructure)
      }

      // ★ パイプライン処理: 日本語ができたら即座に英語翻訳を開始（待たない）
      const translatePromises: Promise<{ uiLevel: number; translation: string; ja: string; risk: 'low' | 'med' | 'high' }>[] = []

      // 0%: 原文そのまま → 構造情報ありで翻訳開始
      const ja0 = confirmedJa[0]
      const options0 = { ...buildOptions(0, ja0), tone: undefined, structure: extractedStructure }
      translatePromises.push(
        translateFull(options0).then(result => ({ uiLevel: 0, translation: result.translation, ja: ja0, risk: result.risk }))
      )
      console.log('[Pipeline] 0%英語翻訳開始（構造情報あり）')

      // 50%用の日本語を探す（0%を基準に25, 50から選ぶ）
      for (const level of [25, 50]) {
        const editedJa = await editJapaneseForTone(sourceText, tone, level, customToneValue, signal, extractedStructure)

        // 品質チェック
        if (!isJapaneseValid(sourceText, editedJa, tone)) continue
        // 0%（原文）と違うかチェック
        if (isTooSimilar(editedJa, sourceText)) continue
        // 敬語レベル一貫性チェック
        if (!checkIsMorePolite(sourceText, editedJa, tone)) continue

        confirmedJa[50] = editedJa
        console.log(`[JaBase] 50%枠: ${level}%を採用`)
        break
      }
      // フォールバック
      if (!confirmedJa[50]) confirmedJa[50] = sourceText

      // 50%: 日本語確定 → 即座に英語翻訳開始
      const ja50 = confirmedJa[50]
      const options50 = { ...buildOptions(50, ja50), structure: extractedStructure }
      translatePromises.push(
        translateFull(options50).then(result => ({ uiLevel: 50, translation: result.translation, ja: ja50, risk: result.risk }))
      )
      console.log('[Pipeline] 50%英語翻訳開始')

      // 100%用の日本語を探す（50%を基準に75, 100から選ぶ）
      for (const level of [75, 100]) {
        const editedJa = await editJapaneseForTone(sourceText, tone, level, customToneValue, signal, extractedStructure)

        // 品質チェック
        if (!isJapaneseValid(sourceText, editedJa, tone)) continue
        // 50%と違うかチェック
        if (isTooSimilar(editedJa, confirmedJa[50])) continue
        // 敬語レベル一貫性チェック（50%より敬語が弱くなっていないか）
        if (!checkIsMorePolite(confirmedJa[50], editedJa, tone)) continue

        confirmedJa[100] = editedJa
        console.log(`[JaBase] 100%枠: ${level}%を採用`)
        break
      }
      // フォールバック（全て変化なしの場合）
      if (!confirmedJa[100]) {
        confirmedJa[100] = confirmedJa[50]
        console.log('[JaBase] 100%枠: 変化なしで採用')
      }

      // 100%: 日本語確定 → 即座に英語翻訳開始
      const ja100 = confirmedJa[100]
      const options100 = { ...buildOptions(100, ja100), structure: extractedStructure }
      translatePromises.push(
        translateFull(options100).then(result => ({ uiLevel: 100, translation: result.translation, ja: ja100, risk: result.risk }))
      )
      console.log('[Pipeline] 100%英語翻訳開始')

      // ★ 全ての英語翻訳が完了するのを待つ
      const translateResults = await Promise.all(translatePromises)
      const translatedResults: Record<number, { translation: string; ja: string; risk: 'low' | 'med' | 'high' }> = {}
      for (const r of translateResults) {
        translatedResults[r.uiLevel] = { translation: r.translation, ja: r.ja, risk: r.risk }
      }
      console.log('[Pipeline] 全翻訳完了')

      // ★ Step 3: 英語が同じなら前のレベルを再使用して「変化なし」フラグを立てる
      const finalResults: Record<number, { translation: string; ja: string; risk: 'low' | 'med' | 'high'; noChange?: boolean }> = {
        0: translatedResults[0]
      }

      // 50%: 0%と比較
      if (isTooSimilar(translatedResults[50].translation, translatedResults[0].translation)) {
        finalResults[50] = { ...translatedResults[0], noChange: true }
        console.log('[JaBase] 50% → 0%と同じ英語のため再使用（変化なし）')
      } else {
        finalResults[50] = translatedResults[50]
      }

      // 100%: 50%（または再使用された0%）と比較
      const prev = finalResults[50]
      if (isTooSimilar(translatedResults[100].translation, prev.translation)) {
        finalResults[100] = { ...prev, noChange: true }
        console.log('[JaBase] 100% → 前レベルと同じ英語のため再使用（変化なし）')
      } else {
        finalResults[100] = translatedResults[100]
      }

      // キャッシュに保存
      for (const uiLevel of [0, 50, 100]) {
        const { translation, ja, risk, noChange } = finalResults[uiLevel]
        cacheBucket(uiLevel, {
          translation,
          reverse_translation: ja,
          risk
        }, noChange)
      }

      console.log('[JaBase] 日本語確定:', confirmedJa)
      console.log('[JaBase] 最終結果:', finalResults)
      return
    }

    // ========================================
    // 従来方式（外国語→日本語の場合）
    // ========================================
    const internal: Record<number, TranslationResult> = {}

    const base0 = await translateFull(buildOptions(0))
    // 0%の逆翻訳は原文そのまま（翻訳の逆翻訳ではない）
    base0.reverse_translation = sourceText
    internal[0] = base0

    // 25→50→75→100 を「直前の翻訳」をアンカーにしてPARTIAL編集
    // フォールバックしても止めずに全部生成する
    let prev = base0
    let prevLevel = 0  // 2026-02-03: 逆翻訳で差分を表現するための前レベル
    for (const level of [25, 50, 75, 100]) {
      const guarded = await translateWithGuard(buildOptions(level, undefined, prev, prevLevel))

      // 結果を保存（フォールバックしたかどうかに関わらず）
      internal[level] = guarded.result

      // prevの更新: 翻訳が実際に変わった場合のみ進める
      const translationChanged = !isTooSimilar(guarded.result.translation, prev.translation)
      if (translationChanged) {
        prev = guarded.result
        prevLevel = level  // 2026-02-03: 前レベルも更新
      }
    }

    // 差分判定
    const isResultTooSimilar = (a: TranslationResult, b: TranslationResult) => {
      return (
        isTooSimilar(a.translation, b.translation) ||
        isTooSimilar(a.reverse_translation, b.reverse_translation)
      )
    }

    const pickInternal = (prevRes: TranslationResult, candidates: number[]) => {
      for (const c of candidates) {
        const candRes = internal[c]
        if (!candRes) continue
        if (!isResultTooSimilar(prevRes, candRes)) return c
      }
      return 0
    }

    // 50%枠: 0%を基準に25, 50から選ぶ
    const ui50Internal = pickInternal(base0, [25, 50])
    const ui50Res = internal[ui50Internal] ?? base0

    // 100%枠: 50%を基準に75, 100から選ぶ
    const ui100Internal = pickInternal(ui50Res, [75, 100])
    const ui100Res = internal[ui100Internal] ?? ui50Res

    cacheBucket(0, base0)
    cacheBucket(50, ui50Res)
    cacheBucket(100, ui100Res)
  }

  // 3バケット一括取得（Eager Fetching）- generateAndCacheUiBucketsを使用
  const fetchAllBucketsForTone = async (
    tone: string,
    native: boolean,
    customToneOverride?: string,
    targetLang?: string,
    sourceLang?: string
  ) => {
    if (!previewSourceText || !showPreview) return

    // targetLang/sourceLangが渡されたらそれを使う、なければcurrentPartner依存
    const effectiveTargetLang = targetLang || currentPartner?.language
    const effectiveSourceLang = sourceLang || '日本語'
    if (!effectiveTargetLang) return

    const sourceText = previewSourceText
    const currentToneBucket = tone === 'custom' ? 100 : activeToneBucket
    const customToneValue =
      typeof customToneOverride === 'string'
        ? customToneOverride
        : tone === 'custom'
          ? customTone
          : undefined

    // ★ まず現在のバケットをチェック → あれば即表示
    const currentKey = getCacheKey(tone, currentToneBucket, sourceText, customToneValue, effectiveSourceLang, effectiveTargetLang, native)
    const currentCached = translationCacheRef.current[currentKey]

    if (currentCached) {
      // 即表示（ブロックしない）
      setPreview(prev => ({
        ...prev,
        translation: currentCached.translation,
        reverseTranslation: currentCached.reverseTranslation
      }))
      setShowPreview(true)
    }

    // ★ 不足バケットだけ生成（バックグラウンド）
    const allCached = UI_TONE_LEVELS.every((bucket) => {
      const key = getCacheKey(tone, bucket, sourceText, customToneValue, effectiveSourceLang, effectiveTargetLang, native)
      return Boolean(translationCacheRef.current[key])
    })

    if (!allCached) {
      // バックグラウンドで生成（UIはブロックしない）
      if (!currentCached) {
        setIsTranslating(true)
      }
      setTranslationError(null)

      try {
        await generateAndCacheUiBuckets({
          tone,
          isNative: native,
          sourceText,
          currentUiBucket: currentToneBucket,
          customToneOverride,
          targetLang: effectiveTargetLang,
          sourceLang: effectiveSourceLang,
          cachedStructure: extractedStructureRef.current  // refから構造情報を使う
        })

        // 生成完了後に表示更新
        const key = getCacheKey(tone, currentToneBucket, sourceText, customToneValue, effectiveSourceLang, effectiveTargetLang, native)
        const cached = translationCacheRef.current[key]
        if (cached) {
          setPreview(prev => ({
            ...prev,
            translation: cached.translation,
            reverseTranslation: cached.reverseTranslation
          }))
          setShowPreview(true)
        }
      } catch (error) {
        console.error('Error fetching buckets:', error)
        setTranslationError('翻訳中にエラーが発生しました')
      } finally {
        setIsTranslating(false)
      }
    }
  }

  // ============================================
  // トーンレベル間の違い解説を取得
  // ============================================
  const handleToneDiffExplanation = async () => {
    // 既に展開中なら閉じる
    if (toneDiffExpanded) {
      setToneDiffExpanded(false)
      return
    }

    const currentBucket = activeToneBucket
    
    // キャッシュから翻訳を取得
    const effectiveSourceLang = translateSelfSourceLang === '自動認識'
      ? (detectedSelfLang || '日本語')
      : translateSelfSourceLang
    const effectiveTargetLang = translateSelfTargetLang

    // 0%の場合（またはトーン未選択時）は「この文の伝わり方」を解説
    if (currentBucket === 0 || !selectedTone) {
      // プレビューから直接翻訳を取得
      if (!preview.translation) {
        setToneDiffExplanation({
          point: 'この文の伝わり方',
          explanation: '翻訳がまだ生成されていません。'
        })
        setToneDiffExpanded(true)
        return
      }

      setToneDiffLoading(true)
      setToneDiffExpanded(true)

      const sourceLangCode0 = getLangCodeFromName(effectiveSourceLang)
      const targetLangCode0 = getLangCodeFromName(effectiveTargetLang)
      try {
        const explanation = await generateExplanation(
          preview.translation,
          sourceLangCode0,
          targetLangCode0,
          sourceLangCode0  // 解説は原文の言語で出力
        )
        setToneDiffExplanation({
          point: explanation.point || getDifferenceFromText(sourceLangCode0, 0),
          explanation: explanation.explanation
        })
      } catch (error) {
        console.error('[handleToneDiffExplanation] 0% error:', error)
        setToneDiffExplanation({
          point: getDifferenceFromText(sourceLangCode0, 0),
          explanation: getFailedToGenerateText(sourceLangCode0)
        })
      } finally {
        setToneDiffLoading(false)
      }
      return
    }

    // 50%/100%の場合は前のレベルとの違いを解説
    const levels = [0, 50, 100]
    const idx = levels.indexOf(currentBucket)
    if (idx <= 0) return
    const prevBucket = levels[idx - 1]

    const prevKey = getCacheKey(selectedTone, prevBucket, previewSourceText, customTone, effectiveSourceLang, effectiveTargetLang, isNative)
    const currKey = getCacheKey(selectedTone, currentBucket, previewSourceText, customTone, effectiveSourceLang, effectiveTargetLang, isNative)

    const prevCached = translationCacheRef.current[prevKey]
    const currCached = translationCacheRef.current[currKey]

    const sourceLangCode = getLangCodeFromName(effectiveSourceLang)

    if (!prevCached || !currCached) {
      setToneDiffExplanation({
        point: getDifferenceFromText(sourceLangCode, prevBucket),
        explanation: getNotYetGeneratedText(sourceLangCode)
      })
      setToneDiffExpanded(true)
      return
    }

    setToneDiffLoading(true)
    setToneDiffExpanded(true)

    try {
      const explanation = await generateToneDifferenceExplanation(
        prevCached.translation,
        currCached.translation,
        prevBucket,
        currentBucket,
        selectedTone,
        sourceLangCode
      )
      setToneDiffExplanation(explanation)
    } catch (error) {
      console.error('[handleToneDiffExplanation] error:', error)
      setToneDiffExplanation({
        point: getDifferenceFromText(sourceLangCode, prevBucket),
        explanation: getFailedToGenerateText(sourceLangCode)
      })
    } finally {
      setToneDiffLoading(false)
    }
  }

  // ============================================
  // BUG-002対応: ボタンごと生成（handleToneSelect）
  // ============================================
  // 問題: setTimeoutによる遅延で「操作しないと変わらない」状態だった
  // 解決: ボタン押下時に即座に該当トーンの3レベルを生成
  // ============================================
  const handleToneSelect = async (toneId: string) => {
    // ロック中に別のトーンを選んだ場合はロック解除
    if (lockedTone && lockedTone !== toneId) {
      setLockedTone(null)
      setLockedLevel(0)
    }

    if (selectedTone === toneId) {
      // 同じトーンを再クリック → トーン解除
      setSelectedTone(null)
      selectedToneRef.current = null
      setToneLevel(0)
      setToneUiValue(0)
      setActiveToneBucket(0)
      currentBucketRef.current = 0
      setShowCustomInput(false)
      // フォアグラウンド処理をキャンセル
      if (foregroundAbortRef.current) {
        foregroundAbortRef.current.abort()
        foregroundAbortRef.current = null
      }
    } else {
      // 新しいトーンを選択
      setShowCustomInput(toneId === 'custom')
      setSelectedTone(toneId)
      selectedToneRef.current = toneId

      // 前回のフォアグラウンド処理をキャンセル
      if (foregroundAbortRef.current) {
        foregroundAbortRef.current.abort()
      }
      foregroundAbortRef.current = new AbortController()
      const foregroundController = foregroundAbortRef.current

      // カスタムは100%固定、他は0%から
      const initialLevel = toneId === 'custom' ? 100 : 0
      setToneLevel(initialLevel)
      setToneUiValue(initialLevel)
      setActiveToneBucket(initialLevel)
      currentBucketRef.current = initialLevel

      // ★ BUG-002修正: 翻訳結果がある場合 → 即座に3レベルを生成
      // カスタムはプリセット選択 or 自由入力後に変換する
      if (showPreview && preview.translation && toneId !== 'custom') {
        // TranslateScreenの場合はtranslateSelfTargetLang/detectedSelfLangを使用
        // ChatScreenの場合はundefinedを渡す（内部でcurrentPartner.languageが使われる）
        const targetLang = currentScreen === 'translate' ? translateSelfTargetLang : undefined
        const sourceLang = currentScreen === 'translate' ? (detectedSelfLang || '日本語') : undefined

        // ★★★ BUG-002修正: setTimeoutを削除し、即座に生成を開始 ★★★
        // キャンセルチェック
        if (foregroundController.signal.aborted || selectedToneRef.current !== toneId) {
          console.log('[handleToneSelect] Generation cancelled before start')
          return
        }

        // 即座に3レベルを生成（待機なし）
        console.log(`[handleToneSelect] ★ Starting immediate generation for tone: ${toneId}`)

        try {
          setIsTranslating(true)
          setTranslationError(null)

          // 選択されたトーンの3レベルを即座に生成
          await generateAndCacheUiBuckets({
            tone: toneId,
            isNative,
            sourceText: previewSourceText,
            currentUiBucket: initialLevel,
            customToneOverride: undefined,
            targetLang: targetLang || currentPartner?.language,
            sourceLang: sourceLang || '日本語',
            signal: foregroundController.signal,
            cachedStructure: extractedStructureRef.current  // refから構造情報を使う
          })

          // 生成完了後、キャッシュからプレビューを更新
          if (!foregroundController.signal.aborted && selectedToneRef.current === toneId) {
            const effectiveSourceLang = sourceLang || '日本語'
            const effectiveTargetLang = targetLang || currentPartner?.language
            const cacheKey = getCacheKey(toneId, initialLevel, previewSourceText, undefined, effectiveSourceLang, effectiveTargetLang, isNative)
            const cached = translationCacheRef.current[cacheKey]

            if (cached) {
              console.log(`[handleToneSelect] ★ Updating preview from cache: ${cacheKey}`)
              setPreview(prev => ({
                ...prev,
                translation: cached.translation,
                reverseTranslation: cached.reverseTranslation
              }))
            }
          }
        } catch (error) {
          if (!foregroundController.signal.aborted) {
            console.error('[handleToneSelect] Generation error:', error)
            setTranslationError('翻訳中にエラーが発生しました')
          }
        } finally {
          setIsTranslating(false)
        }
      }
    }
  }

  // ネイティブボタン押下（ボタン削除済みのため未使用、将来の拡張用に保持）
  const handleNativeToggle = () => {
    const newIsNative = !isNative
    setIsNative(newIsNative)

    // 翻訳結果がある場合 → 5バケット一括取得
    if (showPreview && preview.translation && selectedTone) {
      fetchAllBucketsForTone(selectedTone, newIsNative)
    }
  }
  void handleNativeToggle

  const getToneLabel = (toneId: string) => {
    switch(toneId) {
      case 'casual': return { left: '普通', right: 'くだけた' }
      case 'business': return { left: '普通', right: '仕事' }
      case 'formal': return { left: '普通', right: '丁寧' }
      case 'custom': return { left: '弱め', right: '強め' }
      default: return { left: '', right: '' }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setShowCopiedToast(true)
    setTimeout(() => setShowCopiedToast(false), 2000)
  }

  const handleConvert = async () => {
    if (!inputText.trim() || !currentPartner) return

    // sourceTextを固定
    const sourceText = inputText.trim()
    setPreviewSourceText(sourceText)

    // ロックされている場合は固定トーンで変換
    const effectiveTone = lockedTone || selectedTone || 'casual'
    const effectiveLevel = lockedTone ? lockedLevel ?? 0 : toneLevel

    // ロックトーンのUI更新
    if (lockedTone && !selectedTone) {
      setSelectedTone(lockedTone)
      setToneLevel(lockedLevel)
      setToneUiValue(lockedLevel)
      setActiveToneBucket(lockedLevel)
      currentBucketRef.current = lockedLevel
      if (lockedTone === 'custom') {
        setShowCustomInput(true)
      }
    }

    const normalizedToneLevel = effectiveTone === 'custom' ? 100 : normalizeLevel(effectiveLevel)
    const currentToneBucket = effectiveTone === 'custom' ? 100 : getBucketValue(normalizedToneLevel)
    const customToneValue = effectiveTone === 'custom' ? customTone : undefined
    const sourceLang = '日本語'
    const targetLang = currentPartner.language

    // UI反映
    setToneLevel(normalizedToneLevel)
    setToneUiValue(normalizedToneLevel)
    setActiveToneBucket(currentToneBucket)
    currentBucketRef.current = currentToneBucket

    // ★ キャッシュチェック（事前生成が完了していれば即座に表示）
    const cacheKey = getCacheKey(effectiveTone, currentToneBucket, sourceText, customToneValue, sourceLang, targetLang, isNative)
    const cached = translationCacheRef.current[cacheKey]

    if (cached) {
      // ★ キャッシュヒット → 即座に表示（待ち時間ゼロ！）
      setPreview(prev => ({
        ...prev,
        translation: cached.translation,
        reverseTranslation: cached.reverseTranslation
      }))
      setShowPreview(true)
      return
    }

    // ★ キャッシュミス → 従来通り生成（事前生成が間に合わなかった場合）
    setIsTranslating(true)
    setTranslationError(null)
    setShowPreview(false)

    try {
      await generateAndCacheUiBuckets({
        tone: effectiveTone,
        isNative,
        sourceText,
        currentUiBucket: currentToneBucket,
        customToneOverride: customToneValue,
        cachedStructure: extractedStructureRef.current  // refから構造情報を使う
      })

      const newCacheKey = getCacheKey(effectiveTone, currentToneBucket, sourceText, customToneValue, sourceLang, targetLang, isNative)
      const newCached = translationCacheRef.current[newCacheKey]
      if (newCached) {
        setPreview(prev => ({
          ...prev,
          translation: newCached.translation,
          reverseTranslation: newCached.reverseTranslation
        }))
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Translation error:', error)
      setTranslationError(error instanceof Error ? error.message : '翻訳に失敗しました')
    } finally {
      setIsTranslating(false)
    }
  }

  // スライダー変更時（キャッシュ参照のみ - APIは呼ばない！）
  const updatePreviewFromCache = (bucket: number) => {
    if (!selectedTone || !previewSourceText.trim()) return

    const effectiveSourceLang = currentScreen === 'translate' ? (detectedSelfLang || '日本語') : '日本語'
    const effectiveTargetLang = currentScreen === 'translate' ? translateSelfTargetLang : currentPartner?.language
    const cacheKey = getCacheKey(selectedTone, bucket, previewSourceText, customTone, effectiveSourceLang, effectiveTargetLang, isNative)
    const cached = translationCacheRef.current[cacheKey]

    if (cached) {
      console.log('[updatePreviewFromCache] HIT', { bucket, cacheKey, activeToneBucket })
      setPreview(prev => ({
        ...prev,
        translation: cached.translation,
        reverseTranslation: cached.reverseTranslation,
      }))
    } else {
      console.log('[updatePreviewFromCache] MISS', { bucket, cacheKey, activeToneBucket, isTranslating })
    }
  }

  const handleSend = () => {
    if (!inputText.trim() || !currentPartnerId || !showPreview || !currentPartner) return

    // ① 即コピー
    copyToClipboard(preview.translation)

    const messageId = Date.now()
    const translationText = preview.translation
    const originalText = inputText

    // ② メッセージ即追加（解説は空）
    const newMessage: Message = {
      id: messageId,
      type: 'self',
      original: originalText,
      translation: translationText,
      reverseTranslation: preview.reverseTranslation,
      explanation: {
        point: '',
        explanation: ''
      }
    }

    const partnerId = currentPartnerId
    const partnerLang = currentPartner.language

    setPartners(prev => prev.map(p =>
      p.id === partnerId
        ? { ...p, messages: [...p.messages, newMessage], lastMessage: translationText, lastTime: '今' }
        : p
    ))
    setInputText('')
    setShowPreview(false)
    setSelectedTone(null)  // トーン解除（スライダーを閉じる）
    setShowCustomInput(false)  // カスタム入力欄も閉じる
    // ※ lockedTone/lockedLevelはリセットしない（次回変換用に保持）

    // ③ バックグラウンドで解説取得（awaitしない）
    // TODO: チャット画面でも入力言語を動的に取得する場合は修正が必要
    const partnerLangCode = getLangCodeFromName(partnerLang)
    generateExplanation(translationText, 'ja', partnerLangCode, 'ja')
      .then(explanation => {
        setPartners(prev => prev.map(p =>
          p.id === partnerId
            ? {
                ...p,
                messages: p.messages.map(m =>
                  m.id === messageId ? { ...m, explanation } : m
                )
              }
            : p
        ))
      })
      .catch(err => {
        console.error('[handleSend] Explanation fetch error:', err)
      })
  }

  const handlePartnerMessageAdd = async () => {
    if (!partnerInputText.trim() || !currentPartnerId || !currentPartner) return

    const messageId = Date.now()
    const newMessage: Message = {
      id: messageId,
      type: 'partner',
      original: partnerInputText,
      translation: '（翻訳中...）',
      reverseTranslation: '',
      explanation: {
        point: '',
        explanation: ''
      }
    }

    // まずメッセージを追加（翻訳中状態）
    setPartners(partners.map(p =>
      p.id === currentPartnerId
        ? { ...p, messages: [...p.messages, newMessage], lastMessage: partnerInputText, lastTime: '今' }
        : p
    ))
    setPartnerInputText('')
    setShowPartnerInput(false)

    try {
      // 翻訳を実行
      const result = await translatePartnerMessage(partnerInputText, currentPartner.language)

      // 翻訳結果でメッセージを更新
      setPartners(prev => prev.map(p =>
        p.id === currentPartnerId
          ? {
              ...p,
              messages: p.messages.map(m =>
                m.id === messageId
                  ? {
                      ...m,
                      translation: result.translation,
                      explanation: result.explanation
                    }
                  : m
              )
            }
          : p
      ))
    } catch (error) {
      console.error('Translation error:', error)
      // エラー時はメッセージを更新
      setPartners(prev => prev.map(p =>
        p.id === currentPartnerId
          ? {
              ...p,
              messages: p.messages.map(m =>
                m.id === messageId
                  ? {
                      ...m,
                      translation: '（翻訳エラー）',
                      explanation: {
                        point: '',
                        explanation: 'エラーが発生しました'
                      }
                    }
                  : m
              )
            }
          : p
      ))
    }
  }

  // ============================================
  // 言語検出 v3（2026-02-02 シュワちゃん版統合）
  // 4段階方式: CJK → 拡張特徴文字 → 単語リスト → n-gram統計
  // Based on: language-detector.js by シュワちゃん
  // ============================================

  // n-gramプロファイル（シュワちゃん事前計算）
  const LANGUAGE_PROFILES: Record<string, string[]> = {
    '日本語': ['は', 'す', 'い', 'す_', 'です', 'ます', '日本', '本語', '日本語', 'こん', 'にち', 'ちは', 'あり', 'がと', 'とう'],
    '英語': ['the', 'is', 'are', 'you', 'to', 'and', 'in', 'it', 'of', 'that', 'have', 'for', 'not', 'with', 'this'],
    'フランス語': ['le', 'la', 'les', 'de', 'est', 'et', 'en', 'un', 'une', 'je', 'vous', 'que', 'ne', 'pas', 'pour'],
    'スペイン語': ['el', 'la', 'de', 'que', 'es', 'en', 'un', 'una', 'los', 'las', 'no', 'por', 'con', 'para', 'se'],
    'ドイツ語': ['der', 'die', 'und', 'in', 'ist', 'das', 'den', 'ich', 'sie', 'es', 'nicht', 'mit', 'ein', 'eine', 'auf'],
    'イタリア語': ['il', 'la', 'di', 'che', 'e', 'un', 'una', 'in', 'per', 'non', 'sono', 'con', 'lo', 'gli', 'le'],
    'ポルトガル語': ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'se'],
    '韓国語': ['요', '니다', '안녕', '하세요', '감사', '합니다', '는', '이', '가', '을', '를', '에', '에서', '와', '과'],
    '中国語': ['的', '是', '了', '在', '有', '我', '他', '她', '你', '们', '这', '那', '好', '中', '文'],
    'チェコ語': ['je', 'se', 'na', 'v', 'a', 'že', 'do', 'pro', 'to', 'ne', 'si', 'tak', 'jak', 'ale', 'co']
  }

  // ラテン系言語の拡張特徴
  const LATIN_FEATURES: Record<string, { unique: string; chars: string; bigrams: string[] }> = {
    'フランス語': { unique: 'çœ', chars: 'çéèêëàâîïôùûüœ', bigrams: ['ai', 'au', 'ou', 'eu', 'oi', 'on', 'an', 'en'] },
    'スペイン語': { unique: 'ñ¿¡', chars: 'áéíóúüñ', bigrams: ['ue', 'ie', 'io', 'ia', 'ei'] },
    'ドイツ語': { unique: 'ß', chars: 'äöüß', bigrams: ['ch', 'sch', 'ei', 'ie', 'au', 'eu'] },
    'イタリア語': { unique: 'ìò', chars: 'àèéìòù', bigrams: ['ch', 'gh', 'sc', 'gn', 'gl'] },
    'ポルトガル語': { unique: 'ãõ', chars: 'áàâãçéêíóôõú', bigrams: ['ão', 'õe', 'ai', 'ei', 'ou'] },
    'チェコ語': { unique: 'řů', chars: 'áčďéěíňóřšťúůýž', bigrams: ['ch', 'st', 'ní', 'tí'] },
    '英語': { unique: '', chars: '', bigrams: [] }
  }

  // 一般的な単語リスト（v3.2: merci, beaucoup, stai追加）
  const COMMON_WORDS: Record<string, string[]> = {
    '英語': ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'this', 'that', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'do', 'does', 'not', 'can', 'will', 'would', 'could', 'should', 'what', 'how', 'why', 'when', 'where', 'who', 'come', 'here', 'there', 'go', 'get', 'make', 'know', 'think', 'take', 'see', 'want', 'just', 'now', 'only', 'very', 'also', 'back', 'after', 'use', 'our', 'out', 'up', 'other', 'into', 'more', 'some', 'time', 'so', 'if', 'no', 'than', 'them', 'then', 'way', 'look', 'first', 'new', 'because', 'day', 'people', 'over', 'such', 'through', 'long', 'little', 'own', 'good', 'man', 'too', 'any', 'same', 'tell', 'work', 'last', 'most', 'need', 'feel', 'high', 'much', 'off', 'old', 'right', 'still', 'mean', 'keep', 'let', 'put', 'did', 'had', 'got'],
    'フランス語': ['le', 'la', 'les', 'un', 'une', 'est', 'sont', 'ai', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'de', 'et', 'en', 'ce', 'cette', 'mon', 'ton', 'son', 'ne', 'pas', 'que', 'qui', 'mais', 'ou', 'donc', 'car', 'comprends', 'comprend', 'suis', 'es', 'fait', 'faire', 'avoir', 'pour', 'avec', 'sur', 'dans', 'par', 'merci', 'beaucoup', 'bonjour', 'bonsoir', 'comment', 'allez', 'bien', 'très', 'oui', 'non'],
    'スペイン語': ['el', 'la', 'los', 'las', 'un', 'una', 'es', 'son', 'yo', 'tu', 'él', 'ella', 'mi', 'su', 'de', 'y', 'en', 'que', 'no', 'tengo', 'tiene', 'pero', 'como', 'para', 'por', 'con', 'entiendo', 'entiende', 'hablo', 'habla', 'puedo', 'puede', 'quiero', 'quiere', 'gracias', 'hola', 'buenos', 'buenas', 'muy', 'bien'],
    'ドイツ語': ['der', 'die', 'das', 'ein', 'eine', 'ist', 'sind', 'war', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'mein', 'dein', 'sein', 'und', 'mit', 'für', 'auf', 'nicht', 'aber', 'oder', 'wenn', 'wie', 'geht', 'ihnen', 'haben', 'werden', 'kann', 'guten', 'tag', 'morgen', 'danke', 'bitte', 'gut', 'sehr'],
    'イタリア語': ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'e', 'sono', 'ho', 'hai', 'ha', 'io', 'tu', 'lui', 'lei', 'noi', 'di', 'che', 'non', 'ma', 'come', 'per', 'con', 'capisco', 'capisce', 'parlo', 'parla', 'posso', 'voglio', 'bene', 'molto', 'questo', 'quello', 'stai', 'sta', 'sto', 'grazie', 'ciao', 'buongiorno', 'buonasera'],
    'ポルトガル語': ['o', 'a', 'os', 'as', 'um', 'uma', 'são', 'tenho', 'tem', 'eu', 'tu', 'ele', 'ela', 'nós', 'de', 'em', 'que', 'não', 'com', 'para', 'por', 'mas', 'entendo', 'entende', 'falo', 'fala', 'posso', 'pode', 'quero', 'quer', 'muito', 'bem', 'obrigado', 'obrigada', 'bom', 'dia', 'tudo'],
    'チェコ語': ['ten', 'ta', 'to', 'je', 'jsou', 'byl', 'já', 'ty', 'on', 'ona', 'my', 'vy', 'z', 'na', 'v', 'a', 'že', 'do', 'pro', 'ale', 'jak', 'máte', 'mám', 'rozumím', 'mluvím', 'dobrý', 'den', 'děkuji']
  }

  const detectLanguage = (text: string): string => {
    if (!text.trim()) return ''

    const textLower = text.toLowerCase()

    // ===== Stage 1: 固有スクリプト検出（CJK言語） =====
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return '日本語' // ひらがな・カタカナ
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return '韓国語' // ハングル
    if (/[\u4E00-\u9FFF]/.test(text)) return '中国語' // 漢字

    // ===== Stage 2: 拡張特徴文字検出（ラテン系言語） =====
    const latinScores: Record<string, number> = {}
    for (const [lang, features] of Object.entries(LATIN_FEATURES)) {
      latinScores[lang] = 0
      // 固有文字（高い重み）
      for (const char of features.unique) {
        if (textLower.includes(char)) latinScores[lang] += 5
      }
      // 特徴文字
      for (const char of features.chars) {
        if (textLower.includes(char)) latinScores[lang] += 1
      }
      // バイグラム
      for (const bigram of features.bigrams) {
        if (textLower.includes(bigram)) latinScores[lang] += 0.5
      }
    }

    // 固有文字で確定できる場合
    const maxLatinScore = Math.max(0, ...Object.values(latinScores))
    if (maxLatinScore >= 5) {
      const bestLang = Object.entries(latinScores).sort((a, b) => b[1] - a[1])[0][0]
      return bestLang
    }

    // ===== Stage 3: 単語リスト検出 =====
    const wordScores: Record<string, number> = {}
    const words = textLower.match(/\b\w+\b/g) || []
    
    for (const [lang, commonWords] of Object.entries(COMMON_WORDS)) {
      wordScores[lang] = 0
      for (const word of words) {
        if (commonWords.includes(word)) wordScores[lang] += 1
      }
    }

    // ラテン特徴スコアを加算
    for (const lang of Object.keys(wordScores)) {
      if (latinScores[lang]) {
        wordScores[lang] += latinScores[lang]
      }
    }

    // 最高スコアの言語を返す
    const maxWordScore = Math.max(0, ...Object.values(wordScores))
    if (maxWordScore >= 2) {
      const sortedScores = Object.entries(wordScores).sort((a, b) => b[1] - a[1])
      const [bestLang, bestScore] = sortedScores[0]
      const englishScore = wordScores['英語'] || 0
      // 英語との差が1点以上あれば他言語を返す（v3.3: 条件緩和）
      if (bestLang !== '英語' && bestScore > englishScore) {
        return bestLang
      } else if (bestLang === '英語') {
        return '英語'
      }
      // 同点の場合は最高スコアの言語を返す
      if (bestScore >= 2) {
        return bestLang
      }
    }

    // ===== Stage 4: n-gram統計的検出 =====
    const extractNgrams = (t: string): string[] => {
      const ngrams: Record<string, number> = {}
      const normalized = t.toLowerCase().trim().replace(/\s+/g, ' ')
      for (const n of [1, 2, 3]) {
        const padded = '_'.repeat(n - 1) + normalized + '_'.repeat(n - 1)
        for (let i = 0; i <= padded.length - n; i++) {
          const ngram = padded.slice(i, i + n)
          ngrams[ngram] = (ngrams[ngram] || 0) + 1
        }
      }
      return Object.entries(ngrams).sort((a, b) => b[1] - a[1]).map(([ng]) => ng)
    }

    const textNgrams = extractNgrams(text)
    const ngramScores: Record<string, number> = {}

    // ラテン文字のみの場合はCJK言語を除外
    const isLatinOnly = text.split('').every(c => (c.codePointAt(0) || 0) < 0x3000)
    const candidateLangs = isLatinOnly 
      ? ['英語', 'フランス語', 'スペイン語', 'ドイツ語', 'イタリア語', 'ポルトガル語', 'チェコ語']
      : Object.keys(LANGUAGE_PROFILES)

    for (const lang of candidateLangs) {
      const profile = LANGUAGE_PROFILES[lang]
      if (!profile) continue
      let score = 0
      const profileSet = new Set(profile)
      for (let i = 0; i < Math.min(textNgrams.length, 30); i++) {
        if (profileSet.has(textNgrams[i])) {
          score += Math.max(0, profile.length - profile.indexOf(textNgrams[i]))
        }
      }
      // ラテン特徴スコアを加味
      if (latinScores[lang]) score *= (1 + latinScores[lang] * 0.1)
      ngramScores[lang] = score
    }

    const totalScore = Object.values(ngramScores).reduce((a, b) => a + b, 0)
    if (totalScore > 0) {
      const sortedNgram = Object.entries(ngramScores).sort((a, b) => b[1] - a[1])
      return sortedNgram[0][0]
    }

    // デフォルトは英語
    return '英語'
  }

  // TranslateScreen: 相手のメッセージを翻訳
  const handleTranslatePartnerMessage = async () => {
    if (!translatePartnerText.trim()) return

    const sourceText = translatePartnerText.trim()
    const detected = translatePartnerSourceLang === '自動認識' ? detectLanguage(sourceText) : translatePartnerSourceLang
    setDetectedPartnerLang(detected)

    // 言語連動: 相手言語 → 自分のターゲット言語（手動設定されていない場合のみ）
    if (!selfTargetLangManuallySet && detected) {
      setTranslateSelfTargetLang(detected)
    }

    const messageId = Date.now()
    const newMessage: Message = {
      id: messageId,
      type: 'partner',
      original: sourceText,
      translation: '（翻訳中...）',
      reverseTranslation: '',
      explanation: { point: '', explanation: '' }
    }

    setTranslateMessages(prev => [...prev, newMessage])
    setTranslatePartnerText('')
    setHideSelfSection(false)

    // 非同期処理用に値を保持
    const sourceLangAtRequest = detected
    const targetLangAtRequest = translatePartnerTargetLang

    try {
      const result = await translateFull({
        sourceText,
        sourceLang: sourceLangAtRequest,
        targetLang: targetLangAtRequest,
        isNative: false,
        tone: 'casual',
        toneLevel: 50
      })

      // AI検出の言語があれば更新（より正確）
      if (result.detected_language && translatePartnerSourceLang === '自動認識') {
        setDetectedPartnerLang(result.detected_language)
        // 言語連動: 相手言語 → 自分のターゲット言語（手動設定されていない場合のみ）
        if (!selfTargetLangManuallySet) {
          setTranslateSelfTargetLang(result.detected_language)
        }
      }

      setTranslateMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, translation: result.translation }
          : m
      ))

      // バックグラウンドで解説取得（相手の言語について解説）
      // 第1引数: 元のテキスト（相手の言語）
      // 第3引数: 相手の言語（この言語について解説）
      // 第4引数: 解説の出力言語（ユーザーの言語 = 翻訳先）
      const targetLangCode = getLangCodeFromName(targetLangAtRequest)
      const sourceLangCode = getLangCodeFromName(sourceLangAtRequest)
      generateExplanation(sourceText, targetLangCode, sourceLangCode, targetLangCode)
        .then(explanation => {
          setTranslateMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, explanation } : m
          ))
        })
        .catch(err => {
          console.error('[handleTranslatePartnerMessage] Explanation fetch error:', err)
        })
    } catch (error) {
      console.error('Translation error:', error)
      setTranslateMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, translation: '（翻訳エラー）' }
          : m
      ))
    }
  }

  // TranslateScreen: 自分のメッセージを変換
  const handleTranslateConvert = async () => {
    if (!translateSelfText.trim()) return

    const sourceText = translateSelfText.trim()
    // 翻訳ボタン押下時は常に最新のテキストで言語検出（前の検出結果を使わない）
    const detected = translateSelfSourceLang === '自動認識'
      ? detectLanguage(sourceText)
      : translateSelfSourceLang
    setDetectedSelfLang(detected)
    setPreviewSourceText(sourceText)

    // ★ 新しい翻訳時は0%から表示（ロックされてる場合はそのレベル）
    if (!lockedTone && selectedTone) {
      setToneLevel(0)
      setToneUiValue(0)
      setActiveToneBucket(0)
      currentBucketRef.current = 0
    }

    // ★ トーン未選択の場合は0%のみ、選択済みなら全バケット生成
    const isToneSelected = !!(lockedTone || selectedTone)
    const effectiveTone = lockedTone || selectedTone || 'casual'
    const effectiveLevel = lockedTone ? lockedLevel ?? 0 : 0  // 常に0%から開始

    if (lockedTone && !selectedTone) {
      setSelectedTone(lockedTone)
      setToneLevel(lockedLevel)
      setToneUiValue(lockedLevel)
      setActiveToneBucket(lockedLevel)
      currentBucketRef.current = lockedLevel
      if (lockedTone === 'custom') {
        setShowCustomInput(true)
      }
    }

    const normalizedToneLevel = effectiveTone === 'custom' ? 100 : normalizeLevel(effectiveLevel)
    const currentToneBucket = effectiveTone === 'custom' ? 100 : (isToneSelected ? getBucketValue(normalizedToneLevel) : 0)
    const customToneValue = effectiveTone === 'custom' ? customTone : undefined
    const sourceLang = detected
    const targetLang = translateSelfTargetLang

    // UI反映
    setToneLevel(normalizedToneLevel)
    setToneUiValue(normalizedToneLevel)
    setActiveToneBucket(currentToneBucket)
    currentBucketRef.current = currentToneBucket

    // ★ キャッシュチェック（事前生成が完了していれば即座に表示）
    const cacheKey = getCacheKey(effectiveTone, currentToneBucket, sourceText, customToneValue, sourceLang, targetLang, isNative)
    const cached = translationCacheRef.current[cacheKey]

    if (cached) {
      // ★ キャッシュヒット → 即座に表示（待ち時間ゼロ！）
      setPreview(prev => ({
        ...prev,
        translation: cached.translation,
        reverseTranslation: cached.reverseTranslation
      }))
      setShowPreview(true)
      return
    }

    // ★ キャッシュミス → 生成
    setIsTranslating(true)
    setTranslationError(null)
    setShowPreview(false)

    // ★ 構造化M抽出 v2（日本語の場合のみ）
    // 結果はrefに保存して、トーン切り替え時も使い回す
    let structurePromise: Promise<ExpandedStructure | undefined> | undefined
    if (sourceLang === '日本語') {
      // 同じ原文なら再抽出しない
      if (structureSourceTextRef.current !== sourceText) {
        structurePromise = extractStructure(sourceText).then(structure => {
          extractedStructureRef.current = structure
          structureSourceTextRef.current = sourceText
          console.log('[handleTranslateConvert] Structure extracted and saved to ref:', structure)
          return structure
        }).catch(err => {
          console.error('[handleTranslateConvert] Structure extraction failed:', err)
          return undefined
        })
        console.log('[handleTranslateConvert] Structure extraction started (parallel with 0% translation)')
      } else {
        // 既に抽出済みならそれを使う
        console.log('[handleTranslateConvert] Using cached structure from ref:', extractedStructureRef.current)
        structurePromise = Promise.resolve(extractedStructureRef.current)
      }
    }

    try {
      if (isToneSelected) {
        // ★ トーン選択済み → 全バケット生成（従来通り）
        await generateAndCacheUiBuckets({
          tone: effectiveTone,
          isNative,
          sourceText,
          currentUiBucket: currentToneBucket,
          customToneOverride: customToneValue,
          targetLang,
          sourceLang,
          structurePromise  // Promiseを渡す（0%と並列実行）
        })
      } else {
        // ★ トーン未選択 → 0%だけ生成（基本翻訳のみ）
        // 構造抽出の完了を待ってから翻訳（構造情報も使う）
        let structureForTranslate: ExpandedStructure | undefined
        if (structurePromise) {
          structureForTranslate = await structurePromise
        }
        const result = await translateFull({
          sourceText,
          sourceLang,
          targetLang,
          isNative,
          tone: 'casual',
          toneLevel: 0,
          customTone: undefined,
          structure: structureForTranslate
        })
        // AI検出の言語があれば更新（より正確）
        if (result.detected_language && translateSelfSourceLang === '自動認識') {
          setDetectedSelfLang(result.detected_language)
        }
        // 0%のキャッシュに保存
        const cacheKey0 = getCacheKey('casual', 0, sourceText, undefined, sourceLang, targetLang, isNative)
        updateTranslationCache({
          [cacheKey0]: {
            translation: result.translation,
            reverseTranslation: result.reverse_translation
          }
        })
      }

      const newCacheKey = getCacheKey(effectiveTone, currentToneBucket, sourceText, customToneValue, sourceLang, targetLang, isNative)
      const newCached = translationCacheRef.current[newCacheKey]
      if (newCached) {
        setPreview(prev => ({
          ...prev,
          translation: newCached.translation,
          reverseTranslation: newCached.reverseTranslation
        }))
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Translation error:', error)
      setTranslationError(error instanceof Error ? error.message : '翻訳に失敗しました')
    } finally {
      setIsTranslating(false)
    }
  }

  // TranslateScreen: 送信（コピー＆メッセージ追加）
  const handleTranslateSend = () => {
    if (!translateSelfText.trim() || !showPreview) return

    copyToClipboard(preview.translation)

    const messageId = Date.now()
    const newMessage: Message = {
      id: messageId,
      type: 'self',
      original: translateSelfText,
      translation: preview.translation,
      reverseTranslation: preview.reverseTranslation,
      explanation: { point: '', explanation: '' }
    }

    const effectiveSourceLang = detectedSelfLang || '日本語'

    setTranslateMessages(prev => [...prev, newMessage])
    setTranslateSelfText('')
    setShowPreview(false)
    setSelectedTone(null)
    setShowCustomInput(false)

    // バックグラウンドで解説取得（原文の言語で解説）
    const srcLangCode = getLangCodeFromName(effectiveSourceLang)
    const tgtLangCode = getLangCodeFromName(translateSelfTargetLang)
    generateExplanation(preview.translation, srcLangCode, tgtLangCode, srcLangCode)
      .then(explanation => {
        setTranslateMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, explanation } : m
        ))
      })
      .catch(err => {
        console.error('[handleTranslateSend] Explanation fetch error:', err)
      })
  }

  // TranslateScreen: 既存パートナーにメッセージを追加
  const handleAddToExistingPartner = (partnerId: number) => {
    if (translateMessages.length === 0) return

    const partner = partners.find(p => p.id === partnerId)
    if (!partner) return

    const lastMessage = translateMessages[translateMessages.length - 1]

    setPartners(prev => prev.map(p =>
      p.id === partnerId
        ? {
            ...p,
            messages: [...p.messages, ...translateMessages],
            lastMessage: lastMessage.translation,
            lastTime: '今'
          }
        : p
    ))

    setTranslateMessages([])
    setShowSelectPartnerModal(false)
    setShowSaveModal(false)
    setCurrentPartnerId(partnerId)
    setCurrentScreen('chat')
  }

  const handleAddPartner = () => {
    if (!newPartnerName.trim()) return

    const langOption = languageOptions.find(l => l.label === newPartnerLanguage)

    // TranslateScreenからの追加の場合、translateMessagesを含める
    const initialMessages = currentScreen === 'translate' && translateMessages.length > 0 ? translateMessages : []
    const lastMsg = initialMessages.length > 0 ? initialMessages[initialMessages.length - 1] : null

    const newPartner: Partner = {
      id: Date.now(),
      name: newPartnerName,
      language: newPartnerLanguage,
      flag: langOption?.flag || '🌐',
      avatar: '👤',
      lastMessage: lastMsg ? lastMsg.translation : '',
      lastTime: lastMsg ? '今' : '',
      tag: selectedTag === 'all' ? undefined : selectedTag,
      messages: initialMessages
    }

    setPartners([newPartner, ...partners])
    setNewPartnerName('')
    setNewPartnerLanguage('英語')
    setShowAddPartner(false)

    // TranslateScreenからの場合、モーダルを閉じてメッセージをクリア
    if (currentScreen === 'translate') {
      setTranslateMessages([])
      setShowSaveModal(false)
    }

    // 新しい相手のチャットを開く
    setCurrentPartnerId(newPartner.id)
    setCurrentScreen('chat')
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: newTagName,
      isDefault: false
    }
    setTags([...tags, newTag])
    setNewTagName('')
    setShowAddTag(false)
  }

  const handleEditTag = (tag: Tag) => {
    if (tag.isDefault) return
    setEditingTagId(tag.id)
    setEditingTagName(tag.name)
  }

  const handleSaveTag = () => {
    if (!editingTagName.trim() || !editingTagId) return
    setTags(tags.map(t =>
      t.id === editingTagId ? { ...t, name: editingTagName } : t
    ))
    setEditingTagId(null)
    setEditingTagName('')
  }

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    if (tag?.isDefault) return

    if (confirm(`タグ「${tag?.name}」を削除しますか？`)) {
      setTags(tags.filter(t => t.id !== tagId))
      setPartners(partners.map(p =>
        p.tag === tagId ? { ...p, tag: undefined } : p
      ))
      if (selectedTag === tagId) {
        setSelectedTag('all')
      }
    }
  }

  // フィルタリングされたパートナーリスト（ピン留めを上部に）
  const filteredPartners = (selectedTag === 'all'
    ? partners
    : partners.filter(p => p.tag === selectedTag)
  ).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })

  const updatePartner = (updates: Partial<Partner>) => {
    setPartners(partners.map(p =>
      p.id === currentPartnerId ? { ...p, ...updates } : p
    ))
  }

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  // 長押しハンドラー
  const handleLongPressStart = (partner: Partner, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    longPressTimer.current = window.setTimeout(() => {
      triggerHaptic()
      setContextMenuPartner(partner)
      setContextMenuPosition({ x: clientX, y: clientY })
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePartnerClick = (partner: Partner) => {
    if (!contextMenuPartner) {
      // パートナー切り替え時にチャット関連ステートをリセット
      setInputText('')
      setPreviewSourceText('')
      setSelectedTone(null)
      setToneLevel(0)
      setToneUiValue(0)
      setActiveToneBucket(0)
      currentBucketRef.current = 0
      setShowPreview(false)
      setPreview({
        translation: '',
        reverseTranslation: '',
        explanation: { point: '', explanation: '' }
      })
      setTranslationError(null)
      setTranslationCache({})
      translationCacheRef.current = {}
      setCustomTone('')
      setShowCustomInput(false)

      setCurrentPartnerId(partner.id)
      setCurrentScreen('chat')
    }
  }

  const closeContextMenu = () => {
    setContextMenuPartner(null)
    setShowDeleteConfirm(false)
    setShowTagChangeModal(false)
  }

  const handleTogglePin = () => {
    if (contextMenuPartner) {
      setPartners(partners.map(p =>
        p.id === contextMenuPartner.id ? { ...p, isPinned: !p.isPinned } : p
      ))
      closeContextMenu()
    }
  }

  const handleDeletePartner = () => {
    if (contextMenuPartner) {
      setPartners(partners.filter(p => p.id !== contextMenuPartner.id))
      closeContextMenu()
    }
  }

  const handleChangePartnerTag = (tagId: string) => {
    if (contextMenuPartner) {
      setPartners(partners.map(p =>
        p.id === contextMenuPartner.id ? { ...p, tag: tagId || undefined } : p
      ))
      closeContextMenu()
    }
  }

  // 対面モード関連の関数
  const startFaceToFaceMode = () => {
    setPrevScreenBeforeFaceToFace('chat')
    setCurrentScreen('face-to-face')
    setFaceToFaceMode('idle')
    setFaceToFaceInput('')
    setFaceToFaceResult(null)
    setF2fPartnerLanguage(currentPartner?.language || '英語')
  }

  const exitFaceToFaceMode = () => {
    setCurrentScreen(prevScreenBeforeFaceToFace)
    setFaceToFaceMode('idle')
    setFaceToFaceInput('')
    setFaceToFaceResult(null)
  }

  const handleFaceToFaceTranslateAsync = async (mode: 'self' | 'partner') => {
    setFaceToFaceMode(mode)  // 最初に実行（テキスト未入力でもボタンの色は変わる）

    const inputText = faceToFaceInputRef.current.trim()
    if (!inputText) return

    const sourceLang = mode === 'self' ? f2fMyLanguage : f2fPartnerLanguage
    const targetLang = mode === 'self' ? f2fPartnerLanguage : f2fMyLanguage

    try {
      const result = await translateFull({
        sourceText: inputText,
        sourceLang,
        targetLang,
        isNative: false,
      })
      setFaceToFaceResult({
        original: inputText,
        translation: result.translation,
      })
    } catch (error) {
      console.error('Translation error:', error)
      setFaceToFaceResult({
        original: inputText,
        translation: '翻訳エラーが発生しました',
      })
    }
  }

  const handleFaceToFaceTranslate = (mode: 'self' | 'partner') => {
    handleFaceToFaceTranslateAsync(mode)
  }

  const fallbackSpeak = (text: string) => {
    const targetLang = faceToFaceMode === 'self' ? f2fPartnerLanguage : f2fMyLanguage
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langCodeMap[targetLang] || 'en-US'
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    speechSynthesis.speak(utterance)
  }

  const openaiSpeak = async (text: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/tts-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: 'nova',
        }),
      })

      if (!response.ok) {
        return false
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      audioUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
      }

      await audio.play()
      return true
    } catch (error) {
      console.error('OpenAI TTS error:', error)
      return false
    }
  }

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking()
      return
    }

    try {
      setIsSpeaking(true)

      const response = await fetch('/api/tts-elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
        }),
      })

      if (!response.ok) {
        throw new Error('ElevenLabs API error')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      audioUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
      }

      await audio.play()
    } catch (error) {
      console.error('ElevenLabs TTS error:', error)
      // OpenAI TTSにフォールバック
      const openaiSuccess = await openaiSpeak(text)
      if (!openaiSuccess) {
        // OpenAIも失敗したらブラウザ内蔵TTSにフォールバック
        setIsSpeaking(false)
        fallbackSpeak(text)
      }
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  // 音声入力機能
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('お使いのブラウザは音声入力に対応していません')
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    // 言語設定（自分モード→自分言語、相手モード→相手言語で認識）
    const targetLang = faceToFaceMode === 'self' ? f2fMyLanguage : f2fPartnerLanguage
    const langCode = langCodeMap[targetLang] || 'en-US'

    recognition.lang = langCode
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      // 無音タイマーをリセット
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }

      const results = event.results
      let transcript = ''
      for (let i = 0; i < results.length; i++) {
        transcript += results[i][0].transcript
      }
      setFaceToFaceInput(transcript)

      // 確定結果の場合、無音タイマー開始
      const isFinal = results[results.length - 1].isFinal
      if (isFinal) {
        silenceTimerRef.current = setTimeout(() => {
          stopListening()
        }, SILENCE_TIMEOUT)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      // タイマークリア
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      // 入力があれば自動翻訳
      if (faceToFaceInputRef.current.trim()) {
        const mode = faceToFaceModeRef.current === 'idle' ? 'self' : faceToFaceModeRef.current
        handleFaceToFaceTranslateAsync(mode)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // 現在のバケット追跡用ref（ToneSliderで使用）
  const currentBucketRef = useRef(getBucketValue(toneLevel))

  // ニュアンスボタン（トーンボタンは nuance-container に移動済み、将来の拡張用に保持）
  const NuanceButtons = () => null
  void NuanceButtons

  // 設定モーダル
  const SettingsModal = () => {
    const [editName, setEditName] = useState(currentPartner?.name || '')
    const [editLanguage, setEditLanguage] = useState(currentPartner?.language || '英語')
    const [editAvatar, setEditAvatar] = useState<string | null>(currentPartner?.avatar || '👤')
    const [editAvatarImage, setEditAvatarImage] = useState<string | null>(currentPartner?.avatarImage || null)
    const [editTag, setEditTag] = useState<string>(currentPartner?.tag || '')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setEditAvatarImage(reader.result as string)
          setEditAvatar(null)
        }
        reader.readAsDataURL(file)
      }
    }

    const handleEmojiSelect = (emoji: string) => {
      setEditAvatar(emoji)
      setEditAvatarImage(null)
    }

    const handleSave = () => {
      const langOption = languageOptions.find(l => l.label === editLanguage) || languageOptions[0]
      updatePartner({
        name: editName,
        language: editLanguage,
        flag: langOption.flag,
        avatar: editAvatar || '👤',
        avatarImage: editAvatarImage,
        tag: editTag || undefined
      })
      setShowSettings(false)
    }

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">相手の設定</h3>

          {/* 現在のアイコンプレビュー */}
          <div className="avatar-preview">
            {editAvatarImage ? (
              <img src={editAvatarImage} alt="アイコン" className="avatar-image-large" />
            ) : (
              <div className="avatar-emoji-large">{editAvatar || '👤'}</div>
            )}
          </div>

          <div className="form-group">
            <label>絵文字アイコン</label>
            <div className="avatar-options">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => handleEmojiSelect(avatar)}
                  className={`avatar-option ${editAvatar === avatar && !editAvatarImage ? 'selected' : ''}`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>画像をアップロード</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="upload-btn"
            >
              <Camera size={16} strokeWidth={2.5} /> 画像を選択
            </button>
            {editAvatarImage && (
              <button
                onClick={() => {
                  setEditAvatarImage(null)
                  setEditAvatar('👤')
                }}
                className="remove-image-btn"
              >
                画像を削除
              </button>
            )}
          </div>

          <div className="form-group">
            <label>名前</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>言語</label>
            <select
              value={editLanguage}
              onChange={(e) => setEditLanguage(e.target.value)}
              className="form-select"
            >
              {languageOptions.map((lang) => (
                <option key={lang.label} value={lang.label}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>タグ</label>
            <select
              value={editTag}
              onChange={(e) => setEditTag(e.target.value)}
              className="form-select"
            >
              <option value="">なし</option>
              {tags.filter(t => t.id !== 'all').map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-buttons">
            <button onClick={() => setShowSettings(false)} className="btn-cancel">
              キャンセル
            </button>
            <button onClick={handleSave} className="btn-save">
              保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 保存モーダル
  const SaveModal = () => (
    <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
      <div className="modal-content save-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">会話を保存</h3>
        <div className="save-options">
          <button
            onClick={() => {
              setShowSaveModal(false)
              setShowSelectPartnerModal(true)
            }}
            className="save-option-btn"
          >
            📋 既存の友達に追加
          </button>
          <button
            onClick={() => {
              setShowSaveModal(false)
              setShowAddPartner(true)
            }}
            className="save-option-btn"
          >
            ➕ 新しい友達を追加
          </button>
        </div>
        <button onClick={() => setShowSaveModal(false)} className="btn-cancel">
          キャンセル
        </button>
      </div>
    </div>
  )

  // パートナー選択モーダル
  const SelectPartnerModal = () => (
    <div className="modal-overlay" onClick={() => setShowSelectPartnerModal(false)}>
      <div className="modal-content select-partner-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">保存先を選択</h3>
        <div className="partner-select-list">
          {partners.length === 0 ? (
            <p className="empty-text">友達がいません</p>
          ) : (
            partners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => handleAddToExistingPartner(partner.id)}
                className="partner-select-item"
              >
                {partner.avatarImage ? (
                  <img src={partner.avatarImage} alt={partner.name} className="partner-select-avatar-image" />
                ) : (
                  <span className="partner-select-avatar">{partner.avatar}</span>
                )}
                <span className="partner-select-name">{partner.name}</span>
                <span className="partner-select-lang">{partner.flag} {partner.language}</span>
              </button>
            ))
          )}
        </div>
        <button onClick={() => setShowSelectPartnerModal(false)} className="btn-cancel">
          キャンセル
        </button>
      </div>
    </div>
  )

  // 言語オプション（自動認識付き）
  const translateLanguageOptions = [
    { label: '自動認識', flag: '🌐' },
    ...languageOptions
  ]

  // TranslateScreen
  const TranslateScreen = () => (
    <div className="screen-container translate-screen">
      {/* 操作ボタン行 */}
      <div className="translate-action-row">
        <button
          onClick={() => setShowSaveModal(true)}
          className="translate-action-btn"
          disabled={translateMessages.length === 0}
        >
          トーク保存
        </button>
        <button
          onClick={() => setCurrentScreen('list')}
          className="translate-action-btn"
        >
          📋 トークルーム
        </button>
        <button
          onClick={() => {
            setPrevScreenBeforeFaceToFace('translate')
            setCurrentScreen('face-to-face')
          }}
          className="translate-action-btn"
        >
          🎤 対面モード
        </button>
        <button onClick={() => setShowSettings(true)} className="settings-btn">
          <Settings size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* メッセージ表示エリア */}
      <div className="translate-messages-area">
        {translateMessages.length === 0 ? (
          <div className="empty-messages">
            <p>翻訳したメッセージがここに表示されます</p>
          </div>
        ) : (
          translateMessages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.type === 'self' ? 'self' : 'partner'}`}>
              <div className={`message-bubble ${msg.type === 'self' ? 'self' : 'partner'}`}>
                <p className="message-text">
                  {msg.type === 'self' ? msg.translation : msg.original}
                </p>
                <p className="message-translation">
                  （{msg.type === 'self' ? msg.reverseTranslation : msg.translation}）
                </p>
                <button
                  onClick={() => setExpandedExplanation(expandedExplanation === msg.id ? null : msg.id)}
                  className={`explanation-toggle ${msg.type === 'self' ? 'self' : 'partner'}`}
                >
                  {expandedExplanation === msg.id ? '▲ 解説を閉じる' : '▼ 解説'}
                </button>
                {expandedExplanation === msg.id && (
                  <div className={`explanation-box ${msg.type === 'self' ? 'self' : 'partner'}`}>
                    {msg.explanation.explanation ? (
                      <>
                        {msg.explanation.point && (
                          <div className="explanation-point-box">
                            <span className="point-icon">💡</span>
                            <span className="point-text">{msg.explanation.point}</span>
                          </div>
                        )}
                        <p className="explanation-text">{msg.explanation.explanation}</p>
                      </>
                    ) : (
                      <div className="explanation-loading">
                        <Loader2 size={20} className="spin" />
                        <span>解説を読み込み中...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 翻訳したい文章入力欄（自分側を操作中は隠す） */}
      <div 
        className="translate-input-section partner-section" 
        style={{
          ...(hideSelfSection ? { order: 10 } : {}),
          visibility: ((hidePartnerSection || showPreview || selectedTone || isTranslating) && !translatePartnerText.trim()) ? 'hidden' : 'visible'
        }}
      >
          <div className="translate-section-header">
            {hideSelfSection && (
              <button
                onClick={() => {
                  setHideSelfSection(false)
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur()
                  }
                }}
                className="collapse-btn-mini"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            )}
            {!hideSelfSection && (
              <span className="section-label">翻訳したい文章</span>
            )}
            <div className="translate-lang-selectors">
              <select
                value={translatePartnerSourceLang}
                onChange={(e) => setTranslatePartnerSourceLang(e.target.value)}
                className="translate-lang-select"
              >
                {translateLanguageOptions.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label === '自動認識' && detectedPartnerLang
                      ? `${languageOptions.find(l => l.label === detectedPartnerLang)?.flag || '🌐'} ${detectedPartnerLang}（自動検出）`
                      : `${opt.flag} ${opt.label}`
                    }
                  </option>
                ))}
              </select>
              <span className="lang-arrow">→</span>
              <select
                value={translatePartnerTargetLang}
                onChange={(e) => setTranslatePartnerTargetLang(e.target.value)}
                className="translate-lang-select"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.label} value={opt.label}>{opt.flag} {opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="translate-input-row">
            <textarea
              value={translatePartnerText}
              onChange={(e) => {
                setTranslatePartnerText(e.target.value)
                // 自動リサイズ
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onFocus={() => {
                setHidePartnerSection(false)
                setHideSelfSection(true)
              }}
              onBlur={() => {
                // 入力が空なら元に戻す
                if (!translatePartnerText.trim()) {
                  setHideSelfSection(false)
                }
              }}
              placeholder="相手のメッセージを貼り付け..."
              className="translate-textarea"
              style={{ minHeight: '40px', maxHeight: '200px', overflowY: 'auto', resize: 'none' }}
              rows={1}
            />
            <button
              onClick={handleTranslatePartnerMessage}
              className="translate-btn"
              disabled={!translatePartnerText.trim()}
            >
              翻訳
            </button>
          </div>
          {detectedPartnerLang && translatePartnerSourceLang === '自動認識' && (
            <p className="detected-lang-label">検出: {detectedPartnerLang}</p>
          )}
        </div>

      {/* プレビュー表示 */}
      {translationError && (
        <div className="error-container">
          <p className="error-text">{translationError}</p>
        </div>
      )}

      {showPreview && (
        <div className="preview-container">
          <p className="preview-label">翻訳プレビュー{preview.noChange && <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '8px' }}>（変化なし）</span>}</p>
          <p className="preview-translation">{preview.translation}</p>
          <p className="preview-reverse">逆翻訳：{preview.reverseTranslation}</p>
          {/* トーンレベル間の違い解説（0%以外で表示） */}
          {(selectedTone === null || (selectedTone && selectedTone !== 'custom')) && (
            <div className="tone-diff-section">
              <button
                onClick={handleToneDiffExplanation}
                className="explanation-toggle self"
              >
                {toneDiffExpanded ? '▲ 解説を閉じる' : '▼ 解説'}
              </button>
              {toneDiffExpanded && (
                <div className="explanation-box self">
                  {toneDiffLoading ? (
                    <div className="explanation-loading">
                      <span>解説を読み込み中...</span>
                    </div>
                  ) : toneDiffExplanation ? (
                    <>
                      <div className="explanation-point-box">
                        <span className="point-icon">💡</span>
                        <span className="point-text">{toneDiffExplanation.point}</span>
                      </div>
                      <p className="explanation-text">{toneDiffExplanation.explanation}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 送りたい文章入力欄 */}
      <div className="translate-input-section self-section" style={{ visibility: hideSelfSection ? 'hidden' : 'visible' }}>
        <div className="translate-section-header">
          {(hidePartnerSection || showPreview) && (
            <button
              onClick={() => {
                setShowPreview(false)
                setHidePartnerSection(false)
                setSelectedTone(null)
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur()
                }
              }}
              className="collapse-btn-mini"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
          {!(hidePartnerSection || showPreview) && (
            <span className="section-label">
              あなたが送りたい文章
            </span>
          )}
          <div className="translate-lang-selectors">
            <select
              value={translateSelfSourceLang}
              onChange={(e) => setTranslateSelfSourceLang(e.target.value)}
              className="translate-lang-select"
            >
              {translateLanguageOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label === '自動認識' && detectedSelfLang
                    ? `${languageOptions.find(l => l.label === detectedSelfLang)?.flag || '🌐'} ${detectedSelfLang}（自動検出）`
                    : `${opt.flag} ${opt.label}`
                  }
                </option>
              ))}
            </select>
            <span className="lang-arrow">→</span>
            <select
              value={translateSelfTargetLang}
              onChange={(e) => {
                setTranslateSelfTargetLang(e.target.value)
                setSelfTargetLangManuallySet(true)
              }}
              className="translate-lang-select"
            >
              {languageOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>{opt.flag} {opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="translate-input-row">
          <textarea
            value={translateSelfText}
            onChange={(e) => {
              setTranslateSelfText(e.target.value)
              setShowPreview(false)
              // 自動リサイズ
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onFocus={() => setHidePartnerSection(true)}
            onBlur={() => {
              // プレビュー表示中やトーン選択中は隠したままにする
              if (!showPreview && !selectedTone) {
                setHidePartnerSection(false)
              }
            }}
            placeholder="メッセージを入力..."
            className="translate-input"
            style={{ minHeight: '40px', maxHeight: '200px', overflowY: 'auto', resize: 'none' }}
            rows={1}
            disabled={isTranslating}
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleTranslateConvert}
            className="convert-btn"
            disabled={isTranslating || !translateSelfText.trim()}
          >
            {isTranslating ? <Loader2 size={16} className="spin" /> : '翻訳'}
          </button>
          <button
            onClick={handleTranslateSend}
            className="send-btn"
            disabled={!showPreview}
          >
            <Clipboard size={18} strokeWidth={2.5} />
            <span className="send-btn-label">決定</span>
          </button>
        </div>
        {detectedSelfLang && translateSelfSourceLang === '自動認識' && (
          <p className="detected-lang-label">検出: {detectedSelfLang}</p>
        )}
      </div>

      {/* トーンUI */}
      <div className="nuance-container">
        {selectedTone !== 'custom' && (
          <ToneSlider
            selectedTone={selectedTone}
            toneUiValue={toneUiValue}
            sliderDisabled={!hasTranslationResult || isTranslating}
            tones={tones}
            getToneLabel={getToneLabel}
            currentBucketRef={currentBucketRef}
            triggerHaptic={triggerHaptic}
            setToneUiValue={setToneUiValue}
            setActiveToneBucket={setActiveToneBucket}
            setToneLevel={setToneLevel}
            updatePreviewFromCache={updatePreviewFromCache}
            getBucketValue={getBucketValue}
          />
        )}

        {(hidePartnerSection || showPreview) && (
          <div className="tone-buttons-row">
            {tones.map(tone => (
              <button
                key={tone.id}
                onClick={() => handleToneSelect(tone.id)}
                className={`tone-btn ${selectedTone === tone.id ? 'active' : ''} ${lockedTone && lockedTone !== tone.id ? 'dimmed' : ''}`}
                data-tone={tone.id}
                disabled={!hasTranslationResult || isTranslating}
              >
                {tone.label}
                {lockedTone === tone.id && <span className="lock-indicator">🔒</span>}
              </button>
            ))}

            <button
              onClick={() => {
                if (lockedTone) {
                  setLockedTone(null)
                  setLockedLevel(0)
                } else if (selectedTone && selectedTone !== 'custom') {
                  setLockedTone(selectedTone)
                  setLockedLevel(activeToneBucket)
                }
              }}
              className={`lock-btn ${lockedTone ? 'locked' : ''}`}
              disabled={(!selectedTone || selectedTone === 'custom') && !lockedTone}
              title={lockedTone ? `${lockedTone} ${lockedLevel}%でロック中` : 'トーンをロック'}
            >
              🔒
            </button>
          </div>
        )}

        {showCustomInput && (
          <div className="custom-tone-container">
            <div className="custom-preset-row">
              {['限界オタク', '赤ちゃん言葉', 'オジサン構文', 'ギャル'].map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    setCustomTone(preset)
                    if (showPreview && preview.translation) {
                      const targetLang = translateSelfTargetLang
                      const sourceLang = detectedSelfLang || '日本語'
                      fetchAllBucketsForTone('custom', isNative, preset, targetLang, sourceLang)
                    }
                  }}
                  className="custom-preset-btn"
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              placeholder="例：ラッパー風、ジャイアンっぽく"
              className="custom-tone-input"
              disabled={isTranslating}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTranslateConvert}
              className="custom-convert-btn"
              disabled={isTranslating || !customTone.trim()}
            >
              {isTranslating ? '翻訳中...' : '翻訳'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // 相手一覧画面
  const ListScreen = () => (
    <div className="screen-container list-screen">
      <div className="search-row">
        <button
          onClick={() => {
            setShowPreview(false)
            setSelectedTone(null)
            setShowCustomInput(false)
            setCurrentScreen('translate')
          }}
          className="back-to-translate-btn"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <div className="search-bar">
          <Search className="search-icon" size={18} strokeWidth={2.5} />
          <input type="text" placeholder="検索" className="search-input" />
        </div>
        <button
          id="add-partner-btn"
          onClick={() => {
            setShowAddPartner(true);
          }}
          className="add-partner-btn"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>追加</span>
        </button>
      </div>

      <div className="tag-tabs">
        {tags.map((tag) => (
          editingTagId === tag.id ? (
            <div key={tag.id} className="tag-edit-input">
              <input
                type="text"
                value={editingTagName}
                onChange={(e) => setEditingTagName(e.target.value)}
                className="tag-input"
                autoFocus
              />
              <button onClick={handleSaveTag} className="tag-save-btn">
                <Check size={14} strokeWidth={2.5} />
              </button>
              <button onClick={() => setEditingTagId(null)} className="tag-cancel-btn">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div key={tag.id} className="tag-item-wrapper">
              <button
                onClick={() => setSelectedTag(tag.id)}
                className={`tag-tab ${selectedTag === tag.id ? 'active' : ''}`}
              >
                {tag.name}
              </button>
              {!tag.isDefault && (
                <div className="tag-actions">
                  <button onClick={() => handleEditTag(tag)} className="tag-action-btn">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteTag(tag.id)} className="tag-action-btn delete">
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          )
        ))}
        {showAddTag && (
          <div className="add-tag-input">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="タグ名"
              className="tag-input"
              autoFocus
            />
            <button onClick={handleAddTag} className="tag-add-btn">追加</button>
            <button onClick={() => { setShowAddTag(false); setNewTagName(''); }} className="tag-cancel-btn">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <div className="partner-list">
        {filteredPartners.map((partner) => (
          <div
            key={partner.id}
            onClick={() => handlePartnerClick(partner)}
            onTouchStart={(e) => handleLongPressStart(partner, e)}
            onTouchEnd={handleLongPressEnd}
            onTouchMove={handleLongPressEnd}
            onMouseDown={(e) => handleLongPressStart(partner, e)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            className={`partner-item ${partner.isPinned ? 'pinned' : ''}`}
          >
            {partner.isPinned && <Pin size={14} strokeWidth={2.5} className="pin-icon" />}
            {partner.avatarImage ? (
              <img src={partner.avatarImage} alt={partner.name} className="partner-avatar-image" />
            ) : (
              <div className="partner-avatar">{partner.avatar}</div>
            )}
            <div className="partner-info">
              <span className="partner-name">{partner.name}</span>
              <p className="partner-last-message">{partner.lastMessage || 'メッセージはまだありません'}</p>
            </div>
            {partner.lastTime && <div className="partner-time">{partner.lastTime}</div>}
          </div>
        ))}
      </div>

      {/* コンテキストメニュー */}
      {contextMenuPartner && !showDeleteConfirm && !showTagChangeModal && (
        <div className="context-menu-overlay" onClick={closeContextMenu}>
          <div
            className="context-menu"
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleTogglePin} className="context-menu-item">
              <Pin size={18} strokeWidth={2.5} />
              {contextMenuPartner.isPinned ? 'ピン留め解除' : 'ピン留め'}
            </button>
            <button onClick={() => setShowTagChangeModal(true)} className="context-menu-item">
              <Tag size={18} strokeWidth={2.5} />
              タグを変更
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="context-menu-item delete">
              <Trash2 size={18} strokeWidth={2.5} />
              削除
            </button>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && contextMenuPartner && (
        <div className="modal-overlay" onClick={closeContextMenu}>
          <div className="modal-content delete-confirm" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">削除の確認</h3>
            <p className="delete-confirm-text">
              「{contextMenuPartner.name}」を削除しますか？
            </p>
            <div className="modal-buttons">
              <button onClick={closeContextMenu} className="btn-cancel">
                キャンセル
              </button>
              <button onClick={handleDeletePartner} className="btn-delete">
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タグ変更モーダル */}
      {showTagChangeModal && contextMenuPartner && (
        <div className="modal-overlay" onClick={closeContextMenu}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">タグを変更</h3>
            <div className="tag-change-options">
              <button
                onClick={() => handleChangePartnerTag('')}
                className={`tag-option ${!contextMenuPartner.tag ? 'selected' : ''}`}
              >
                なし
              </button>
              {tags.filter(t => t.id !== 'all').map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleChangePartnerTag(tag.id)}
                  className={`tag-option ${contextMenuPartner.tag === tag.id ? 'selected' : ''}`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="modal-buttons">
              <button onClick={closeContextMenu} className="btn-cancel">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="fab-button home-fab"
        onClick={() => setCurrentScreen('translate')}
      >
        <Home size={24} strokeWidth={2.5} />
      </button>
    </div>
  )

  // チャット画面
  const ChatScreen = () => (
    <div className="screen-container">
      <div className="chat-header">
        <div className="chat-header-left">
          <button onClick={() => setCurrentScreen('list')} className="back-btn">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          {currentPartner?.avatarImage ? (
            <img src={currentPartner.avatarImage} alt={currentPartner.name} className="chat-avatar-image" />
          ) : (
            <span className="chat-avatar">{currentPartner?.avatar}</span>
          )}
          <span className="chat-partner-name">{currentPartner?.name}</span>
          <span className="chat-language-badge">{currentPartner?.language}</span>
        </div>
        <div className="chat-header-right">
          <button onClick={() => setShowSettings(true)} className="settings-btn">
            <Settings size={20} strokeWidth={2.5} />
          </button>
          <button id="face-to-face-btn" className="face-to-face-btn" onClick={startFaceToFaceMode}>
            対面<Mic size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.type === 'self' ? 'self' : 'partner'}`}>
            <div className={`message-bubble ${msg.type === 'self' ? 'self' : 'partner'}`}>
              <p className="message-text">
                {msg.type === 'self' ? msg.translation : msg.original}
              </p>
              <p className="message-translation">
                （{msg.type === 'self' ? msg.reverseTranslation : msg.translation}）
              </p>
              <button
                id={messages.indexOf(msg) === messages.length - 1 ? 'explanation-toggle' : undefined}
                onClick={() => setExpandedExplanation(expandedExplanation === msg.id ? null : msg.id)}
                className={`explanation-toggle ${msg.type === 'self' ? 'self' : 'partner'}`}
              >
                {expandedExplanation === msg.id ? '▲ 解説を閉じる' : '▼ 解説'}
              </button>
              {expandedExplanation === msg.id && (
                <div
                  ref={(el) => { explanationRefs.current[String(msg.id)] = el }}
                  className={`explanation-box ${msg.type === 'self' ? 'self' : 'partner'}`}
                >
                  {msg.explanation.explanation ? (
                    <>
                      {msg.explanation.point && (
                        <div className="explanation-point-box">
                          <span className="point-icon">💡</span>
                          <span className="point-text">{msg.explanation.point}</span>
                        </div>
                      )}
                      <p className="explanation-text">{msg.explanation.explanation}</p>
                    </>
                  ) : (
                    <div className="explanation-loading">
                      <Loader2 size={20} className="spin" />
                      <span>解説を読み込み中...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {showPartnerInput ? (
          <div className="message-row partner">
            <div className="partner-input-box">
              <textarea
                value={partnerInputText}
                onChange={(e) => setPartnerInputText(e.target.value)}
                placeholder="相手のメッセージを貼り付け..."
                className="partner-input-textarea"
                rows={3}
              />
              <div className="partner-input-buttons">
                <button
                  id="partner-message-add-btn"
                  onClick={() => {
                    handlePartnerMessageAdd();
                  }}
                  className="btn-save"
                >
                  追加
                </button>
                <button onClick={() => setShowPartnerInput(false)} className="btn-cancel">キャンセル</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="message-row partner">
            <button
              id="partner-message-btn"
              onClick={() => {
                setShowPartnerInput(true);
              }}
              className="add-partner-message-btn"
            >
              <Plus size={14} strokeWidth={2.5} /> 入力する（翻訳）
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {translationError && (
        <div className="error-container">
          <p className="error-text">{translationError}</p>
        </div>
      )}

      {showPreview && (
        <div className="preview-container">
          <p className="preview-label">翻訳プレビュー{preview.noChange && <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '8px' }}>（変化なし）</span>}</p>
          <p className="preview-translation">{preview.translation}</p>
          <p className="preview-reverse">逆翻訳：{preview.reverseTranslation}</p>
          {/* トーンレベル間の違い解説（0%以外で表示） */}
          {(selectedTone === null || (selectedTone && selectedTone !== 'custom')) && (
            <div className="tone-diff-section">
              <button
                onClick={handleToneDiffExplanation}
                className="explanation-toggle self"
              >
                {toneDiffExpanded ? '▲ 解説を閉じる' : '▼ 解説'}
              </button>
              {toneDiffExpanded && (
                <div className="explanation-box self">
                  {toneDiffLoading ? (
                    <div className="explanation-loading">
                      <span>解説を読み込み中...</span>
                    </div>
                  ) : toneDiffExplanation ? (
                    <>
                      <div className="explanation-point-box">
                        <span className="point-icon">💡</span>
                        <span className="point-text">{toneDiffExplanation.point}</span>
                      </div>
                      <p className="explanation-text">{toneDiffExplanation.explanation}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="input-area">
        <div className="input-row">
          <div className="input-wrapper">
            <textarea
              id="message-input"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                setShowPreview(false)
                // 高さ自動調整
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              placeholder="メッセージを入力..."
              className="message-input"
              disabled={isTranslating}
              rows={1}
              style={{ resize: 'none', overflow: 'auto' }}
            />
            <button
              id="convert-btn"
              onClick={() => {
                handleConvert();
              }}
              className="convert-btn"
              disabled={isTranslating}
            >
              {isTranslating ? <Loader2 size={16} className="spin" /> : '変換'}
            </button>
          </div>
          <button
            id="copy-btn"
            onClick={() => {
              handleSend();
            }}
            className="send-btn"
            disabled={!showPreview}
          >
            <Clipboard size={18} strokeWidth={2.5} />
            <span className="send-btn-label">コピー</span>
          </button>
        </div>
      </div>

      <div ref={nuanceContainerRef} className="nuance-container">
        {/* スライダー */}
        <ToneSlider
          selectedTone={selectedTone}
          toneUiValue={toneUiValue}
          sliderDisabled={!hasTranslationResult || isTranslating || selectedTone === 'custom'}
          tones={tones}
          getToneLabel={getToneLabel}
          currentBucketRef={currentBucketRef}
          triggerHaptic={triggerHaptic}
          setToneUiValue={setToneUiValue}
          setActiveToneBucket={setActiveToneBucket}
          setToneLevel={setToneLevel}
          updatePreviewFromCache={updatePreviewFromCache}
          getBucketValue={getBucketValue}
        />

        {/* トーンボタン（4つ横並び + ロックボタン） */}
        <div id="tone-buttons" className="tone-buttons-row">
          {tones.map(tone => (
            <button
              key={tone.id}
              onClick={() => {
                handleToneSelect(tone.id);
              }}
              className={`tone-btn ${selectedTone === tone.id ? 'active' : ''} ${lockedTone && lockedTone !== tone.id ? 'dimmed' : ''}`}
              data-tone={tone.id}
              disabled={!hasTranslationResult || isTranslating}
            >
              {tone.label}
              {lockedTone === tone.id && <span className="lock-indicator">🔒</span>}
            </button>
          ))}

          {/* 🔒ロックボタン */}
          <button
            onClick={() => {
              if (lockedTone) {
                // 解除
                setLockedTone(null)
                setLockedLevel(0)
              } else if (selectedTone && selectedTone !== 'custom') {
                // 現在のトーン&レベルをロック（カスタム以外）
                setLockedTone(selectedTone)
                setLockedLevel(activeToneBucket)
              }
            }}
            className={`lock-btn ${lockedTone ? 'locked' : ''}`}
            disabled={(!selectedTone || selectedTone === 'custom') && !lockedTone}
            title={lockedTone ? `${lockedTone} ${lockedLevel}%でロック中` : 'トーンをロック'}
          >
            🔒
          </button>
        </div>

        {/* カスタム入力欄（カスタム選択時のみ） */}
        {showCustomInput && (
          <div className="custom-tone-container">
            <div className="custom-preset-row">
              {['限界オタク', '赤ちゃん言葉', 'オジサン構文', 'ギャル'].map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    setCustomTone(preset)
                    // 翻訳結果がある場合は即変換開始
                    if (showPreview && preview.translation) {
                      // customToneのstateは非同期更新なので、直接presetを使う
                      fetchAllBucketsForTone('custom', isNative, preset)
                    }
                  }}
                  className="custom-preset-btn"
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              placeholder="例：ラッパー風、ジャイアンっぽく"
              className="custom-tone-input"
              disabled={isTranslating}
            />
            <button
              onClick={handleConvert}
              className="custom-convert-btn"
              disabled={isTranslating || !customTone.trim()}
            >
              {isTranslating ? '変換中...' : '変換'}
            </button>
          </div>
        )}

        <div ref={nuanceBottomRef} />
      </div>
    </div>
  )

  // 対面モード画面
  const FaceToFaceScreen = () => (
    <div className="screen-container face-to-face-screen">
      {/* ヘッダー */}
      <div className="f2f-header">
        <button onClick={exitFaceToFaceMode} className="back-btn">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="f2f-header-info">
          {currentPartner?.avatarImage ? (
            <img src={currentPartner.avatarImage} alt={currentPartner.name} className="f2f-avatar-image" />
          ) : (
            <span className="f2f-avatar">{currentPartner?.avatar}</span>
          )}
          <div className="f2f-header-text">
            <span className="f2f-partner-name">{currentPartner?.name}</span>
            <span className="f2f-mode-label">対面モード</span>
          </div>
        </div>
        <span className="f2f-language-badge">{currentPartner?.language}</span>
      </div>

      {/* メインコンテンツ */}
      <div className="f2f-content">
        {/* 会話カード（入力と結果をまとめる） */}
        <div className="f2f-conversation-card">
          {/* 入力エリア */}
          <div className="f2f-input-area">
            <div className="f2f-input-wrapper">
              <textarea
                value={faceToFaceInput}
                onChange={(e) => setFaceToFaceInput(e.target.value)}
                placeholder="ここにテキストを入力、または🎤で音声入力..."
                className="f2f-textarea"
                rows={4}
              />
              <button
                onClick={toggleListening}
                className={`f2f-mic-btn ${isListening ? 'listening' : ''}`}
              >
                <Mic size={24} strokeWidth={2.5} />
                {isListening && <span className="mic-pulse" />}
              </button>
            </div>
            {isListening && (
              <p className="f2f-listening-hint">🎤 聞いています...</p>
            )}
          </div>

          {/* 翻訳結果（入力の直下に表示） */}
          {faceToFaceResult && (
            <div className="f2f-result-area">
              <div className="f2f-result-header">
                <span className="f2f-lang-label">
                  {faceToFaceMode === 'self' ? f2fPartnerLanguage : f2fMyLanguage}
                </span>
                <button
                  onClick={() => isSpeaking ? stopSpeaking() : handleSpeak(faceToFaceResult.translation)}
                  className={`f2f-speak-btn ${isSpeaking ? 'speaking' : ''}`}
                >
                  <Volume2 size={20} strokeWidth={2.5} />
                </button>
              </div>
              <p className="f2f-result-text">{faceToFaceResult.translation}</p>
            </div>
          )}
        </div>

        {/* 翻訳ボタン（カードの外・下に配置） */}
        <div className="f2f-buttons">
          <button
            onClick={() => handleFaceToFaceTranslate('self')}
            className={`f2f-translate-btn self ${faceToFaceMode === 'self' ? 'active' : ''}`}
          >
            <div className="f2f-btn-icon">🇯🇵</div>
            <div className="f2f-btn-text">
              <span className="f2f-btn-label">自分が話す</span>
              <span className="f2f-btn-sublabel">{f2fMyLanguage} → {f2fPartnerLanguage}</span>
            </div>
          </button>
          <button
            onClick={() => handleFaceToFaceTranslate('partner')}
            className={`f2f-translate-btn partner ${faceToFaceMode === 'partner' ? 'active' : ''}`}
          >
            <div className="f2f-btn-icon">🌍</div>
            <div className="f2f-btn-text">
              <span className="f2f-btn-label">相手が話す</span>
              <span className="f2f-btn-sublabel">{f2fPartnerLanguage} → {f2fMyLanguage}</span>
            </div>
          </button>
        </div>

        <div className="f2f-language-selectors">
          <div className="f2f-language-select">
            <label>自分</label>
            <select
              value={f2fMyLanguage}
              onChange={(e) => setF2fMyLanguage(e.target.value)}
            >
              {languageOptions.map(lang => (
                <option key={lang.label} value={lang.label}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="f2f-language-select">
            <label>相手</label>
            <select
              value={f2fPartnerLanguage}
              onChange={(e) => setF2fPartnerLanguage(e.target.value)}
            >
              {languageOptions.map(lang => (
                <option key={lang.label} value={lang.label}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      {showCopiedToast && (
        <div className="copied-toast">
          <Check size={16} strokeWidth={3} /> コピーしました！
        </div>
      )}

      {showSplash && (
        <div
          className="splash-screen"
          style={{ background: splashData[splashIndex].bg }}
        >
          <div className="splash-content">
            <img
              src={splashData[splashIndex].image}
              alt="ニジー"
              className="splash-character"
            />
            <div className="splash-loading">
              <span>L</span>
              <span>o</span>
              <span>a</span>
              <span>d</span>
              <span>i</span>
              <span>n</span>
              <span>g</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal />}

      <div className="pop-header">
        <span className="app-title">NijiLingo<span className="rainbow-dot">.</span></span>
      </div>

      {currentScreen === 'translate' && TranslateScreen()}
      {currentScreen === 'list' && ListScreen()}
      {currentScreen === 'chat' && ChatScreen()}
      {currentScreen === 'face-to-face' && FaceToFaceScreen()}

      {showSaveModal && <SaveModal />}
      {showSelectPartnerModal && <SelectPartnerModal />}
      {showAddPartner && (
        <div className="modal-overlay" onClick={() => setShowAddPartner(false)}>
          <div className="modal-content add-partner-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">新しい相手を追加</h3>
            <div className="form-group">
              <label>名前</label>
              <input
                id="partner-name-input"
                type="text"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                placeholder="相手の名前を入力"
                className="form-input"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>言語</label>
              <select
                id="partner-language-select"
                value={newPartnerLanguage}
                onChange={(e) => setNewPartnerLanguage(e.target.value)}
                className="form-select"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.label} value={lang.label}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowAddPartner(false)} className="btn-cancel">
                キャンセル
              </button>
              <button
                id="save-partner-btn"
                onClick={() => {
                  handleAddPartner();
                }}
                className="btn-save"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
