"use client";

import React, { useRef, useEffect } from "react";

const Page = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // キャンバスをウィンドウサイズに合わせる
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    // === 背景（海っぽいグラデーション） ===
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#87CEFA"); // 上: LightSkyBlue（水面っぽい）
    gradient.addColorStop(0.5, "#1E90FF"); // 中間: DodgerBlue
    gradient.addColorStop(1, "#000080"); // 下: Navy（深海っぽい）

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // === 上のキー矩形 ===
    const rectCount = 3;
    const keyrectWidth = W * 0.2;
    const keyrectHeight = H * 0.15;
    const keyrectY = H * 0.1;
    const gap = (W - rectCount * keyrectWidth) / (rectCount + 1);

    for (let i = 0; i < rectCount; i++) {
      const keyrectX = gap + i * (keyrectWidth + gap);
      ctx.fillStyle = "white";
      ctx.fillRect(keyrectX, keyrectY, keyrectWidth, keyrectHeight);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.strokeRect(keyrectX, keyrectY, keyrectWidth, keyrectHeight);
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "key" + (i + 1),
        keyrectX + keyrectWidth / 2,
        keyrectY + keyrectHeight / 2
      );
    }

    // === 下のレコード矩形 ===
    const recordrectWidth = W * 0.5;
    const recordrectHeight = H * 0.15;
    const recordrectX = (W - recordrectWidth) / 2;
    const recordrectY = H * 0.7;

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    // 角丸半径
    const radius = 20;

    ctx.beginPath();
    ctx.roundRect(
      recordrectX,
      recordrectY,
      recordrectWidth,
      recordrectHeight,
      radius
    );
    ctx.fill();
    ctx.stroke();
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "record",
      recordrectX + recordrectWidth / 2,
      recordrectY + recordrectHeight / 2
    );
  };

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Page;
