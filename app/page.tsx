/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { fishKeywords } from "@/lib/keywords";

function shuffleArray(array: string[]): string[] {
  const newArray = [...array]; // 元の配列を壊さないようにコピー
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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
      const duration = 1 + Math.random() ; // 秒: 浮上にかかる時間
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
    <div
      className="min-h-screen flex flex-col items-center justify-between 
                  bg-gradient-to-b from-sky-200 via-blue-500 to-blue-900 
                  relative overflow-hidden p-10"
    >
      <div
        className="min-h-screen flex flex-col items-center justify-between 
             relative overflow-hidden p-10
             bg-gradient-to-b from-sky-200 via-blue-500 to-blue-900
             bg-[position:100%_30%] bg-no-repeat bg-[length:100px_100px]"
        style={{ backgroundImage: "url('/images/pixelFish1.png')" }}
      >
        <div
          className="min-h-screen flex flex-col items-center justify-between 
             relative overflow-hidden p-10
             bg-gradient-to-b from-sky-200 via-blue-500 to-blue-900
             bg-[position:30%_0%] bg-no-repeat bg-[length:100px_100px]"
          style={{ backgroundImage: "url('/images/pixelFish2.png')" }}
        >
          {/* 泡用のスタック（絶対配置エリア） */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* 静的な小さなバブル（元の3つ） */}
            <div className="animate-bounce w-6 h-6 bg-white/40 rounded-full absolute top-10 left-1/4"></div>
            <div className="animate-bounce w-4 h-4 bg-white/30 rounded-full absolute top-1/3 left-2/3 delay-200"></div>
            <div className="animate-bounce w-8 h-8 bg-white/20 rounded-full absolute bottom-20 right-1/4 delay-500"></div>

            {/* ランダム生成される泡を描画 */}
            {bubbles.map((b) => (
              <div
                key={b.id}
                style={{
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
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              />
            ))}

            {/* アニメーション定義（インラインで埋め込む） */}
            <style>{`
              @keyframes bubbleFloat {
                0% {
                  transform: translateY(0) scale(1);
                  opacity: 1;
                }
                60% {
                  transform: translateY(-120px) scale(1.05);
                  opacity: 0.6;
                }
                100% {
                  transform: translateY(-520px) scale(1.12);
                  opacity: 0;
                }
              }
            `}</style>
          </div>

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