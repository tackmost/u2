// 母音抽出と文字列類似度（レーベンシュタイン距離）の計算ロジック

/**
 * カタカナの読み仮名から母音の文字列を抽出する
 * @param reading カタカナの文字列 (例: 'キングオブヘッド')
 * @returns 母音の文字列 (例: 'IUNOUEUO')
 */
export function getVowels(reading: string): string {
  let vowels = '';
  let lastVowel = '';

  // カタカナから母音へのマッピング
  const vowelMap: { [key: string]: string } = {
    'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
    'カ': 'A', 'キ': 'I', 'ク': 'U', 'ケ': 'E', 'コ': 'O',
    'ガ': 'A', 'ギ': 'I', 'グ': 'U', 'ゲ': 'E', 'ゴ': 'O',
    'サ': 'A', 'シ': 'I', 'ス': 'U', 'セ': 'E', 'ソ': 'O',
    'ザ': 'A', 'ジ': 'I', 'ズ': 'U', 'ゼ': 'E', 'ゾ': 'O',
    'タ': 'A', 'チ': 'I', 'ツ': 'U', 'テ': 'E', 'ト': 'O',
    'ダ': 'A', 'ヂ': 'I', 'ヅ': 'U', 'デ': 'E', 'ド': 'O',
    'ナ': 'A', 'ニ': 'I', 'ヌ': 'U', 'ネ': 'E', 'ノ': 'O',
    'ハ': 'A', 'ヒ': 'I', 'フ': 'U', 'ヘ': 'E', 'ホ': 'O',
    'バ': 'A', 'ビ': 'I', 'ブ': 'U', 'ベ': 'E', 'ボ': 'O',
    'パ': 'A', 'ピ': 'I', 'プ': 'U', 'ペ': 'E', 'ポ': 'O',
    'マ': 'A', 'ミ': 'I', 'ム': 'U', 'メ': 'E', 'モ': 'O',
    'ヤ': 'A', 'ユ': 'U', 'ヨ': 'O',
    'ラ': 'A', 'リ': 'I', 'ル': 'U', 'レ': 'E', 'ロ': 'O',
    'ワ': 'A', 'ヰ': 'I', 'ヱ': 'E', 'ヲ': 'O',
    'ン': 'N', // 「ん」は特殊な母音 'N' として扱う
  };

  // 拗音（ゃ, ゅ, ょ）が来たときに、直前の母音を置き換えるためのマップ
  const youonMap: { [key: string]: string } = {
    'ャ': 'A', 'ュ': 'U', 'ョ': 'O',
  };

  for (const char of reading) {
    if (vowelMap[char]) {
      // 通常のカタカナ
      lastVowel = vowelMap[char];
      vowels += lastVowel;
    } else if (youonMap[char]) {
      // 拗音（「キャ」-> 'I' を 'A' に置き換える）
      if (vowels.length > 0) {
        lastVowel = youonMap[char];
        vowels = vowels.slice(0, -1) + lastVowel; // 直前の母音を上書き
      }
    } else if (char === 'ー') {
      // 長音符（直前の母音を繰り返す）
      if (lastVowel) {
        vowels += lastVowel;
      }
    }
    // ッ（促音）と、上記以外の文字（、。！？など）は無視
  }

  return vowels;
}


/**
 * 2つの文字列間のレーベンシュタイン距離（編集距離）を計算する
 * @param a 文字列1
 * @param b 文字列2
 * @returns 編集距離 (数値)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,       // 削除
        matrix[j - 1][i] + 1,       // 挿入
        matrix[j - 1][i - 1] + cost // 置換
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 編集距離を 0% 〜 100% の類似度スコアに変換する
 * @param distance 編集距離
 * @param len1 文字列1の長さ
 * @param len2 文字列2の長さ
 * @returns 類似度スコア (0-100)
 */
export function calculateSimilarity(distance: number, len1: number, len2: number): number {
  const maxLength = Math.max(len1, len2);
  if (maxLength === 0) return 100; // 両方空文字列
  
  const similarity = (1 - distance / maxLength) * 100;
  return Math.round(similarity);
}