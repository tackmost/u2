'use client';

import { useState, useEffect, useRef } from 'react';
// npm install kuromoji が必要
// @ts-ignore // TS7016: 'kuromoji' の型定義が見つからないため無視します
import * as kuromoji from 'kuromoji';
// 先ほど作成したユーティリティをインポート (app/tools/vowel-checker/ から ルート/lib/ へのパスを修正)
import { getVowels, levenshteinDistance, calculateSimilarity } from '../../lib/vowelUtils';

// kuromoji.js の型定義 (型ファイルがないため 'any' を指定)
type KuromojiTokenizer = any;
type KuromojiToken = any; // 本来は kuromoji.IpadicFeatures

// 結果を格納する型
interface VowelResult {
  text: string;
  reading: string;
  vowels: string;
}

// ------------------------------------------------------------------
// メインのUIコンポーネント
// ------------------------------------------------------------------
export default function VowelCheckerClient() {
  
  // State
  const [text1, setText1] = useState<string>('');
  const [text2, setText2] = useState<string>('');
  const [result1, setResult1] = useState<VowelResult | null>(null);
  const [result2, setResult2] = useState<VowelResult | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 辞書の読み込み状態
  const [isTokenizerLoading, setIsTokenizerLoading] = useState<boolean>(true);
  // kuromoji.js のインスタンスを useRef で保持
  const tokenizer = useRef<KuromojiTokenizer | null>(null);

  // ------------------------------------------------------------------
  // kuromoji.js の初期化 (初回マウント時)
  // ------------------------------------------------------------------
  useEffect(() => {
    // README-SETUP.md の手順に従って辞書が配置されていることが前提
    const dicPath = '/kuromoji-dict'; 
    
    // console.log('kuromoji.js: 辞書の読み込みを開始します...', dicPath);
    
    // @ts-ignore // kuromoji が any なので builder も any
    kuromoji.builder({ dicPath: dicPath }).build((err: any, builtTokenizer: KuromojiTokenizer) => { // TS7006 (err, builtTokenizer) を 'any' で修正
      if (err) {
        console.error('kuromoji.js: 辞書の読み込みに失敗しました。', err);
        setError('辞書の読み込みに失敗しました。public/kuromoji-dict/ に辞書ファイルが正しく配置されているか確認してください。');
      } else {
        // console.log('kuromoji.js: 辞書の読み込みが完了しました。');
        tokenizer.current = builtTokenizer;
      }
      setIsTokenizerLoading(false);
    });
  }, []); // 空の依存配列で、コンポーネントマウント時に1回だけ実行

  // ------------------------------------------------------------------
  // 比較実行ハンドラ
  // ------------------------------------------------------------------
  const handleSubmit = () => {
    if (!tokenizer.current) {
      setError('形態素解析器がまだ準備中です。');
      return;
    }
    if (!text1 || !text2) {
      setError('両方のテキストボックスに入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult1(null);
    setResult2(null);
    setSimilarityScore(null);

    try {
      // kuromoji.js で解析
      const tokens1: KuromojiToken[] = tokenizer.current.tokenize(text1);
      const tokens2: KuromojiToken[] = tokenizer.current.tokenize(text2);

      // 読み仮名（カタカナ）を取得
      // 読み仮名がない場合（例：句読点のみ）は空文字にする
      const reading1 = tokens1.map((t: KuromojiToken) => t.reading || '').join(''); // TS7006 (t) を 'KuromojiToken' (any) で修正
      const reading2 = tokens2.map((t: KuromojiToken) => t.reading || '').join(''); // TS7006 (t) を 'KuromojiToken' (any) で修正

      // 母音を抽出
      const vowels1 = getVowels(reading1);
      const vowels2 = getVowels(reading2);
      
      // 結果をセット
      setResult1({ text: text1, reading: reading1, vowels: vowels1 });
      setResult2({ text: text2, reading: reading2, vowels: vowels2 });

      // 類似度を計算
      const distance = levenshteinDistance(vowels1, vowels2);
      const score = calculateSimilarity(distance, vowels1.length, vowels2.length);
      setSimilarityScore(score);

    } catch (err: unknown) {
      console.error('解析エラー:', err);
      setError(err instanceof Error ? err.message : '解析中に不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // レンダリング (JSX)
  // ------------------------------------------------------------------
  return (
    <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-lg">
      
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
        機械式 母音チェッカー
      </h1>
      <p className="text-center text-gray-600 mb-6">
        (Powered by kuromoji.js)
      </p>

      {/* 辞書読み込み中・エラー表示 */}
      {isTokenizerLoading && (
        <div className="p-4 bg-blue-100 text-blue-700 rounded-lg text-center">
          形態素解析の辞書（約18MB）を読み込んでいます...
        </div>
      )}
      {error && (
        <div className="my-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* 入力フォーム */}
      <div className="space-y-4">
        <textarea 
          rows={3} 
          className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" 
          placeholder="テキスト1 (例: 韻をチェック)"
          value={text1}
          onChange={(e) => setText1(e.target.value)}
          disabled={isTokenizerLoading || isLoading}
        />
        <textarea 
          rows={3} 
          className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" 
          placeholder="テキスト2 (例: 印をチェック)"
          value={text2}
          onChange={(e) => setText2(e.target.value)}
          disabled={isTokenizerLoading || isLoading}
        />

        <button 
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-400"
          onClick={handleSubmit}
          disabled={isTokenizerLoading || isLoading}
        >
          {isLoading ? '解析中...' : '母音を比較する'}
        </button>
      </div>

      {/* 結果表示エリア */}
      {(result1 && result2 && similarityScore !== null) && (
        <div className="mt-8 border-t pt-6 space-y-4">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">解析結果</h2>
          
          {/* スコア表示 */}
          <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200">
            <p className="text-lg text-blue-800 mb-1">母音の類似度スコア</p>
            <div className="text-7xl font-bold text-blue-600 my-2">
              {similarityScore}
            </div>
            <p className="text-lg text-blue-800 mb-0">点</p>
            <p className="text-sm text-gray-500 mt-2">
              (2つの母音文字列のレーベンシュタイン距離に基づき算出)
            </p>
          </div>

          {/* 詳細表示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard title="テキスト1" result={result1} />
            <ResultCard title="テキスト2" result={result2} />
          </div>
        </div>
      )}

    </div>
  );
}

// 結果表示用のヘルパーコンポーネント
function ResultCard({ title, result }: { title: string, result: VowelResult | null }) {
  if (!result) return null;
  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium text-gray-500">入力:</span>
          <p className="text-gray-800 break-words">{result.text}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">読み (カタカナ):</span>
          <p className="text-gray-800 break-words">{result.reading || '(読みなし)'}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">母音 (A/I/U/E/O/N):</span>
          <p className="text-lg font-bold text-blue-600 font-mono break-words">
            {result.vowels || '(母音なし)'}
          </p>
        </div>
      </div>
    </div>
  );
}

