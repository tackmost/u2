"use client";

import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-sky-300 via-blue-500 to-blue-900 p-10">
      {/* 上のキー矩形 */}
      <div className="flex justify-center gap-6 mt-10">
        <div className="w-40 h-24 bg-white border-2 border-black rounded-md flex items-center justify-center font-bold text-xl">
          key1
        </div>
        <div className="w-40 h-24 bg-white border-2 border-black rounded-md flex items-center justify-center font-bold text-xl">
          key2
        </div>
        <div className="w-40 h-24 bg-white border-2 border-black rounded-md flex items-center justify-center font-bold text-xl">
          key3
        </div>
      </div>

      {/* 下のレコード矩形 */}
      <div className="flex justify-center mb-20">
        <button className="w-100 max-w-md md:max-w-xl lg:max-w-2xl h-20 bg-white border-4 border-black rounded-xl font-bold text-xl hover:bg-blue-200 transition-colors duration-200">
          record
        </button>
      </div>
    </div>
  );
};

export default Page;
