export interface FishKeywordData {
    [fishName: string]: string[];
}
export type FishTheme = keyof FishKeywordData;

/**
 * キーワードのマスターデータ
 */
export const fishKeywords: FishKeywordData = {
    "maguro": [
        "赤身", "トロ", "オーシャン", "スピード", "ツナ缶",
        "寿司", "回遊魚", "一本釣り", "黒いダイヤ", "海の幸",
        "DHA", "エリート", "シーチキン", "大間", "初競り"
    ],
    "tai": [
        "めでたい", "王様", "白身", "鯛めし", "お祝い",
        "桜鯛", "エビで釣る", "塩焼き", "瀬戸内", "上品",
        "七福神", "横綱", "赤い", "お頭付き", "祝い酒"
    ],
    "iwashi": [
        "群れ", "DHA", "オイルサーディン", "大群", "弱肉強食",
        "イワシ雲", "目刺し", "雑魚じゃない", "青魚", "缶詰",
        "サーディン", "大漁", "網", "プランクトン", "鰯"
    ],
    "same": [
        "ジョーズ", "軟骨", "ハンター", "歯", "フカヒレ",
        "鮫肌", "トップ", "海中", "恐ろしい", "頂点",
        "シャーク", "捕食者", "古代魚", "獰猛", "海底"
    ]
};

// --- ヘルパー関数 ---

/**
 * カタカナの読み仮名から母音の文字列を抽出する
 * (「ッ」と「、。」などを無視するよう修正)
 */
export function getVowels(reading: string): string {
    let vowels = '';
    let lastVowel = '';

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
        'ン': 'N',
    };
    const youonMap: { [key: string]: string } = {
        'ャ': 'A', 'ュ': 'U', 'ョ': 'O',
    };

    const cleanReading = reading
        .replace(/[ぁ-ん]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60))
        .replace(/[A-Za-z0-9]/g, '')
        .replace(/[、。！？「」]/g, '');

    for (const char of cleanReading) {
        if (vowelMap[char]) {
            lastVowel = vowelMap[char];
            vowels += lastVowel;
        } else if (youonMap[char]) {
            if (vowels.length > 0) {
                lastVowel = youonMap[char];
                vowels = vowels.slice(0, -1) + lastVowel;
            }
        } else if (char === 'ー') {
            if (lastVowel) {
                vowels += lastVowel;
            }
        }
    }
    return vowels;
}

/**
 * 2つの文字列間のレーベンシュタイン距離（編集距離）を計算する
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}

/**
 * 編集距離を 0% 〜 100% の類似度スコアに変換する
 */
export function calculateSimilarity(distance: number, len1: number, len2: number): number {
    const maxLength = Math.max(len1, len2);
    if (maxLength === 0) return 100;
    const similarity = (1 - distance / maxLength) * 100;
    return Math.max(0, Math.round(similarity));
}


// --- 採点ロジック ---

/**
 * 採点結果の型
 */
export interface ScoreResult {
    score: number; // 0-100点
    detail: string; // 採点の詳細・理由
}

/**
 * 総合採点結果の型
 */
export interface TotalScore {
    keywordScore: number;
    syntaxScore: number;
    totalScore: number;
    finalMessage: string;
    keyword: ScoreResult;
    rhyme: ScoreResult;
    rhythm: ScoreResult;
    meaning: ScoreResult;
}

// --- 1. キーワードチェッカー ---
function checkKeywords(text: string, themeKeywords: string[]): ScoreResult {
    if (!text || themeKeywords.length === 0) {
        return { score: 0, detail: "テキストまたはキーワードがありません。" };
    }

    let hitCount = 0;
    const hitWords: string[] = [];

    themeKeywords.forEach(keyword => {
        // テキスト内にキーワードが含まれているか (大文字小文字を無視)
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            hitCount++;
            hitWords.push(keyword);
        }
    });

    // 5個以上ヒットしたら満点 (上限設定)
    const score = Math.min(100, (hitCount / 5) * 100);
    
    let detail = "";
    if (hitCount === 0) {
        detail = "お題のキーワードが1つも含まれていません。";
    } else {
        detail = `「${hitWords.slice(0, 3).join(', ')}」など、${hitCount}個のキーワードを発見！`;
    }

    return { score: Math.round(score), detail };
}

// --- 2. 韻（ライム）チェッカー ---
function checkRhyme(text: string): ScoreResult {
    // テキストを句読点や改行で文（バース）に分割
    const verses = text.split(/[、。！?\n]/).filter(v => v.trim().length > 2);
    
    if (verses.length < 2) {
        return { score: 0, detail: "韻を比較できる文が2つ以上ありません。" };
    }

    let totalSimilarity = 0;
    let pairsCompared = 0;
    const RHYME_CHECK_LENGTH = 5;

    for (let i = 0; i < verses.length - 1; i++) {
        const verse1 = verses[i].trim();
        const verse2 = verses[i+1].trim();
        const vowels1 = getVowels(verse1.slice(-RHYME_CHECK_LENGTH));
        const vowels2 = getVowels(verse2.slice(-RHYME_CHECK_LENGTH));

        if (vowels1.length > 0 && vowels2.length > 0) {
            const distance = levenshteinDistance(vowels1, vowels2);
            const similarity = calculateSimilarity(distance, vowels1.length, vowels2.length);
            totalSimilarity += similarity;
            pairsCompared++;
        }
    }

    if (pairsCompared === 0) {
        return { score: 0, detail: "母音を比較できるペアがありませんでした。" };
    }

    const averageScore = totalSimilarity / pairsCompared;
    const score = Math.min(100, averageScore); // 100点上限

    let detail = `文末の母音の類似度 (平均 ${Math.round(score)}%)。`;
    if (score > 80) detail += " 素晴らしい韻です！";
    else if (score > 50) detail += " 良い韻を踏んでいます。";
    else detail += " もっと韻を踏めそうです。";
    
    return { score: Math.round(score), detail };
}

