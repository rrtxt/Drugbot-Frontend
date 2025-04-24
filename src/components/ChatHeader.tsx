import React from "react";

interface ChatHeaderProps {
  title: string;
  subtitle: string;
}

export default function ChatHeader({ title, subtitle }: ChatHeaderProps) {
  return (
    <header className="bg-sky-500 text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sky-100">{subtitle}</p>
      </div>
    </header>
  );
}
