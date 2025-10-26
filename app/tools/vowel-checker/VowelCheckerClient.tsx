'use client';

import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';

// --- 1. 母音抽出ロジック ---
export function getVowels(reading: string): string {
  let vowels = '';
  let lastVowel = '';
  const vowelMap: { [key: string]: string } = {
    'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
    'カ': 'A', 'キ': 'I', 'ク': 'U', 'ケ': 'E', 'コ': 'O',
    'ガ': 'A', 'ギ': 'I', 'グ': 'U', 'ゲ': 'E', 'ゴ': 'O',
    'サ': 'A', 'シ': 'I', 'ス': 'U', 'セ': 'E', 'ソ': 'O',
    'ザ': 'A', 'ジ': 'I', 'ズ': 'U', 'ゼ': 'E', 'ゾ': 'O',
    'タ': 'A', 'チ': 'I', 'ツ': 'U', 'テ': 'E', 'ト': 'O',
    'ダ': 'A', 'ヂ': 'I', 'ヅ': 'U', 'デ': 'E', 'ド': 'O',
    'ナ': 'A', 'ニ': 'I', 'ヌ': 'U', 'ネ': 'E', 'ノ': 'O',
    'ハ': 'A', 'ヒ': 'I', 'フ': 'U', 'ヘ': 'E', 'ホ': 'O',
    'バ': 'A', 'ビ': 'I', 'ブ': 'U', 'ベ': 'E', 'ボ': 'O',
    'パ': 'A', 'ピ': 'I', 'プ': 'U', 'ペ': 'E', 'ポ': 'O',
    'マ': 'A', 'ミ': 'I', 'ム': 'U', 'メ': 'E', 'モ': 'O',
    'ヤ': 'A', 'ユ': 'U', 'ヨ': 'O',
    'ラ': 'A', 'リ': 'I', 'ル': 'U', 'レ': 'E', 'ロ': 'O',
    'ワ': 'A', 'ヰ': 'I', 'ヱ': 'E', 'ヲ': 'O',
    'ン': 'N',
  };
  const youonMap: { [key: string]: string } = {
    'ャ': 'A', 'ュ': 'U', 'ョ': 'O',
    'ァ': 'A', 'ィ': 'I', 'ゥ': 'U', 'ェ': 'E', 'ォ': 'O',
  };
  for (const char of reading) {
    if (vowelMap[char]) {
      lastVowel = vowelMap[char];
      vowels += lastVowel;
    } else if (youonMap[char]) {
      if (vowels.length > 0) {
        lastVowel = youonMap[char];
        if (['ャ', 'ュ', 'ョ'].includes(char)) {
            vowels = vowels.slice(0, -1) + lastVowel;
        } else {
            vowels += lastVowel;
        }
      }
    } else if (char === 'ー') {
      if (lastVowel) {
        vowels += lastVowel;
      }
    }
  }
  return vowels;
}

// --- 2. 機械的採点 (Levenshtein) ---

export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

export function calculateSimilarity(distance: number, len1: number, len2: number): number {
  const maxLength = Math.max(len1, len2);
  if (maxLength === 0) return 100;
  const similarity = (1 - distance / maxLength) * 100;
  return Math.round(similarity);
}

// --- 3. LLM 採点 (3項目) ---
const LlmAnalysisSchema = z.object({
  coherence_score: z.number().min(0).max(100)
    .describe("文章全体としての意味がどれだけ通っているか (0:意味不明, 100:完璧に明瞭)"),
  rhyme_score: z.number().min(0).max(100)
    .describe("「、」で区切られた各フレーズが、どれだけリズミカルに韻を踏んでいるか (0:全く踏んでいない, 100:完璧にリズミカル)"),
  keyword_score: z.number().min(0).max(100)
    .describe("指定されたキーワードが文章にどれだけ自然に含まれているか (0:全くない, 100:完璧)"),
  analysis: z.string()
    .describe("上記3つのスコアの採点理由を簡潔に説明"),
});
export type LlmAnalysisResult = z.infer<typeof LlmAnalysisSchema>;

