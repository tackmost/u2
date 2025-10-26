"use client";

import { useState, useEffect, useRef } from 'react';

// ==================================================================
// 採点ロジック (checkerLogic)
// ==================================================================

/**
 * 魚のキーワードデータを定義するインターフェース
 */
interface FishKeywordData {
    [fishName: string]: string[];
}
type FishTheme = keyof FishKeywordData;

/**
 * キーワードのマスターデータ
 */
const fishKeywords: FishKeywordData = {
    "maguro": [
        "赤身", "トロ", "オーシャン", "スピード", "ツナ缶",
        "寿司", "回遊魚", "一本釣り", "黒いダイヤ", "海の幸",
        "DHA", "エリート", "シーチキン", "大間", "初競り"
    ],
    "tai": [
        "めでたい", "王様", "白身", "鯛めし", "お祝い",
        "桜鯛", "エビで釣る", "塩焼き", "瀬戸内", "上品",
        "七福神", "横綱", "赤い", "お頭付き", "祝い酒"
    ],
    "iwashi": [
        "群れ", "DHA", "オイルサーディン", "大群", "弱肉強食",
        "イワシ雲", "目刺し", "雑魚じゃない", "青魚", "缶詰",
        "サーディン", "大漁", "網", "プランクトン", "鰯"
    ],
    "same": [
        "ジョーズ", "軟骨", "ハンター", "歯", "フカヒレ",
        "鮫肌", "トップ", "海中", "恐ろしい", "頂点",
        "シャーク", "捕食者", "古代魚", "獰猛", "海底"
    ]
};

// --- ヘルパー関数 ---

/**
 * カタカナの読み仮名から母音の文字列を抽出する
 */
function getVowels(reading: string): string {
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
    };

    // 処理前に全角カタカナに統一し、不要な文字を除去
    const cleanReading = reading
        .replace(/[ぁ-ん]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60)) // ひらがな -> カタカナ
        .replace(/[A-Za-z0-9]/g, '') // 英数字を除去
        .replace(/[、。！？「」]/g, ''); // 句読点を除去

    for (const char of cleanReading) {
        if (vowelMap[char]) {
            lastVowel = vowelMap[char];
            vowels += lastVowel;
        } else if (youonMap[char]) {
            if (vowels.length > 0) {
                lastVowel = youonMap[char];
                vowels = vowels.slice(0, -1) + lastVowel;
            }
        } else if (char === 'ー') {
            if (lastVowel) {
                vowels += lastVowel;
            }
        }
        // ッ（促音）は無視
    }
    return vowels;
}

/**
 * 2つの文字列間のレーベンシュタイン距離（編集距離）を計算する
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // 削除
                matrix[j - 1][i] + 1,      // 挿入
                matrix[j - 1][i - 1] + cost // 置換
            );
        }
    }
    return matrix[b.length][a.length];
}

/**
 * 編集距離を 0% 〜 100% の類似度スコアに変換する
 */
function calculateSimilarity(distance: number, len1: number, len2: number): number {
    const maxLength = Math.max(len1, len2);
    if (maxLength === 0) return 100;
    const similarity = (1 - distance / maxLength) * 100;
    return Math.max(0, Math.round(similarity));
}


// --- 採点ロジック ---

/**
 * 採点結果の型
 */
interface ScoreResult {
    score: number; // 0-100点
    detail: string; // 採点の詳細・理由
}

/**
 * 総合採点結果の型
 */
interface TotalScore {
    totalScore: number;
    finalMessage: string;
    keyword: ScoreResult;
    rhyme: ScoreResult;
    rhythm: ScoreResult;
    meaning: ScoreResult;
}

// --- 1. キーワードチェッカー ---
function checkKeywords(text: string, themeKeywords: string[]): ScoreResult {
    if (!text || themeKeywords.length === 0) {
        return { score: 0, detail: "テキストまたはキーワードがありません。" };
    }

    let hitCount = 0;
    const hitWords: string[] = [];

    themeKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            hitCount++;
            hitWords.push(keyword);
        }
    });

    const score = Math.min(100, (hitCount / 5) * 100);
    
    let detail = "";
    if (hitCount === 0) {
        detail = "お題のキーワードが1つも含まれていません。";
    } else {
        detail = `「${hitWords.slice(0, 3).join(', ')}」など、${hitCount}個のキーワードを発見！`;
    }

    return { score: Math.round(score), detail };
}

