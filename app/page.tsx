"use client";

import { useState, useEffect, useRef } from 'react';
import { calculateTotalScore, fishKeywords } from '@/app/checkerLogic';
import type { TotalScore, FishTheme } from '@/app/checkerLogic';


interface RhymeCheckerProps {
    onSubmit: (transcript: string) => void;
    isLoading: boolean;
}

function RhymeCheckerClient({ onSubmit, isLoading }: RhymeCheckerProps) {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState('待機中');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isBrowserSupported, setIsBrowserSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    }, []);
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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); 
        
        if (isListening) {
            stopListening(); 
        }
        
        console.log('フォームが送信されました:', finalTranscript);
        onSubmit(finalTranscript); 
    };

    return (
        <div className="font-sans">
            
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
            <div className="mb-4 text-lg font-semibold text-gray-300">
                ステータス: {status}
            </div>
            <div className="w-full min-h-[100px] p-4 mb-6 bg-gray-800 border border-gray-600 rounded-md shadow-inner">
                {finalTranscript}
                <span className="text-gray-400">{interimTranscript}</span>
            </div>
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

// 利用可能なお題（魚）のキーをインポートしたデータから取得
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
            // (非同期処理を模倣するために少し待機)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // インポートした採点関数を呼び出す
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