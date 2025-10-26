"use client";

import { useState, useEffect, useRef } from 'react';

// --- 型定義 ---
interface Props {
    onSubmit: (transcript: string) => void; // 親にテキストを送信するコールバック
    isLoading: boolean; // 親が処理中かどうか
}

/**
 * 音声認識とテキスト入力UIを担当するクライアントコンポーネント
 */
export default function RhymeCheckerClient({ onSubmit, isLoading }: Props) {
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
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
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

    // --- ★ フォーム送信時の処理 (親コンポーネントに通知) ---
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // ページの再読み込みを防止
        
        if (isListening) {
            stopListening(); // 送信時に録音中なら停止
        }
        
        console.log('フォームが送信されました:', finalTranscript);
        // 親コンポーネントの onSubmit 関数を実行
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
                    {/* SVG Mic Icon */}
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