// --- 2. 韻（ライム）チェッカー ---
function checkRhyme(text: string): ScoreResult {
    const verses = text.split(/[、。！?\n]/).filter(v => v.trim().length > 2);
    
    if (verses.length < 2) {
        return { score: 0, detail: "韻を比較できる文が2つ以上ありません。" };
    }

    let totalSimilarity = 0;
    let pairsCompared = 0;
    const RHYME_CHECK_LENGTH = 5; 

    for (let i = 0; i < verses.length - 1; i++) {
        const verse1 = verses[i].trim();
        const verse2 = verses[i+1].trim();

        const vowels1 = getVowels(verse1.slice(-RHYME_CHECK_LENGTH));
        const vowels2 = getVowels(verse2.slice(-RHYME_CHECK_LENGTH));

        if (vowels1.length > 0 && vowels2.length > 0) {
            const distance = levenshteinDistance(vowels1, vowels2);
            const similarity = calculateSimilarity(distance, vowels1.length, vowels2.length);
            totalSimilarity += similarity;
            pairsCompared++;
        }
    }

    if (pairsCompared === 0) {
        return { score: 0, detail: "母音を比較できるペアがありませんでした。" };
    }

    const averageScore = totalSimilarity / pairsCompared;
    const score = Math.min(100, averageScore); 

    let detail = `文末の母音の類似度 (平均 ${Math.round(score)}%)。`;
    if (score > 80) detail += " 素晴らしい韻です！";
    else if (score > 50) detail += " 良い韻を踏んでいます。";
    else detail += " もっと韻を踏めそうです。";
    
    return { score: Math.round(score), detail };
}

// --- 3. リズムチェッカー ---
function countSyllables(text: string): number {
    const katakanaText = text.replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60));
    const syllables = katakanaText.match(/[アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ]/g);
    return syllables ? syllables.length : 0;
}

function calculateStdDev(arr: number[]): { mean: number, stdDev: number } {
    if (arr.length === 0) return { mean: 0, stdDev: 0 };
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return { mean, stdDev: Math.sqrt(variance) };
}

function checkRhythm(text: string): ScoreResult {
    const verses = text.split(/[、。！?\n]/).filter(v => v.trim().length > 0);
    
    if (verses.length < 2) {
        return { score: 0, detail: "リズムを比較できる文が2つ以上ありません。" };
    }

    const syllableCounts = verses.map(countSyllables).filter(count => count > 0);
    
    if (syllableCounts.length < 2) {
        return { score: 10, detail: "音節をカウントできる文が不足しています。" };
    }

    const { mean, stdDev } = calculateStdDev(syllableCounts);

    const score = Math.max(0, (1 - (stdDev / mean)) * 100);

    let detail = `音節数のばらつき (平均${mean.toFixed(1)}音, 偏差${stdDev.toFixed(1)})。`;
    if (score > 80) detail += " 非常に安定したリズムです！";
    else if (score > 50) detail += " 良いリズム感です。";
    else detail += " リズムがやや不安定です。";

    return { score: Math.round(score), detail };
}

// --- 4. 意味（文脈）チェッカー ---
function checkMeaning(text: string, themeKeywords: string[]): ScoreResult {
    let contextCount = 0;
    const CONTEXT_DISTANCE = 15; 

    const hitKeywords: { word: string, index: number }[] = [];
    themeKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            hitKeywords.push({ word: keyword, index: match.index });
        }
    });

    if (hitKeywords.length < 2) {
        return { score: 10, detail: "キーワードが少ないため文脈を評価できません。" };
    }

    hitKeywords.sort((a, b) => a.index - b.index);

    for (let i = 0; i < hitKeywords.length - 1; i++) {
        const wordA = hitKeywords[i];
        const wordB = hitKeywords[i+1];

        if (wordA.word !== wordB.word && (wordB.index - (wordA.index + wordA.word.length)) <= CONTEXT_DISTANCE) {
            contextCount++;
        }
    }

    const score = Math.min(100, (contextCount / 3) * 100);

    let detail = "";
    if (contextCount > 0) {
        detail = `キーワード同士が${contextCount}回、近い文脈で使われています！`;
    } else {
        detail = "キーワードが散発的で、文脈があまり見られません。";
    }

    return { score: Math.round(score), detail };
}

// --- 総合採点 ---
function calculateTotalScore(text: string, theme: FishTheme): TotalScore {
    const themeKeywords = fishKeywords[theme] || [];

    const keywordResult = checkKeywords(text, themeKeywords);
    const rhymeResult = checkRhyme(text);
    const rhythmResult = checkRhythm(text);
    const meaningResult = checkMeaning(text, themeKeywords);

    const totalScore = Math.round(
        keywordResult.score * 0.35 +
        rhymeResult.score * 0.30 +
        rhythmResult.score * 0.15 +
        meaningResult.score * 0.20
    );

    let finalMessage = "お疲れ様でした！";
    if (totalScore > 90) finalMessage = "完璧なフロウ！キングオブヘッド！";
    else if (totalScore > 75) finalMessage = "素晴らしい！お題を乗りこなしています！";
    else if (totalScore > 50) finalMessage = "良い感じです！その調子！";
    else finalMessage = "惜しい！次はもっと上を目指そう！";

    return {
        totalScore,
        finalMessage,
        keyword: keywordResult,
        rhyme: rhymeResult,
        rhythm: rhythmResult,
        meaning: meaningResult,
    };
}


