'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// 表示モードの型定義
type DisplayMode = 'waveform' | 'frequency';

// マイクと波形表示、録音機能を持つメインコンポーネント
const AudioRecorderPage: React.FC = () => {
  // 状態管理
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [statusMessage, setStatusMessage] = useState('録音ボタンを押して開始');
  
  // 波形表示モードの状態
  const [displayMode, setDisplayMode] = useState<DisplayMode>('waveform');

  // DOM要素への参照
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Web Audio API & MediaRecorderのインスタンス
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);


  // ------------------------------------
  // I. Web Audio APIを使った描画ロジック
  // ------------------------------------

  /**
   * 静的なメッセージをCanvasに描画するヘルパー関数
   */
  const drawStaticMessage = useCallback((mode: DisplayMode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const WIDTH = canvas.offsetWidth;
    const HEIGHT = canvas.offsetHeight;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    canvasCtx.fillStyle = '#f3f4f6';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // 中央にメッセージを描画
    canvasCtx.font = '20px Inter, sans-serif';
    canvasCtx.fillStyle = '#9ca3af';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    
    const message = mode === 'waveform' ? '▶︎ 時間領域 (波形) 表示モード' : '▶︎ 周波数領域 (スペクトル) 表示モード';
    canvasCtx.fillText(message, WIDTH / 2, HEIGHT / 2);

  }, []);

  /**
   * 時間領域（波形）データをCanvasに描画する
   */
  const drawWaveform = useCallback((data: Uint8Array, canvasCtx: CanvasRenderingContext2D, WIDTH: number, HEIGHT: number, strokeStyle: string) => {
    canvasCtx.fillStyle = '#f3f4f6'; // 背景クリア
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = strokeStyle;
    canvasCtx.beginPath();

    const bufferLength = data.length;
    const sliceWidth = WIDTH * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // データは0-255の範囲なので、0-128の範囲で正規化して描画
        const v = data[i] / 128.0; 
        const y = v * HEIGHT / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(WIDTH, HEIGHT / 2);
    canvasCtx.stroke();
  }, []);

  /**
   * 周波数領域（スペクトル）データをCanvasに描画する
   */
  const drawFrequency = useCallback((data: Uint8Array, canvasCtx: CanvasRenderingContext2D, WIDTH: number, HEIGHT: number, fillStyle: string) => {
    canvasCtx.fillStyle = '#f3f4f6'; // 背景クリア
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    const bufferLength = data.length;
    const barWidth = (WIDTH / bufferLength) * 2.5; // バーの幅
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        // データ値（0-255）をCanvasの高さにマッピング
        let barHeight = data[i] * 1.5; 

        // 周波数が高い部分はバーの幅を小さく、高さを抑える
        if (i > bufferLength / 2) {
            barHeight *= 0.8;
        }

        // バーの色を設定
        canvasCtx.fillStyle = fillStyle;
        // バーを描画 (x座標, y座標, 幅, 高さ)
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight); 

        x += barWidth + 1; // バーとバーの間に隙間を空ける
    }
  }, []);
  
  // リアルタイム描画のメインループ
  const drawWave = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return; // AnalyserNodeがない場合は描画しない

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const WIDTH = canvas.offsetWidth;
    const HEIGHT = canvas.offsetHeight;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // 波形描画用のデータ配列（時間領域）
    const waveformArray = new Uint8Array(analyser.frequencyBinCount);
    // 周波数描画用のデータ配列（周波数領域）
    const frequencyArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      // 録音中でなければアニメーションを停止し、静的メッセージを表示
      if (!isRecording) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        drawStaticMessage(displayMode); // 静的メッセージを描画
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
      
      // 描画モードに応じてデータを取得し、対応する関数で描画
      if (displayMode === 'waveform') {
        analyser.getByteTimeDomainData(waveformArray);
        drawWaveform(waveformArray, canvasCtx, WIDTH, HEIGHT, '#ef4444'); // 赤色
      } else { // frequency mode
        analyser.getByteFrequencyData(frequencyArray);
        drawFrequency(frequencyArray, canvasCtx, WIDTH, HEIGHT, '#10b981'); // 緑色
      }
    };

    draw();
  }, [isRecording, displayMode, drawWaveform, drawFrequency, drawStaticMessage]);

  // ------------------------------------
  // II. 録音操作ロジック
  // ------------------------------------

  const handleStartRecording = async () => {
    setStatusMessage('マイクへのアクセスを確認中...');
    setAudioURL(null);
    setAudioBlob(null);

    try {
      // ユーザーのマイクから音声ストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 1. Web Audio APIの設定（波形表示用）
      // AudioContextの初期化はユーザー操作（ボタンクリック）内で行う
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      const analyser = analyserRef.current;

      // ノードを接続: Source -> Analyser
      source.connect(analyser);

      analyser.fftSize = 2048; // データサイズ

      // 2. MediaRecorder APIの設定（録音データ取得用）
      const recordedChunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        // 録音が停止したら、チャンクを結合してBlobを作成
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        setStatusMessage(`録音完了。音声データ(${blob.size}B)が保存されました。`);

        // ストリームを停止してマイクを解放
        stream.getTracks().forEach(track => track.stop());
      };

      // 3. 録音開始
      recorder.start();
      setIsRecording(true);
      setStatusMessage('録音中...');
      drawWave(); // 波形描画を開始

    } catch (error) {
      console.error('マイクアクセスまたは録音エラー:', error);
      setStatusMessage('エラー: マイクにアクセスできませんでした。');
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && isRecording) {
      // ストリームとMediaRecorderを停止
      recorder.stop();
      // recorder.stream.getTracks().forEach(track => track.stop()); // onstopで実行されるため不要
      setIsRecording(false);
    }
    
    // 録音停止時にアニメーションをキャンセル
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
  };

  const handleReset = () => {
    // 録音を完全に停止（まだ停止されていない場合）
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
    }
    
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
    setAudioBlob(null);
    setIsRecording(false);
    setStatusMessage('録音をリセットしました。');

    // 🔴 修正点: AudioContextがまだ開いている場合のみ閉じる
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("AudioContext close error:", e));
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    
    // Canvasをクリアし、現在のモードの静的メッセージを描画
    drawStaticMessage(displayMode);
  };

  // ------------------------------------
  // III. ダウンロードとクリーンアップ
  // ------------------------------------

  const handleDownload = () => {
    if (audioBlob && audioURL) {
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = audioURL;
      a.download = `recording-${Date.now()}.webm`; // ファイル名を指定
      a.click();
      document.body.removeChild(a);
      setStatusMessage('録音ファイルをダウンロードしました。');
    }
  };

  // ------------------------------------
  // IV. UI操作
  // ------------------------------------
  
  const handleModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    
    // 録音中であれば、描画ループを再起動して新しいモードを適用
    if (isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // AnalyserNodeが設定されていることを確認してから描画を再開
      if (analyserRef.current) {
        drawWave();
      }
    } else {
        // 録音中でなければ、Canvasに静的メッセージを描画
        drawStaticMessage(mode);
    }
  }

  // 初回マウント時とモード変更時に静的メッセージを描画
  useEffect(() => {
    // 録音中でない場合のみ静的メッセージを描画
    if (!isRecording) {
        drawStaticMessage(displayMode);
    }
    
    return () => {
        // コンポーネントがアンマウントされる際のクリーンアップ
        if (audioURL) {
            URL.revokeObjectURL(audioURL);
        }
        
        // 🔴 修正点: AudioContextのクローズはhandleResetに任せ、ここではチェックしないか、
        // 既に閉じられていないかを確認する
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
           // 例外的にアンマウント時に閉じたい場合はここで行うが、
           // 今回はhandleResetで閉じる前提のため、安全策として状態チェックを追加
           audioContextRef.current.close().catch(e => console.error("AudioContext close error on unmount:", e));
        }
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
  }, [displayMode, isRecording, audioURL, drawStaticMessage]); // isRecordingがfalseになった時も再実行される

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <script src="https://cdn.tailwindcss.com"></script>
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 md:p-10 transition-all duration-300">
        <h1 className="text-3xl font-extrabold text-red-600 mb-2 text-center">Web Audio Recorder</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">録音とリアルタイム波形/スペクトル表示デモ</p>

        {/* 表示モード切り替えボタン */}
        <div className="flex justify-center space-x-4 mb-4">
            <button
                onClick={() => handleModeChange('waveform')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition duration-200 ${
                    displayMode === 'waveform' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
                時間領域 (波形)
            </button>
            <button
                onClick={() => handleModeChange('frequency')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition duration-200 ${
                    displayMode === 'frequency' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
                周波数領域 (スペクトル)
            </button>
        </div>


        {/* ステータスメッセージ表示エリア */}
        <div className={`p-3 mb-6 rounded-lg text-center font-medium ${isRecording ? 'bg-red-100 text-red-700' : audioBlob ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {statusMessage}
        </div>

        {/* リアルタイム波形表示Canvas */}
        <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 mb-8">
          <canvas ref={canvasRef} className="w-full h-full block"></canvas>
          {isRecording && (
            <div className="absolute top-2 left-2 flex items-center bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md animate-pulse">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
              録音中...
            </div>
          )}
        </div>
        

        {/* 録音コントロールボタン群 */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className={`flex items-center px-6 py-3 rounded-full font-semibold transition duration-200 shadow-lg ${
              isRecording
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white transform hover:scale-105 active:scale-95'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"></path></svg>
            録音開始
          </button>

          <button
            onClick={handleStopRecording}
            disabled={!isRecording}
            className={`flex items-center px-6 py-3 rounded-full font-semibold transition duration-200 shadow-lg ${
              !isRecording
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-red-700 hover:bg-red-800 text-white transform hover:scale-105 active:scale-95'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z"></path></svg>
            停止
          </button>
        </div>

        {/* 録音後の操作エリア */}
        {audioURL && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4">保存データ操作</h2>
            
            {/* 録音データが存在する場合の再生プレイヤー */}
            <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-600 mb-2">録音データ (.webm)</h3>
                <audio ref={audioRef} src={audioURL} controls className="w-full rounded-lg shadow-inner bg-gray-200"></audio>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {/* 録音データダウンロードボタン */}
                <button
                  onClick={handleDownload}
                  disabled={!audioBlob}
                  className={`flex items-center justify-center px-4 py-2 font-semibold rounded-lg shadow-md transition duration-200 ${
                    !audioBlob ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  音声ダウンロード
                </button>
                
                {/* 全てリセットボタン */}
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0h2.553M4.582 9l2.553-2.553M15 15l2.553 2.553M15 15h.582m4.846-5.832A8.001 8.001 0 0115.418 15m0 0h-2.553"></path></svg>
                  全てリセット
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorderPage;
