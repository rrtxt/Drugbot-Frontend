import React from "react";

interface MessageProps {
  id?: string;
  text: string;
  sender: "user" | "bot";
  timestamp: number;
}

export default function ChatMessage({ text, sender, timestamp }: MessageProps) {
  const formatTime = (dateInMs: number) => {
    const date = new Date(dateInMs);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`flex ${sender === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          sender === "user"
            ? "bg-sky-500 text-white rounded-br-none"
            : "bg-sky-100 text-gray-800 rounded-bl-none"
        }`}>
        {sender === "bot" ? (
          <div dangerouslySetInnerHTML={{ __html: text }} className="text-sm" />
        ) : (
          <p className="text-sm">{text}</p>
        )}
        <p
          className={`text-xs mt-1 ${
            sender === "user" ? "text-sky-200" : "text-gray-500"
          }`}>
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