// ==================================================================
// 音声認識コンポーネント (RhymeCheckerClient)
// ==================================================================

interface RhymeCheckerProps {
    onSubmit: (transcript: string) => void; // 親にテキストを送信するコールバック
    isLoading: boolean; // 親が処理中かどうか
}

/**
 * 音声認識とテキスト入力UIを担当するクライアントコンポーネント
 */
function RhymeCheckerClient({ onSubmit, isLoading }: RhymeCheckerProps) {
    // --- State ---
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState('待機中');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isBrowserSupported, setIsBrowserSupported] = useState(true);

    // --- Ref ---
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // --- useEffect (コンポーネントのマウント時に実行) ---
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setStatus('エラー: お使いのブラウザは音声認識に対応していません。');
            setIsBrowserSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setStatus('認識中... 話してください');
        };

        recognition.onend = () => {
            setStatus('待機中');
            setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                 setStatus('エラー: 音声が検出されませんでした');
            } else if (event.error === 'not-allowed') {
                setStatus('エラー: マイクへのアクセスが許可されていません');
            } else {
                setStatus(`エラー: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            setInterimTranscript(interim);
            setFinalTranscript((prev) => prev + final);
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
            }
        };
    }, []); // マウント時に1回だけ実行

    // --- 操作関数 ---
    const startListening = () => {
        if (recognitionRef.current && !isListening && !isLoading) {
            setFinalTranscript(''); 
            setInterimTranscript('');
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error('Recognition start error:', error);
                setStatus('エラー: 開始に失敗');
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleReset = () => {
        if (isListening) {
            stopListening();
        }
        setFinalTranscript('');
        setInterimTranscript('');
        setStatus('待機中');
    };

    // --- フォーム送信時の処理 (親コンポーネントに通知) ---
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); 
        
        if (isListening) {
            stopListening(); 
        }
        
        console.log('フォームが送信されました:', finalTranscript);
        onSubmit(finalTranscript); 
    };

    // --- レンダリング ---
    return (
        <div className="font-sans">
            
            {/* --- 録音ボタン --- */}
            <div className="flex flex-wrap gap-4 mb-6">
                <button
                    onClick={startListening}
                    disabled={isListening || isLoading || !isBrowserSupported}
                    className={`
                        px-5 py-2.5 font-medium rounded-lg shadow-sm text-white flex items-center justify-center
                        ${(isListening || isLoading || !isBrowserSupported)
                            ? 'bg-cyan-800 text-gray-400 cursor-not-allowed'
                            : 'bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500'
                        }
                    `}
                >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path></svg>
                    録音開始
                </button>
                <button
                    onClick={stopListening}
                    disabled={!isListening || isLoading}
                    className={`
                        px-5 py-2.5 font-medium rounded-lg shadow-sm text-white
                        ${(!isListening || isLoading)
                            ? 'bg-red-800 text-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                        }
                    `}
                >
                    録音停止
                </button>
                <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className={`
                        px-5 py-2.5 font-medium rounded-lg shadow-sm text-white
                        bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    リセット
                </button>
            </div>

            {/* --- ステータス表示 --- */}
            <div className="mb-4 text-lg font-semibold text-gray-300">
                ステータス: {status}
            </div>

            {/* --- リアルタイム結果表示（視覚用） --- */}
            <div className="w-full min-h-[100px] p-4 mb-6 bg-gray-800 border border-gray-600 rounded-md shadow-inner">
                {finalTranscript}
                <span className="text-gray-400">{interimTranscript}</span>
            </div>

            {/* --- 送信フォーム --- */}
            <form onSubmit={handleSubmit} className="mt-6">
                <label
                    htmlFor="transcript-textarea"
                    className="block mb-2 text-sm font-medium text-gray-400"
                >
                    認識結果 (編集・採点可能):
                </label>
                <textarea
                    id="transcript-textarea"
                    value={finalTranscript}
                    onChange={(e) => setFinalTranscript(e.target.value)}
                    rows={6}
                    disabled={isLoading}
                    className="w-full p-3 text-base bg-gray-800 border border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-white disabled:opacity-70"
                    placeholder="ここに音声認識結果が表示されます。手動での入力・編集も可能です。"
                />
                <button
                    type="submit"
                    disabled={isLoading || !finalTranscript.trim()}
                    className="mt-4 w-full px-6 py-3 text-base font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                    disabled:bg-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? '採点中...' : 'この内容で採点する'}
                </button>
            </form>
        </div>
    );
}


// ==================================================================
// メインページコンポーネント (RhymeBattlePage)
// ==================================================================

// 利用可能なお題（魚）のキーを取得
const availableThemes = Object.keys(fishKeywords) as FishTheme[];

/**
 * ラップ採点アプリケーションのメインページ
 */
export default function RhymeBattlePage() {
    // --- State ---
    const [selectedTheme, setSelectedTheme] = useState<FishTheme>(availableThemes[0]);
    const [scoreResult, setScoreResult] = useState<TotalScore | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Handlers ---

    /**
     * RhymeCheckerClient から音声認識結果（テキスト）が送信されたときに呼び出される
     * @param transcript 認識されたテキスト
     */
    const handleTranscriptSubmit = async (transcript: string) => {
        if (!transcript.trim()) {
            setError("テキストが入力されていません。");
            setScoreResult(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        setScoreResult(null);

        try {
            // checkerLogic の採点関数を呼び出す
            // (非同期処理を模倣するために少し待機)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 同じファイル内にある関数を直接呼び出す
            const result = calculateTotalScore(transcript, selectedTheme);
            setScoreResult(result);

        } catch (err) {
            console.error("採点エラー:", err);
            setError("採点中にエラーが発生しました。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-900 text-white font-sans">
            
            {/* --- 左側: 入力エリア --- */}
            <div className="w-full lg:w-1/2 p-6 lg:p-10 border-r border-gray-700">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-400 mb-2">
                        韻 DE BATTLE
                    </h1>
                    <p className="text-lg text-gray-300">
                        お題に沿ったフリースタイルラップを採点します
                    </p>
                </header>

                {/* --- お題選択 --- */}
                <div className="mb-6">
                    <label 
                        htmlFor="theme-select" 
                        className="block mb-2 text-sm font-medium text-gray-400"
                    >
                        お題 (テーマ)
                    </label>
                    <select
                        id="theme-select"
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value as FishTheme)}
                        disabled={isLoading}
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-white"
                    >
                        {availableThemes.map((theme) => (
                            <option key={theme} value={theme}>
                                {String(theme).toUpperCase()} (
                                    {fishKeywords[theme][0]}, {fishKeywords[theme][1]} ...
                                )
                            </option>
                        ))}
                    </select>
                </div>

                {/* --- 音声入力コンポーネント --- */}
                <RhymeCheckerClient 
                    onSubmit={handleTranscriptSubmit} 
                    isLoading={isLoading} 
                />

            </div>

            {/* --- 右側: 結果表示エリア --- */}
            <div className="w-full lg:w-1/2 p-6 lg:p-10 bg-gray-800">
                <h2 className="text-3xl font-semibold mb-6 text-gray-100">
                    採点結果
                </h2>
                
                {isLoading && <LoadingSpinner />}
                
                {error && (
                    <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
                        <p className="font-bold text-red-300">エラー</p>
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {scoreResult && !isLoading && (
                    <div className="animate-fade-in space-y-6">
                        {/* --- 総合得点 --- */}
                        <div className="text-center bg-gray-700 p-6 rounded-xl shadow-lg">
                            <h3 className="text-lg font-medium text-gray-400 mb-2">
                                総合得点
                            </h3>
                            <p className="text-7xl font-bold text-cyan-400">
                                {scoreResult.totalScore}
                                <span className="text-3xl text-gray-300">/ 100</span>
                            </p>
                            <p className="mt-4 text-lg text-gray-200">
                                {scoreResult.finalMessage}
                            </p>
                        </div>
                        
                        {/* --- 各項目スコア --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ScoreCard title="お題 (キーワード)" score={scoreResult.keyword.score} description={scoreResult.keyword.detail} />
                            <ScoreCard title="韻 (ライム)" score={scoreResult.rhyme.score} description={scoreResult.rhyme.detail} />
                            <ScoreCard title="リズム" score={scoreResult.rhythm.score} description={scoreResult.rhythm.detail} />
                            <ScoreCard title="意味 (文脈)" score={scoreResult.meaning.score} description={scoreResult.meaning.detail} />
                        </div>
                    </div>
                )}
                
                {!scoreResult && !isLoading && !error && (
                    <div className="text-center text-gray-500 pt-16">
                        <p>(ここに採点結果が表示されます)</p>
                    </div>
                )}

            </div>
        </div>
    );
}

/**
 * 採点結果カード コンポーネント
 */
const ScoreCard = ({ title, score, description }: { title: string, score: number, description: string }) => (
    <div className="bg-gray-700 p-5 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-gray-100">{title}</h4>
            <span className={`text-2xl font-bold ${score > 70 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score}
            </span>
        </div>
        <p className="text-sm text-gray-300">{description}</p>
    </div>
);

/**
 * ローディングスピナー
 */
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
    </div>
);

