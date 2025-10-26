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

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-sky-300 via-blue-500 to-blue-900 p-10">
      {/* 上のキー矩形 */}
      <div className="flex justify-center gap-6 mt-10">
        {/* currentKeywords 配列の中身を1つずつ取り出して表示 */}
        {currentKeywords.map((keyword, index) => (
          <div
            // Reactがリストを識別するために 'key' が必要です
            key={index}
            className="w-40 h-24 bg-white border-2 border-black rounded-md flex items-center justify-center font-bold text-xl"
          >
            {/* ここに keyword が入る */}
            {keyword}
          </div>
        ))}
      </div>

      <div>
        <form onSubmit={handleSubmit} className="mt-6">
          <label
            htmlFor="transcript-textarea"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            認識結果 (リアルタイム / 編集・送信可能):
          </label>
          <textarea
            id="transcript-textarea"
            value={finalTranscript + interimTranscript} // ★ 確定 + 途中文 を両方表示
            onChange={(e) => {
              setFinalTranscript(e.target.value); // ★ ユーザーが編集したら、内容をfinalに設定
              setInterimTranscript(''); // ★ 編集と同時にinterimはクリアする
            }}
            rows={8} // 少し高さを大きくします
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

      {/* 下のレコード矩形 */}
      {/* 下のレコード矩形 */}
      <div className="flex justify-center mb-20 px-4">
        <button
          onClick={startListening}
          className="w-80 md:w-96 lg:w-[500px] h-20 bg-white border-4 border-black rounded-xl font-bold text-xl
               hover:bg-blue-200 active:scale-95 transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Record button"
        >
          record
        </button>

        <button
          onClick={stopListening}
          className="w-80 md:w-96 lg:w-[500px] h-20 bg-white border-4 border-black rounded-xl font-bold text-xl
               hover:bg-blue-200 active:scale-95 transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Record button"
        >
          stop
        </button>

        <button
          onClick={handleReset}
          className="w-80 md:w-96 lg:w-[500px] h-20 bg-white border-4 border-black rounded-xl font-bold text-xl
               hover:bg-blue-200 active:scale-95 transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Record button"
        >
          reset
        </button>
      </div>
    </div>
  );
};
