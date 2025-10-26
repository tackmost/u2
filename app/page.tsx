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
      {/* 下のレコード矩形 */}
      <div className="flex justify-center mb-20 px-4">
        <button
          className="w-80 md:w-96 lg:w-[500px] h-20 bg-white border-4 border-black rounded-xl font-bold text-xl
               hover:bg-blue-200 active:scale-95 transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Record button"
        >
          record
        </button>
      </div>
    </div>
  );
};

export default Page;
