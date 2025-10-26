import VowelCheckerClient from '../vowel-checker/VowelCheckerClient';
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js"
        strategy="beforeInteractive"
      />

      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 sm:p-10">
        <div className="w-full max-w-2xl">
          <VowelCheckerClient />
        </div>
      </main>
    </>
  );
}
