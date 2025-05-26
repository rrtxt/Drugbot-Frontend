"use client";

import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import ChatHeader from "@/components/ChatHeader";
import LoadingDots from "@/components/LoadingDots";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { fetchChatResponse, fetchHealthCheck } from "@/utils/api";
import { toast } from "react-toastify";
import { remark } from "remark";
import html from "remark-html";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

export default function Home() {
  const initialBotMessage: Message = {
    id: "1",
    text: "Halo! Saya chatbot Anda. Apa yang bisa saya bantu hari ini?",
    sender: "bot",
    timestamp: new Date(),
  };

  const initialSession: Session = {
    id: `session-${Date.now()}`,
    name: `Chat ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    messages: [initialBotMessage],
    createdAt: new Date(),
  };

  const [sessions, setSessions] = useState<Session[]>([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    initialSession.id
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingRag, setIsUsingRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );

  // Auto-scroll to bottom when messages in the active session change
  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreateNewChat = () => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: `Chat ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      messages: [{
        id: "1",
        text: "Halo! Saya chatbot Anda. Apa yang bisa saya bantu hari ini?",
        sender: "bot",
        timestamp: new Date(),
      }],
      createdAt: new Date(),
    };
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
    // If the active session is deleted, select the first available session or none if no sessions left
    if (activeSessionId === sessionId) {
      const remainingSessions = sessions.filter(session => session.id !== sessionId);
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id); 
      } else {
        // If no sessions left, create a new one or set to null based on desired behavior
        // For now, let's create a new one
        handleCreateNewChat();
      }
    }
  };

  const handleHealthCheck = async () => {
    try {
      const result = await fetchHealthCheck();
      toast.success(`Health Check: ${result.status}`, {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
      });
    } catch (error) {
      console.error("Error during Health Check:", error);
      toast.error("Health Check failed. Please try again later.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;
    if (!activeSession) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      )
    );
    setInput("");
    setIsLoading(true);

    try {
      // Send message to backend
      const response = await fetchChatResponse(input, isUsingRag);
      const content = await remark()
        .use(html)
        .process(response.text_content);

      // Add bot response
      const botMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        text:
          content.toString() ||
          "Maaf, saya tidak dapat memproses permintaan Anda.",
        sender: "bot",
        timestamp: new Date(),
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, botMessage] }
            : session
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        text: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
        sender: "bot",
        timestamp: new Date(),
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, errorMessage] }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Head>
        <title>Drugbot</title>
        <meta
          name="description"
          content="Chatbot pribadi dengan interface yang menarik"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-sky-500 text-white shadow-md flex items-center justify-between p-4">
        <ChatHeader title="Drugbot Cihuy" subtitle="Chatbot untuk Rekomendasi Obat" />
        <div>
          <button
            onClick={handleHealthCheck}
            className="bg-sky-400 border-white text-white px-4 py-2 rounded-full hover:bg-sky-600 transition-colors">
            Health Check
          </button>
        </div>
      </header>

      <div className="flex flex-row flex-grow overflow-hidden">
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateNewChat={handleCreateNewChat}
          onDeleteSession={handleDeleteSession}
        />
        
        <div className="flex flex-col flex-grow">
          <main className="flex-grow min-h-0 container mx-auto px-4 pt-6 max-w-3xl overflow-y-auto">
            <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
              {activeSession?.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  text={message.text}
                  sender={message.sender}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && <LoadingDots />}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <div className="container mx-auto px-4 py-4 max-w-3xl">
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="ragToggle"
                  checked={isUsingRag}
                  onChange={(e) => setIsUsingRag(e.target.checked)}
                  className="mr-2 h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                />
                <label htmlFor="ragToggle" className="text-sm text-gray-700">
                  Gunakan RAG (Retrieve Augmented Generation)
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pesan Anda di sini..."
                  className="flex-grow px-4 py-2 border text-black border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-sky-500 text-white px-4 py-2 rounded-full hover:bg-sky-600 transition-colors disabled:bg-sky-300"
                  disabled={isLoading || !input.trim()}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          <footer className="bg-white py-4 border-t">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500 max-w-3xl">
              © {new Date().getFullYear()} Chatbot Pribadi. Dibuat dengan Next.js
              dan Flask.
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