// --- 3. リズムチェッカー ---

// 音節数をカウント（簡易版: カタカナの文字数。「ー」「ッ」「ャュョ」は除外）
function countSyllables(text: string): number {
    const katakanaText = text.replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60));
    const syllables = katakanaText.match(/[アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ]/g);
    return syllables ? syllables.length : 0;
}

// 標準偏差を計算
function calculateStdDev(arr: number[]): { mean: number, stdDev: number } {
    if (arr.length === 0) return { mean: 0, stdDev: 0 };
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return { mean, stdDev: Math.sqrt(variance) };
}

function checkRhythm(text: string): ScoreResult {
    const verses = text.split(/[、。！?\n]/).filter(v => v.trim().length > 0);
    
    if (verses.length < 2) {
        return { score: 0, detail: "リズムを比較できる文が2つ以上ありません。" };
    }

    const syllableCounts = verses.map(countSyllables).filter(count => count > 0);
    
    if (syllableCounts.length < 2) {
        return { score: 10, detail: "音節をカウントできる文が不足しています。" };
    }

    const { mean, stdDev } = calculateStdDev(syllableCounts);

    // 標準偏差が平均に対してどれだけ小さいか (ばらつきが少ないほど高評価)
    // stdDev / mean が 0 なら 100点, 0.5 なら 50点, 1以上なら 0点
    const score = Math.max(0, (1 - (stdDev / mean)) * 100);

    let detail = `音節数のばらつき (平均${mean.toFixed(1)}音, 偏差${stdDev.toFixed(1)})。`;
    if (score > 80) detail += " 非常に安定したリズムです！";
    else if (score > 50) detail += " 良いリズム感です。";
    else detail += " リズムがやや不安定です。";

    return { score: Math.round(score), detail };
}

// --- 4. 意味（文脈）チェッカー ---
function checkMeaning(text: string, themeKeywords: string[]): ScoreResult {
    // 簡易ロジック:
    // お題のキーワードが、テキスト内で他のキーワードと近い距離（15文字以内）で
    // 出現している（＝文脈がある）場合に加点する

    let contextScore = 0;
    let contextCount = 0;
    const CONTEXT_DISTANCE = 15; // この文字数以内なら「文脈あり」

    const hitKeywords: { word: string, index: number }[] = [];
    themeKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            hitKeywords.push({ word: keyword, index: match.index });
        }
    });

    if (hitKeywords.length < 2) {
        return { score: 10, detail: "キーワードが少ないため文脈を評価できません。" };
    }

    // ヒットしたキーワードの位置でソート
    hitKeywords.sort((a, b) => a.index - b.index);

    for (let i = 0; i < hitKeywords.length - 1; i++) {
        const wordA = hitKeywords[i];
        const wordB = hitKeywords[i+1];

        // 違うキーワードが近い距離にあれば加点
        if (wordA.word !== wordB.word && (wordB.index - (wordA.index + wordA.word.length)) <= CONTEXT_DISTANCE) {
            contextCount++;
        }
    }

    // 3回以上の文脈ヒットで満点
    const score = Math.min(100, (contextCount / 3) * 100);

    let detail = "";
    if (contextCount > 0) {
        detail = `キーワード同士が${contextCount}回、近い文脈で使われています！`;
    } else {
        detail = "キーワードが散発的で、文脈があまり見られません。";
    }

    return { score: Math.round(score), detail };
}

// --- 総合採点 ---
export function calculateTotalScore(text: string, theme: FishTheme): TotalScore {
    const themeKeywords = fishKeywords[theme] || [];

    const keywordResult = checkKeywords(text, themeKeywords);
    const rhymeResult = checkRhyme(text);
    const rhythmResult = checkRhythm(text);
    const meaningResult = checkMeaning(text, themeKeywords);

    // 総合点（キーワードと韻を重視）
    const totalScore = Math.round(
        keywordResult.score * 0.35 +
        rhymeResult.score * 0.30 +
        rhythmResult.score * 0.15 +
        meaningResult.score * 0.20
    );

    let finalMessage = "お疲れ様でした！";
    if (totalScore > 90) finalMessage = "完璧なフロウ！キングオブヘッド！";
    else if (totalScore > 75) finalMessage = "素晴らしい！お題を乗りこなしています！";
    else if (totalScore > 50) finalMessage = "良い感じです！その調子！";
    else finalMessage = "惜しい！次はもっと上を目指そう！";

    return {
        keywordScore: keywordResult.score,
        syntaxScore: 0,
        totalScore,
        finalMessage,
        keyword: keywordResult,
        rhyme: rhymeResult,
        rhythm: rhythmResult,
        meaning: meaningResult,
    };
}