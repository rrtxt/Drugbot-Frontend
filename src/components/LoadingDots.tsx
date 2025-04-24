import React from "react";

export default function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-sky-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}></div>
          <div
            className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
            style={{ animationDelay: "250ms" }}></div>
          <div
            className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
            style={{ animationDelay: "500ms" }}></div>
        </div>
      </div>
    </div>
  );
}