const apiKey = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : undefined) || ""; 
const geminiApiKey = apiKey === "" ? "" : `key=${apiKey}`;
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?${geminiApiKey}`;

// AIの採点基準
const responseSchema = {
  type: "OBJECT",
  properties: {
    coherence_score: { type: "NUMBER", description: "文章全体としての意味がどれだけ通っているか (0:意味不明, 100:完璧に明瞭)" },
    rhyme_score: { type: "NUMBER", description: "「、」で区切られた各フレーズが、どれだけリズミカルに韻を踏んでいるか (0:全く踏んでいない, 100:完璧にリズミカル)" },
    keyword_score: { type: "NUMBER", description: "指定されたキーワードが文章にどれだけ自然に含まれているか (0:全くない, 100:完璧)" },
    analysis: { type: "STRING", description: "上記3つのスコアの採点理由を簡潔に説明" },
  },
  required: ["coherence_score", "rhyme_score", "keyword_score", "analysis"]
};

// AIへの指示
const systemPrompt = `あなたは日本語の文章評価、特に「韻」（ライム）の専門家です。入力された「メインの文章」を、「、」（読点）で区切られた各フレーズ、および「指定されたキーワード」に基づいて、以下の3つの観点で厳密に採点してください。
1.  **意味の明瞭度 (coherence_score):** 「メインの文章」全体が、文法的に正しく、意味がどれだけ明確に通るか。0点（意味不明）から100点（完璧に明瞭）で採点します。
2.  **韻のリズム評価 (rhyme_score):** 「、」で区切られた各フレーズが、音の響きや母音の一致において、どれだけリズミカルに「韻を踏んでいる」か。0点（全く韻を踏んでいない）から100点（完璧にリズミカルな韻）で採点します。
3.  **キーワード含有度 (keyword_score):** 「指定されたキーワード」（カンマ区切り）が、「メインの文章」にどれだけ自然かつ効果的に含まれているか。無理やり詰め込んだ場合は減点します。0点（全く含まない）から100点（完璧に含む）で採点します。`;

export async function getLlmAnalysis(mainText: string, keywords: string): Promise<LlmAnalysisResult> {
  const userPrompt = `
