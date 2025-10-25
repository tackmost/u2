export interface RhymeResult {
  score: number;  // 0-100点の点数
  reason: string; // 採点理由
}

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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

const systemPrompt = `あなたは韻（ライム）の専門家です。入力された日本語のテキスト（歌詞、詩、文章など）を分析し、韻の踏み具合（母音の一致、リズミカルさ、語感の良さ）を0点から100点で厳格に採点してください。
採点基準:
- 0-30点: ほとんど韻が踏めていない。
- 31-60点: 部分的に簡単な韻（例：語尾の母音が1〜2文字一致）が見られる。
- 61-80点: 複数の箇所で明確な韻（母音が3文字以上一致）が意図的に使われており、リズミカルである。
- 81-100点: 高度な技術（例：長い母音の一致、複数の単語をまたぐ韻、文中の随所）が使われており、非常に完成度が高い。

なぜその点数になったのか、どの部分がどのように韻を踏んでいる（または踏めていない）のかを具体的に、簡潔に説明してください。`;

async function fetchWithBackoff(url: string, options: RequestInit, maxRetries: number = 5): Promise<Response> {
  let delay = 1000; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Retryable error: ${response.status}`);
        } else {
          return response;
        }
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error as Error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; 
    }
  }
  throw new Error('Max retries reached, but no response or error was returned.');
}

export async function getRhymeScore(text: string): Promise<RhymeResult> {
  
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      { parts: [{ text: text }] }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.5
    }
  };

  try {
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
        return parsedJson;
      } else {
        throw new Error("APIは期待された形式（score, reason）で応答しませんでした。");
      }
    } else {
      throw new Error("APIから有効な応答が得られませんでした。");
    }

  } catch (error) {
    console.error('Error in getRhymeScore:', error);
    throw error;
  }
}
