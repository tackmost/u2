// クライアントコンポーネントの宣言
'use client';

import { useState } from 'react';
// 分離したAPIロジックと型定義をインポート
import { getRhymeScore, RhymeResult } from '@/lib/rhymeService';
// (注: Next.jsでは @/ が src/ または ルート を指すエイリアスとして設定されていることが多いです)
// (もしエイリアスがなければ '../lib/rhymeService' のように相対パスで指定します)

// ------------------------------------------------------------------
// メインのUIコンポーネント
// ------------------------------------------------------------------

// export default function RhymeCheckerPage() { // ← 元の関数名
export default function RhymeCheckerClient() { // ← 関数名を変更
  
  // ------------------------------------------------------------------
  // State（状態）の定義
  // ------------------------------------------------------------------
  
  const [textInput, setTextInput] = useState<string>('');
  const [result, setResult] = useState<RhymeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // イベントハンドラ
  // ------------------------------------------------------------------

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    if (!textInput.trim()) {
      setError('テキストを入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      // 分離したAPI呼び出し関数を使う
      const scoreResult = await getRhymeScore(textInput);
      setResult(scoreResult);

    } catch (error: unknown) {
      console.error('Error:', error);
      if (error instanceof Error) {
        setError(`エラーが発生しました: ${error.message}`);
      } else {
        setError('不明なエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // レンダリング (JSX)
  // ------------------------------------------------------------------
  return (
    // <main> タグは app/tools/rhyme-checker/page.tsx が担当するので、
    // ここでは <div> から始めます。
    <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-lg">
      
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
        AI 韻チェッカー
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
  );
}