メインの文章: "${mainText}"
指定されたキーワード: "${keywords}"
`;
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2
    }
  };

  let response: Response | undefined;
  let attempts = 0;
  const maxAttempts = 5;
  let delay = 1000;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        break;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempts === maxAttempts) {
          throw new Error(`APIエラー (ステータス: ${response.status})。リトライ上限に達しました。`);
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempts - 1)));
      } else {
        const errorBody = await response.json().catch(() => ({ error: { message: "レスポンスの解析に失敗しました。" } }));
        const errorMsg = errorBody?.error?.message || `APIエラーが発生しました (ステータス: ${response.status})`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      if (attempts === maxAttempts) {
         console.error('LLM解析エラー:', error);
         throw error;
      }
       await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempts - 1)));
    }
  }

  if (!response) {
      throw new Error("APIリクエストが失敗しました。");
  }


  try {
    const result = await response.json();
    if (!result.candidates || !result.candidates[0].content.parts[0].text) {
        console.error("AIからの予期しないレスポンス:", result);
        throw new Error("AIからの応答が空か、または予期しない形式です。");
    }
    const jsonText = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);
    const validationResult = LlmAnalysisSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(`AIの応答形式が不正です: ${validationResult.error.message}`);
    }
    return validationResult.data;
  } catch (error: unknown) {
    console.error('LLM解析エラー:', error);
    // @ts-ignore
    throw new Error(`AIの応答解析に失敗しました: ${error.message}`);
  }
}

type KuromojiTokenizer = any;
type KuromojiToken = any;

interface VowelResult {
  text: string;
  reading: string;
  vowels: string;
}

const WEIGHTS = {
  VOWEL_SIMILARITY: 0.3, // 機械的 母音類似度 (30%)
  RHYME: 0.3,            // AI: 韻のリズム評価 (30%)
  COHERENCE: 0.2,        // AI: 意味の明瞭度 (20%)
  KEYWORD: 0.2,          // AI: キーワード (20%)
};

export default function VowelCheckerClient() {
  
  // --- State定義 ---
  const [text1, setText1] = useState<string>('');
  const [phrasesResults, setPhrasesResults] = useState<VowelResult[]>([]); // フレーズごとの解析結果
  const [vowelScore, setVowelScore] = useState<number | null>(null);

  // LLM (AI採点) 用
  const [keywords, setKeywords] = useState<string>('');
  const [llmResult, setLlmResult] = useState<LlmAnalysisResult | null>(null); // AIの採点結果
  const [keywordResult, setKeywordResult] = useState<VowelResult | null>(null);

  // 総合点
  const [totalScore, setTotalScore] = useState<number | null>(null);

  // UI制御用
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenizerLoading, setIsTokenizerLoading] = useState<boolean>(true);
  const tokenizer = useRef<KuromojiTokenizer | null>(null);

  useEffect(() => {
    const dicPath = '/kuromoji-dict'; 

    // @ts-ignore
    if (typeof window.kuromoji !== 'undefined') {
      // @ts-ignore
      window.kuromoji.builder({ dicPath: dicPath }).build((err: any, builtTokenizer: KuromojiTokenizer) => {
        if (err) {
          console.error('kuromoji.js: 辞書の読み込みに失敗しました。', err);
          setError('辞書の読み込みに失敗しました。public/kuromoji-dict/ に辞書ファイルが正しく配置されているか確認してください。');
        } else {
          tokenizer.current = builtTokenizer;
        }
        setIsTokenizerLoading(false);
      });
    } else {
      console.error('kuromoji.js が window に見つかりません。');
      setError('kuromoji.js が読み込まれていません。page.tsx または layout.tsx の <Script> タグを確認してください。');
      setIsTokenizerLoading(false);
    }
  }, []);
  const handleSubmit = async () => { 
    if (!tokenizer.current) {
      setError('形態素解析器がまだ準備中です。');
      return;
    }
    const phrases = text1.split('、').filter(p => p.trim() !== '');
    
    if (!text1) {
      setError('テキストを入力してください。');
      return;
    }
    if (!keywords) {
      setError('キーワードを入力してください。');
      return;
    }
    if (phrases.length < 2) {
      setError('韻を比較するために、「、」（読点）を使って2つ以上のフレーズに区切ってください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPhrasesResults([]);
    setKeywordResult(null);
    setVowelScore(null);
    setLlmResult(null);
    setTotalScore(null);

    try {
      // --- 1. 機械的採点 (kuromoji + Levenshtein) ---
      
      const newPhrasesResults: VowelResult[] = [];
      const vowelsList: string[] = [];

      for (const phrase of phrases) {
        const tokens: KuromojiToken[] = tokenizer.current.tokenize(phrase);
        const reading = tokens.map((t: KuromojiToken) => t.reading || '').join('');
        const vowels = getVowels(reading);
        
        newPhrasesResults.push({ text: phrase, reading: reading, vowels: vowels });
        vowelsList.push(vowels);
      }
      
      setPhrasesResults(newPhrasesResults);

      // キーワードの解析
      const tokensKeywords: KuromojiToken[] = tokenizer.current.tokenize(keywords);
      const readingKeywords = tokensKeywords.map((t: KuromojiToken) => t.reading || '').join('');
      const vowelsKeywords = getVowels(readingKeywords);
      setKeywordResult({ text: keywords, reading: readingKeywords, vowels: vowelsKeywords });

      // 隣り合うフレーズ間の母音類似度を計算
      const similarityScores: number[] = [];
      for (let i = 0; i < vowelsList.length - 1; i++) {
        const v1 = vowelsList[i];
        const v2 = vowelsList[i+1];
        if (v1.length === 0 && v2.length === 0) {
          similarityScores.push(100); // 両方母音なしなら100点
        } else {
          const distance = levenshteinDistance(v1, v2);
          const score = calculateSimilarity(distance, v1.length, v2.length);
          similarityScores.push(score);
        }
      }
      
      // 平均スコアを算出
      const avgScore = similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length;
      setVowelScore(Math.round(avgScore)); // 母音スコアをセット

      // --- 2. AI採点 (LLM) ---
      // テキスト1 (原文) と keywords をAIに渡す
      const llmAnalysis = await getLlmAnalysis(text1, keywords);
      setLlmResult(llmAnalysis);

      // --- 3. 総合点の算出 (4項目) ---
      const finalScore = 
        (avgScore * WEIGHTS.VOWEL_SIMILARITY) +
        (llmAnalysis.rhyme_score * WEIGHTS.RHYME) +
        (llmAnalysis.coherence_score * WEIGHTS.COHERENCE) +
        (llmAnalysis.keyword_score * WEIGHTS.KEYWORD);
      
      setTotalScore(Math.round(finalScore));

    } catch (err: unknown) {
      console.error('解析エラー:', err);
      setError(err instanceof Error ? err.message : '解析中に不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-lg">
      
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
        ハイブリッド韻チェッカー
      </h1>
      <p className="text-center text-gray-600 mb-6">
        (kuromoji.js + Gemini AI)
      </p>

      {/* 辞書読み込み中・エラー表示 */}
      {isTokenizerLoading && (
        <div className="p-4 bg-blue-100 text-blue-700 rounded-lg text-center">
          形態素解析の辞書（約18MB）を読み込んでいます...
        </div>
      )}
      {error && (
        <div className="my-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* 入力フォーム */}
      <div className="space-y-4">
        <textarea 
          rows={3} 
          className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" 
          placeholder="「、」で区切って文章を入力 (例: 今日は天気、とても元気)"
          value={text1}
          onChange={(e) => setText1(e.target.value)}
          disabled={isTokenizerLoading || isLoading}
        />
        {/* キーワード入力欄 */}
        <input
          type="text"
          className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-400" 
          placeholder="キーワード (カンマ区切り。例: 東京, リンゴ)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={isTokenizerLoading || isLoading}
        />

        <button 
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-400"
          onClick={handleSubmit}
          disabled={isTokenizerLoading || isLoading || !text1 || !keywords} // 
        >
          {isLoading ? '解析中 (AIが応答中)...' : '韻を採点する'}
        </button>
      </div>

      {/* 結果表示エリア */}
      {totalScore !== null && llmResult && vowelScore !== null && (
        <div className="mt-8 border-t pt-6 space-y-6">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">解析結果</h2>
          
          {/* 総合点 */}
          <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200">
            <p className="text-lg text-blue-800 mb-1">総合 韻スコア</p>
            <div className="text-7xl font-bold text-blue-600 my-2">
              {totalScore}
              <span className="text-4xl ml-1">点</span>
            </div>
          </div>
          
          {/* 採点の内訳 (4項目) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-center">
            <ScoreCard 
              title="機械的 母音類似度" 
              score={vowelScore} 
              weight={WEIGHTS.VOWEL_SIMILARITY} 
              color="gray"
            />
            <ScoreCard 
              title="AI: 韻のリズム評価" 
              score={llmResult.rhyme_score} 
              weight={WEIGHTS.RHYME} 
              color="purple"
            />
            <ScoreCard 
              title="AI: 意味の明瞭度" 
              score={llmResult.coherence_score} 
              weight={WEIGHTS.COHERENCE} 
              color="green"
            />            <ScoreCard 
              title="AI: キーワード" 
              score={llmResult.keyword_score}
              weight={WEIGHTS.KEYWORD}
              color="blue"
            />
          </div>

          {/* AIによる分析 */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">AIによる分析・理由</h3>
            <p className="text-gray-600 text-left whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">
              {llmResult.analysis}
            </p>
          </div>

          {/* 機械的解析の詳細 (フレーズ + キーワード) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">機械的解析 (フレーズ・キーワード別)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phrasesResults.map((result, index) => (
                <ResultCard 
                  key={index}
                  title={`フレーズ ${index + 1}`} 
                  result={result} 
                />
              ))}
              {/* ★ キーワードの解析結果を追加 */}
              <ResultCard 
                title="キーワード"
                result={keywordResult}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ------------------------------------------------------------------
// ヘルパーコンポーネント (結果表示用)
// ------------------------------------------------------------------

// スコアカード表示用
function ScoreCard({ title, score, weight, color }: { title: string, score: number, weight: number, color: string }) {
  const colors: { [key: string]: string } = {
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700', // ★ blue を追加
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colors[color] || colors.gray}`}>
      <h4 className="text-sm font-medium truncate">{title}</h4>
      <p className={`text-4xl font-bold`}>
        {score}
        <span className="text-lg ml-1">点</span>
      </p>
      <span className="text-xs"> (重み: {weight * 100}%)</span>
    </div>
  );
}

// kuromoji.js 解析結果表示用
function ResultCard({ title, result }: { title: string, result: VowelResult | null }) {
  if (!result) return null;
  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium text-gray-500">入力:</span>
          <p className="text-gray-800 break-words">{result.text}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">読み (カタカナ):</span>
          <p className="text-gray-800 break-words">{result.reading || '(読みなし)'}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">母音 (A/I/U/E/O/N):</span>
          <p className="text-lg font-bold text-blue-600 font-mono break-words">
            {result.vowels || '(母音なし)'}
          </p>
        </div>
      </div>
    </div>
  );
}

