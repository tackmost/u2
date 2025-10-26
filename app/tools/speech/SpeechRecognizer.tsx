// -----------------------------------------------------------
// app/tools/rhyme-checker/RhymeCheckerClient.tsx
// -----------------------------------------------------------
"use client"; // クライアントコンポーネントとしてマーク

import { useState, useEffect, useRef } from 'react';

export default function RhymeCheckerClient() {
    // --- State ---
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState('待機中');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    // --- Ref ---
    // SpeechRecognitionのインスタンスを保持
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // --- useEffect (コンポーネントのマウント時に実行) ---
    useEffect(() => {
        // ブラウザがAPIをサポートしているかチェック
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('エラー: お使いのブラウザは音声認識に対応していません。');
            return;
        }

        // --- インスタンスの作成 ---
        const recognition = new SpeechRecognition();
        recognition.continuous = true;     // 連続認識
        recognition.interimResults = true; // 途中結果
        recognition.lang = 'ja-JP';        // 言語

        recognitionRef.current = recognition; // Refに保存

        // --- イベントハンドラ ---
        recognition.onstart = () => {
            setStatus('認識中...');
        };

        recognition.onend = () => {
            setStatus('待機中');
            setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setStatus(`エラー: ${event.error}`);
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
            // 確定した結果を既存のfinalTranscriptに追加
            setFinalTranscript((prev) => prev + final);
        };

        // --- クリーンアップ関数 (アンマウント時) ---
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
            }
        };
    }, []); // 空の配列: マウント時に1回だけ実行

    // --- 操作関数 ---
    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setFinalTranscript('');   // 開始時にリセット
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
        // 録音中であれば停止する
        if (isListening) {
            stopListening();
        }
        // 全てのテキストをリセット
        setFinalTranscript('');
        setInterimTranscript('');
        // ステータスをリセット
        setStatus('待機中');
        console.log('テキストがリセットされました。');
    };

    // ★ フォーム送信時の処理
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // フォーム送信によるページの再読み込みを防止
        event.preventDefault();

        console.log('フォームが送信されました:', finalTranscript);
        alert(`以下の内容で送信します:\n\n${finalTranscript}`); //ここでAPIなどを叩く

        // ここで fetch() などを使ってサーバーに finalTranscript を送信する
    };

    // --- レンダリング ---
    return (
        <div className="max-w-3xl mx-auto p-6 font-sans">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">
                リアルタイム文字起こし
            </h1>

            {/* --- 録音ボタン --- */}
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={startListening}
                    disabled={isListening}
                    className={`
            px-5 py-2.5 font-medium rounded-lg shadow-sm text-white
            ${isListening
                            ? 'bg-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        }
          `}
                >
                    録音開始
                </button>
                <button
                    onClick={stopListening}
                    disabled={!isListening}
                    className={`
            px-5 py-2.5 font-medium rounded-lg shadow-sm text-white
            ${!isListening
                            ? 'bg-orange-500 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                        }
          `}
                >
                    録音停止
                </button>

                <button
                    onClick={handleReset}
                    className={`
            px-5 py-2.5 font-medium rounded-lg shadow-sm text-white
            bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
          `}
                >
                    リセット
                </button>
            </div>

            {/* --- ステータス表示 --- */}
            <div className="mb-4 text-lg font-semibold text-gray-700">
                ステータス: {status}
            </div>

            {/* --- リアルタイム結果表示（視覚用） --- */}
            <div className="w-full min-h-[150px] p-4 mb-6 bg-gray-50 border border-gray-300 rounded-md shadow-inner">
                {finalTranscript}
                <span className="text-gray-500">{interimTranscript}</span>
            </div>

            {/* --- 送信フォーム --- */}
            <form onSubmit={handleSubmit} className="mt-6">
                <label
                    htmlFor="transcript-textarea"
                    className="block mb-2 text-sm font-medium text-gray-700"
                >
                    認識結果 (編集・送信可能):
                </label>
                <textarea
                    id="transcript-textarea"
                    value={finalTranscript}
                    onChange={(e) => setFinalTranscript(e.target.value)}
                    rows={6}
                    className="w-full p-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="mt-4 px-6 py-2.5 text-base font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    この内容で送信
                </button>
            </form>
        </div>
    );
}