/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from 'react';
import { calculateTotalScore, fishKeywords } from '@/app/checkerLogic';
import type { TotalScore, FishTheme } from '@/app/checkerLogic';


interface RhymeCheckerProps {
    onSubmit: (transcript: string) => void;
    isLoading: boolean;
}
type Bubble = {
  id: string;
  left: number; // % (0-100)
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  bottom: number; // px - starting bottom position
  opacity: number; // initial opacity
};

export default function Home() {
  // 挑戦する魚（例として "maguro" で固定。実際には選択できるようにすると良い）
  const [currentFish, setCurrentFish] = useState("maguro");

  // 2. 「まだ使われていない」キーワードのリストを管理する State
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  // 3. 「今表示している」3つのキーワードを管理する State
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);

  useEffect(() => {
    // マスターリストから現在の魚のキーワード一覧を取得
    const masterList = fishKeywords[currentFish] || [];

    // マスターリストをシャッフルして「利用可能なキーワード」としてセット
    // これにより、ランダム性が担保されます
    setAvailableKeywords(shuffleArray(masterList));

    // 表示中のキーワードをリセット
    setCurrentKeywords([]);
  }, [currentFish]);

  // 5. 新しいキーワードを3つ取得する関数
  const getNextKeywords = () => {
    // 利用可能なキーワードが3つ未満の場合の処理
    if (availableKeywords.length === 0) {
      alert("もうキーワードがないぜ！お前の勝ちだ！");
      // TODO: ゲームクリア処理など
      return;
    }

    // 利用可能なリストから先頭の3つを取得
    const nextBatch = availableKeywords.slice(0, 3);

    // 残りを「次の利用可能なキーワード」として更新 (これが「一度使ったものを除外」する処理)
    const remaining = availableKeywords.slice(3);

    setCurrentKeywords(nextBatch);
    setAvailableKeywords(remaining);
  };

  // 6. ゲーム開始時に最初のキーワードを引く
  useEffect(() => {
    // availableKeywords が初期化された後（かつまだキーワードを引いていない）
    if (availableKeywords.length > 0 && currentKeywords.length === 0) {
      getNextKeywords();
    }
    // `getNextKeywords` を依存配列に入れると無限ループするので注意
  }, [availableKeywords, currentKeywords.length]);

  // --- State ---
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("待機中");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleTimersRef = useRef<number[]>([]); // setTimeout ids for cleanup
  const bubbleIntervalRef = useRef<number | null>(null);

  // --- Ref ---
  // SpeechRecognitionのインスタンスを保持
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // --- useEffect (コンポーネントのマウント時に実行) ---
  useEffect(() => {
    // ブラウザがAPIをサポートしているかチェック
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("エラー: お使いのブラウザは音声認識に対応していません。");
      return;
    }

    // --- インスタンスの作成 ---
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // 連続認識
    recognition.interimResults = true; // 途中結果
    recognition.lang = "ja-JP"; // 言語

    recognitionRef.current = recognition; // Refに保存

    // --- イベントハンドラ ---
    recognition.onstart = () => {
      setStatus("認識中...");
    };

    recognition.onend = () => {
      setStatus("待機中");
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setStatus(`エラー: ${event.error}`);
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

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
  useEffect(() => {
    // spawnInterval: 泡を生成するチェック間隔 (ms)
    const spawnInterval = 400; // ここの数値を小さくすると頻度が上がる
    // spawnChance: 毎回生成チェックする確率 (0-1)
    const spawnChance = 0.7;

    function spawnBubble() {
      if (Math.random() > spawnChance) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const left = Math.random() * 100; // % 表示位置
      const size = 6 + Math.random() * 28; // px
      const duration = 1 + Math.random(); // 秒: 浮上にかかる時間
      const delay = Math.random() * 1.2; // 秒
      const bottom = 8 + Math.random() * 100; // px: スタート位置（低めに）
      const opacity = 0.4 + Math.random() * 0.6;

      const bubble: Bubble = {
        id,
        left,
        size,
        duration,
        delay,
        bottom,
        opacity,
      };

      setBubbles((prev) => [...prev, bubble]);

      // duration + delay 経過後に配列から削除
      const timerId = window.setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== id));
      }, (duration + delay) * 1000 + 200);

      bubbleTimersRef.current.push(timerId);
    }

    // 起動直後に数個作る
    for (let i = 0; i < 3; i++) {
      setTimeout(spawnBubble, i * 200);
    }

    bubbleIntervalRef.current = window.setInterval(
      spawnBubble,
      spawnInterval
    ) as unknown as number;

    return () => {
      // interval/timersのクリーンアップ
      if (bubbleIntervalRef.current) {
        clearInterval(bubbleIntervalRef.current);
        bubbleIntervalRef.current = null;
      }
      bubbleTimersRef.current.forEach((id) => clearTimeout(id));
      bubbleTimersRef.current = [];
      setBubbles([]);
    };
  }, []);
  // --- 操作関数 ---
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setFinalTranscript(""); // 開始時にリセット
      setInterimTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Recognition start error:", error);
        setStatus("エラー: 開始に失敗");
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
    setFinalTranscript("");
    setInterimTranscript("");
    // ステータスをリセット
    setStatus("待機中");
    console.log("テキストがリセットされました。");
  };

  // ★ フォーム送信時の処理
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // フォーム送信によるページの再読み込みを防止
    event.preventDefault();

    console.log("フォームが送信されました:", finalTranscript);
    alert(`以下の内容で送信します:\n\n${finalTranscript}`); //ここでAPIなどを叩く

    // ここで fetch() などを使ってサーバーに finalTranscript を送信する
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden p-10">
      {/* 背景を画面全体に固定するレイヤー（背景はここだけにする） */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-500 to-blue-900" />
      </div>

      {/* 泡と背景画像レイヤー（背景画像をビューポート基準で配置） */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 bg-no-repeat bg-[length:100px_100px] bg-[position:70%_30%]"
          style={{ backgroundImage: "url('/images/pixelFish1.png')" }}
        />
        <div
          className="absolute inset-0 bg-no-repeat bg-[length:100px_100px] bg-[position:30%_0%]"
          style={{ backgroundImage: "url('/images/pixelFish2.png')" }}
        />
        <div
          className="absolute inset-0 bg-no-repeat bg-[length:100px_100px] bg-[position:20%_80%]"
          style={{ backgroundImage: "url('/images/pixelFish3.png')" }}
        />
        <div
          className="absolute inset-0 bg-no-repeat bg-[length:1500px_800px] bg-[position:50%_100%]"
          style={{ backgroundImage: "url('/images/seaweed.png')" }}
        />

        {/* ランダム生成される泡を描画（fixed レイヤーなので親の overflow に影響されない） */}
        {bubbles.map((b) => {
          const style: React.CSSProperties = {
            position: "absolute",
            left: `${b.left}%`,
            bottom: `${b.bottom}px`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            marginLeft: `-${b.size / 2}px`,
            borderRadius: "50%",
            background: `rgba(255,255,255,${Math.min(1, b.opacity)})`,
            boxShadow: "0 0 8px rgba(255,255,255,0.2)",
            transform: "translateY(0)",
            animation: `bubbleFloat ${b.duration}s linear ${b.delay}s forwards`,
            zIndex: 0,
            pointerEvents: "none",
          };
          return <div key={b.id} style={style} />;
        })}

        {/* アニメーション定義（vh を使い画面比率に応じて上まで行く） */}
        <style>{`
          @keyframes bubbleFloat {
            0% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            60% {
              transform: translateY(-30vh) scale(1.05);
              opacity: 0.6;
            }
            100% {
              transform: translateY(-60vh) scale(1.12);
              opacity: 0;
            }
          }
        `}</style>
      </div>

      {/* ===== コンテンツ領域（内部の background 指定は削除） ===== */}
      <div className="min-h-screen flex flex-col items-center justify-between relative p-10">
        <div className="min-h-screen flex flex-col items-center justify-between relative p-10">
          {/* ここからは UI（泡以外） */}
          <div className="flex justify-center gap-6 mt-10 z-10">
            {currentKeywords.map((keyword, index) => (
              <div
                key={index}
                className="w-40 h-24 bg-white/80 border-4 border-blue-900 
                     rounded-xl flex items-center justify-center 
                     font-bold text-xl shadow-lg 
                     hover:scale-105 hover:bg-sky-100 transition-transform"
              >
                {keyword}
              </div>
            ))}
          </div>

          <div className="z-10 w-full max-w-3xl">
            <form onSubmit={handleSubmit} className="mt-6">
              <label
                htmlFor="transcript-textarea"
                className="block mb-2 text-lg font-semibold text-white drop-shadow"
              >
                認識結果 (リアルタイム / 編集・送信可能):
              </label>
              <textarea
                id="transcript-textarea"
                value={finalTranscript + interimTranscript}
                onChange={(e) => {
                  setFinalTranscript(e.target.value);
                  setInterimTranscript("");
                }}
                rows={8}
                className="w-full p-4 text-base border-4 border-blue-800 
                     rounded-lg shadow-inner bg-white/90 
                     focus:ring-4 focus:ring-sky-400 focus:border-sky-500"
              />
              <button
                type="submit"
                className="mt-4 px-8 py-3 text-lg font-bold text-white 
                     bg-green-600 rounded-lg shadow-md 
                     hover:bg-green-700 focus:outline-none 
                     focus:ring-4 focus:ring-green-400"
              >
                この内容で送信
              </button>
            </form>
          </div>

          <div className="flex justify-center gap-6 mb-20 px-4 z-10">
            <button
              onClick={startListening}
              className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                   rounded-full font-bold text-xl shadow-lg
                   hover:bg-sky-300 active:scale-95 transition-all"
            >
              record
            </button>

            <button
              onClick={stopListening}
              className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                   rounded-full font-bold text-xl shadow-lg
                   hover:bg-sky-300 active:scale-95 transition-all"
            >
              stop
            </button>

            <button
              onClick={handleReset}
              className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                   rounded-full font-bold text-xl shadow-lg
                   hover:bg-sky-300 active:scale-95 transition-all"
            >
              reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
