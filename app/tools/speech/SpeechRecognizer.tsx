"use client";

import { useState, useEffect, useRef } from 'react';

export default function SpeechRecognizer() {
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

    return (
        <div>
            <style jsx>{`
        .container {
          padding: 20px;
          font-family: sans-serif;
        }
        .buttons {
          margin-bottom: 20px;
        }
        .buttons button {
          margin-right: 10px;
          padding: 8px 12px;
          font-size: 16px;
        }
        .status {
          font-weight: bold;
          margin-bottom: 10px;
        }
        .result-box {
          border: 1px solid #ccc;
          padding: 10px;
          min-height: 150px;
          background-color: #f9f9f9;
        }
        .interim {
          color: grey;
        }
      `}</style>

            <div className="container">
                <h1>リアルタイム文字起こし (Next.js)</h1>

                <div className="buttons">
                    <button onClick={startListening} disabled={isListening}>
                        録音開始
                    </button>
                    <button onClick={stopListening} disabled={!isListening}>
                        録音停止
                    </button>
                </div>

                <div className="status">ステータス: {status}</div>

                <div className="result-box">
                    {/* 確定したテキスト */}
                    {finalTranscript}
                    {/* 認識中のテキスト */}
                    <span className="interim">{interimTranscript}</span>
                </div>
            </div>
        </div>
    );
}