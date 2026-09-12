"use client";

import dynamic from "next/dynamic";

const IndiaMap = dynamic(
  () => import("./IndiaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] items-center justify-center rounded-3xl border border-slate-800 bg-[#090d14]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-400" />

          <p className="text-sm font-semibold text-slate-300">
            Loading India Intelligence Map...
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Connecting to live emergency data
          </p>
        </div>
      </div>
    ),
  }
);

export default function IndiaMapLoader() {
  return <IndiaMap />;
}