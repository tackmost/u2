'use client';

import { useState } from 'react';

interface RhymeResult {
  score: number;  // 0-100点の点数
  reason: string; // 採点理由
}

export default function RhymeCheckerPage() {
  
  /** ユーザーが入力したテキスト */
  const [textInput, setTextInput] = useState<string>('');
  
  /** APIからの採点結果 */
  const [result, setResult] = useState<RhymeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  /** LLMに期待するJSONの型定義 */
  const responseSchema = {
    type: "OBJECT",
    properties: {
      score: { 
        type: "NUMBER",
        description: "0から100点までの韻の踏み具合の点数。厳密に採点する。"
      },
      reason: { 
        type: "STRING",
        description: "採点の具体的な理由。どの単語の母音が一致しているか、リズムがどうかを簡潔に分析する。"
      }
    },
    required: ["score", "reason"]
  };

  /** LLMへの指示（システムプロンプト） */
  const systemPrompt = `あなたは韻（ライム）の専門家です。入力された日本語のテキスト（歌詞、詩、文章など）を分析し、韻の踏み具合（母音の一致、リズミカルさ、語感の良さ）を0点から100点で厳格に採点してください。
採点基準:
- 0-30点: ほとんど韻が踏めていない。
- 31-60点: 部分的に簡単な韻（例：語尾の母音が1〜2文字一致）が見られる。
- 61-80点: 複数の箇所で明確な韻（母音が3文字以上一致）が意図的に使われており、リズミカルである。
- 81-100点: 高度な技術（例：長い母音の一致、複数の単語をまたぐ韻、文中の随所）が使われており、非常に完成度が高い。

なぜその点数になったのか、どの部分がどのように韻を踏んでいる（または踏めていない）のかを具体的に、簡潔に説明してください。`;
  
  /**
   * Exponential Backoff（指数関数的バックオフ）でAPIリトライを行うfetchラッパー
   * @param url リクエストURL
   * @param options fetchのオプション
   * @param maxRetries 最大リトライ回数
   * @returns fetchのレスポンス
   */
  async function fetchWithBackoff(url: string, options: RequestInit, maxRetries: number = 5): Promise<Response> {
    let delay = 1000; // 最初の遅延は1秒
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          // 429 (Too Many Requests) や 5xx サーバーエラーの場合リトライ
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Retryable error: ${response.status}`);
          } else {
            // それ以外のクライアントエラーはリトライしない
            return response;
          }
        }
        return response;
      } catch (error) {
        if (i === maxRetries - 1) {
          // 最後の試行でも失敗したらエラーを投げる
          throw error as Error;
        }
        // リトライ前に待機
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 遅延時間を倍増
      }
    }
    // ここには到達しないはずだが、型エラーを防ぐためにダミーのエラーを投げる
    throw new Error('Max retries reached, but no response or error was returned.');
  }


  // ------------------------------------------------------------------
  // イベントハンドラ
  // ------------------------------------------------------------------

  /**
   * 「採点する」ボタンがクリックされたときの処理
   */
  const handleSubmit = async () => {
    // UIをリセット
    setIsLoading(true);
    setError(null);
    setResult(null);

    // 入力チェック
    if (!textInput.trim()) {
      setError('テキストを入力してください。');
      setIsLoading(false);
      return;
    }

    // APIリクエストのペイロード
    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        { parts: [{ text: textInput }] }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5 // 採点の安定性を高める
      }
    };

    try {
      // API呼び出し
      const response = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: { message: "レスポンスの解析に失敗しました。" } }));
        const errorMsg = errorBody?.error?.message || `APIエラーが発生しました (ステータス: ${response.status})`;
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.candidates && result.candidates[0].content.parts[0].text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(jsonText) as RhymeResult;
        
        if (parsedJson.score !== undefined && parsedJson.reason) {
          // 結果をStateにセット
          setResult(parsedJson);
        } else {
          throw new Error("APIは期待された形式（score, reason）で応答しませんでした。");
        }
      } else {
        throw new Error("APIから有効な応答が得られませんでした。");
      }

    } catch (error: unknown) {
      console.error('Error:', error);
      if (error instanceof Error) {
        setError(`エラーが発生しました: ${error.message}`);
      } else {
        setError('不明なエラーが発生しました。');
      }
    } finally {
      // ローディング状態を解除
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // レンダリング (JSX)
  // ------------------------------------------------------------------
  return (
    // Next.js (app router)では、<head>や<body>タグは
    // app/layout.tsx で管理されるため、ここでは <main> から始めます。
    // Tailwind CSSはNext.jsプロジェクトで設定済みと仮定します。
    <main className="bg-gray-100 min-h-screen flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-lg">
        
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          AI 韻チェッカー (Next.js)
        </h1>
        <p className="text-center text-gray-600 mb-6">
          歌詞や詩、文章を入力してください。AIが韻の踏み具合を採点します。
        </p>

        {/* 入力フォーム */}
        <div className="space-y-4">
          <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 sr-only">
            採点するテキスト
          </label>
          <textarea 
            id="text-input" 
            rows={6} 
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none" 
            placeholder="ここにテキストを入力... (例: 明日の朝、開く窓...)"
            value={textInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextInput(e.target.value)}
            disabled={isLoading}
          />

          <button 
            id="submit-button" 
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition duration-300 ease-in-out flex items-center justify-center disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {/* ローディングスピナー */}
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isLoading ? '採点中...' : '採点する'}</span>
          </button>
        </div>

        {/* エラーメッセージ表示エリア */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* 結果表示エリア */}
        {result && (
          <div className="mt-8 border-t pt-6">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">採点結果</h2>
            
            <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-lg text-blue-800 mb-1">あなたのテキストの韻は...</p>
              <div className="text-7xl font-bold text-blue-600 my-2">
                {result.score}
              </div>
              <p className="text-lg text-blue-800 mb-4">点です</p>
              
              <hr className="my-4" />
              
              <h3 className="text-xl font-semibold text-gray-700 mb-2">AIによる分析・理由</h3>
              <p className="text-gray-600 text-left whitespace-pre-wrap">
                {result.reason}
              </p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
