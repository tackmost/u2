import { Metadata } from 'next';
import VowelCheckerClient from './VowelCheckerClient';

// ページのメタデータ
export const metadata: Metadata = {
  title: '機械式 母音チェッカー (Kuromoji)',
  description: 'kuromoji.js を使用して、2つのテキストの母音の一致度を機械的に判定します。',
};

// ページのコンポーネント
export default function VowelCheckerPage() {
  
  return (
    <main className="bg-gray-100 min-h-screen flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 実際の機能はすべてクライアントコンポーネントが担当 */}
      <VowelCheckerClient />
    </main>
  );
}
