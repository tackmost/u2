"use client";

import { useState, useEffect, useRef } from "react";
import { fishKeywords, calculateTotalScore, TotalScore, FishTheme } from "./checkerLogic";

type FishKey = keyof typeof fishKeywords;

const fishNameMap: Record<FishKey, string> = {
  maguro: "マグロ",
  tai: "鯛 (タイ)",
  iwashi: "鰯 (イワシ)",
  same: "鮫 (サメ)",
};

function shuffleArray(array: string[]): string[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
type Bubble = {
  id: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  bottom: number;
  opacity: number;
};


export default function Home() {
  // 挑戦する魚
  const [currentFish, setCurrentFish] = useState<FishKey | null>(null);

  // 使われていないキーワードの管理 State
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  // 表示されているキーワードの管理 State
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);

  useEffect(() => {
    const fishKeys = Object.keys(fishKeywords) as FishKey[];
    const randomIndex = Math.floor(Math.random() * fishKeys.length);

    setCurrentFish(fishKeys[randomIndex]);
  }, []);

  useEffect(() => {
    if (currentFish) {
      const masterList = fishKeywords[currentFish as FishTheme] || [];
      setAvailableKeywords(shuffleArray(masterList));
      setCurrentKeywords([]);
    }
  }, [currentFish]);

  // 新しいキーワドを首都kう
  const getNextKeywords = () => {
    // 利用可能なキーワードが3つ未満の場合の処理
    // if (availableKeywords.length === 0) {
    //   alert("もうキーワードがないぜ！お前の勝ちだ！");
    //   return;
    // }

    const nextBatch = availableKeywords.slice(0, 3);
    const remaining = availableKeywords.slice(3);

    setCurrentKeywords(nextBatch);
    setAvailableKeywords(remaining);
  };

  // 最初のキーワードを表示
  useEffect(() => {
    if (currentFish && availableKeywords.length > 0 && currentKeywords.length === 0) {
      getNextKeywords();
    }
  }, [currentFish, availableKeywords, currentKeywords.length, getNextKeywords]);

  const handleChangeTheme = () => {
    const fishKeys = Object.keys(fishKeywords) as FishKey[];
    let nextFish = currentFish;

    // 違う種類の魚が選ばれるまでループ
    if (fishKeys.length > 1) {
      while (nextFish === currentFish) {
        const randomIndex = Math.floor(Math.random() * fishKeys.length);
        nextFish = fishKeys[randomIndex];
      }
    }

    setCurrentFish(nextFish);
    setScoreResult(null);
    setFinalTranscript("");
    setInterimTranscript("");
  };

  const handleNextKeywords = () => {
    getNextKeywords();
    setScoreResult(null);
  };

  // --- State ---
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("待機中");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleTimersRef = useRef<number[]>([]);
  const bubbleIntervalRef = useRef<number | null>(null);

  // 採点結果を保持する State
  const [scoreResult, setScoreResult] = useState<TotalScore | null>(null);

  // --- Ref ---
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    // if (!SpeechRecognition) {
    //   setStatus("エラー: お使いのブラウザは音声認識に対応していません。");
    //   return;
    // }

    // --- インスタンスの作成 ---
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ja-JP";

    recognitionRef.current = recognition;

    // --- 音声認識処理 ---
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

  // --- 操作関数 ---
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setFinalTranscript(""); // 開始時にリセット
      setInterimTranscript("");
      setScoreResult(null); // 採点結果をリセット
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
    if (isListening) {
      stopListening();
    }
    setFinalTranscript("");
    setInterimTranscript("");
    setScoreResult(null);
    setStatus("待機中");
    console.log("テキストがリセットされました。");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log("フォームが送信されました:", finalTranscript);

    const result = calculateTotalScore(finalTranscript, currentFish as FishTheme);
    setScoreResult(result);
  };
  // ここまでがラップ関係

  // 泡生成
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

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden p-10">
      <div className="fixed inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-500 to-blue-900" />
      </div>
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

        {/* ランダム生成される泡を描画 */}
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

      {/* ここからは 泡（背景）以外のUI */}
      <header className="z-10 flex-shrink-0 mb-4">
        <h1
          className="text-8xl md:text-5xl font-extrabold text-white tracking-wider"
          style={{ textShadow: '4px 4px 2px rgba(0,0,0,0.5)' }}
        >
          韻　DE　RAP　BATTLE
        </h1>
      </header>

      {currentFish && (
        <div className="flex z-10 mt-10 mb-4 text-center flex-shrink-0">
          {/* <span className="text-4xl pb-2 font-semibold text-white drop-shadow" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.5)' }}>お題</span> */}
          <h1 className="text-5xl font-extrabold text-white drop-shadow-lg" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.5)' }}>
            お題　{fishNameMap[currentFish]}
          </h1>
        </div>
      )}

      <div className="flex justify-center gap-6 z-10 flex-shrink-0">
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

      <div className="flex justify-center gap-4 my-8 z-10 flex-shrink-0">
        <button
          onClick={handleChangeTheme}
          className="px-5 py-2.5 text-2xl rounded-lg shadow-sm text-white
                     bg-cyan-600 hover:bg-cyan-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                     transition-all active:scale-95"
        >
          お題を変更
        </button>
        <button
          onClick={handleNextKeywords}
          // キーワードがもう無い場合は押せなくする
          disabled={availableKeywords.length === 0}
          className="px-5 py-2.5 text-2xl rounded-lg shadow-sm text-white
                     bg-cyan-600 hover:bg-cyan-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
                     transition-all active:scale-95
                     disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          キーワード変更
        </button>
      </div>

      <div className="z-10 w-full max-w-3xl flex-1 overflow-y-auto my-0">
        <form onSubmit={handleSubmit} className="mt-6">
          <textarea
            id="transcript-textarea"
            value={finalTranscript + interimTranscript}
            onChange={(e) => {
              setFinalTranscript(e.target.value);
              setInterimTranscript("");
              setScoreResult(null);
            }}
            rows={8}
            className="w-full p-4 text-base border-4 border-blue-800 
                       rounded-lg shadow-inner bg-white/90 
                       focus:ring-4 focus:ring-sky-400 focus:border-sky-500"
          />

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!finalTranscript.trim()}
              className="mt-4 px-8 py-3 text-lg font-bold text-white 
                         bg-green-600 rounded-lg shadow-md 
                         hover:bg-green-700 focus:outline-none 
                         focus:ring-4 focus:ring-green-400
                         transition-all active:scale-95
                         disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              この内容で採点
            </button>
          </div>
        </form>

        {/* ===== 採点結果表示 ===== */}
        {scoreResult && (
          <div className="mt-8 p-6 bg-white/90 border-4 border-blue-800 rounded-lg shadow-xl z-20">
            <h2 className="text-3xl font-bold text-center text-blue-900 mb-4">
              採点結果
            </h2>
            <div className="text-center mb-6">
              <span className="text-lg font-semibold text-gray-800">総合得点</span>
              <div className="text-7xl font-extrabold text-red-600 my-2">
                {scoreResult.totalScore} <span className="text-3xl text-gray-800">点</span>
              </div>
              <p className="text-xl font-bold text-yellow-600 drop-shadow-md">
                {scoreResult.finalMessage}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center p-3 bg-sky-100 rounded-t-lg border-b-2 border-sky-300">
                  <span className="font-bold text-lg text-sky-800">
                    ① キーワード
                  </span>
                  <span className="font-bold text-2xl text-sky-900">
                    {scoreResult.keyword.score}点
                  </span>
                </div>
                <p className="text-sm text-gray-700 p-2 bg-white rounded-b-lg">
                  {scoreResult.keyword.detail}
                </p>
              </div>

              {/* 韻（ライム） */}
              <div>
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-t-lg border-b-2 border-green-300">
                  <span className="font-bold text-lg text-green-800">
                    ② 韻 (ライム)
                  </span>
                  <span className="font-bold text-2xl text-green-900">
                    {scoreResult.rhyme.score}点
                  </span>
                </div>
                <p className="text-sm text-gray-700 p-2 bg-white rounded-b-lg">
                  {scoreResult.rhyme.detail}
                </p>
              </div>

              {/* リズム */}
              <div>
                <div className="flex justify-between items-center p-3 bg-purple-100 rounded-t-lg border-b-2 border-purple-300">
                  <span className="font-bold text-lg text-purple-800">
                    ③ リズム
                  </span>
                  <span className="font-bold text-2xl text-purple-900">
                    {scoreResult.rhythm.score}点
                  </span>
                </div>
                <p className="text-sm text-gray-700 p-2 bg-white rounded-b-lg">
                  {scoreResult.rhythm.detail}
                </p>
              </div>

              {/* 文脈 */}
              <div>
                <div className="flex justify-between items-center p-3 bg-orange-100 rounded-t-lg border-b-2 border-orange-300">
                  <span className="font-bold text-lg text-orange-800">
                    ④ 文脈 (ミーニング)
                  </span>
                  <span className="font-bold text-2xl text-orange-900">
                    {scoreResult.meaning.score}点
                  </span>
                </div>
                <p className="text-sm text-gray-700 p-2 bg-white rounded-b-lg">
                  {scoreResult.meaning.detail}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* ===== 採点結果表示 ===== */}
      </div>

      <div className="flex justify-center gap-6 mb-20 px-4 z-10 flex-shrink-0 my-4">
        <button
          onClick={startListening}
          className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                    rounded-full font-bold text-xl shadow-lg
                  hover:bg-sky-300 active:scale-95 transition-all"
        >
          PLAY
        </button>

        <button
          onClick={stopListening}
          className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                    rounded-full font-bold text-xl shadow-lg
                  hover:bg-sky-300 active:scale-95 transition-all"
        >
          STOP
        </button>

        <button
          onClick={handleReset}
          className="w-40 h-20 bg-sky-200 border-4 border-blue-900 
                    rounded-full font-bold text-xl shadow-lg
                  hover:bg-sky-300 active:scale-95 transition-all"
        >
          RESET
        </button>
      </div>
    </div>
  );
}