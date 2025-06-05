"use client";

import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter, useSearchParams } from "next/navigation";
import ChatHeader from "@/components/ChatHeader";
import LoadingDots from "@/components/LoadingDots";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { 
  fetchChatResponse, 
  fetchHealthCheck,
  fetchChatSession,
  fetchChatHistory,
  deleteChatSession
} from "@/utils/api";
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
  messagesLoaded?: boolean; // Added to track if messages are fetched
}

// Helper function to create the initial bot message for new chats
const createInitialBotMessage = (): Message => ({
  id: `msg-bot-initial-${Date.now()}`,
  text: "Halo! Saya chatbot Anda. Apa yang bisa saya bantu hari ini?",
  sender: "bot",
  timestamp: new Date(),
});

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newChatMessages, setNewChatMessages] = useState<Message[]>([createInitialBotMessage()]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For message sending & loading specific session messages
  const [isSessionLoading, setIsSessionLoading] = useState(true); // For initial session list loading
  const [isUsingRag, setIsUsingRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );

  // Effect 1: Initialize activeSessionId from URL and load all session metadata
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get("sessionId");

    const loadInitialSessionData = async () => {
      setIsSessionLoading(true);
      let currentTargetSessionId: string | null = sessionIdFromUrl;

      try {
        const historyData = await fetchChatSession();
        const sessionIdsFromApi: string[] = historyData.session_ids || [];

        const fetchedSessions: Session[] = sessionIdsFromApi
          .map((id: string) => ({
            id: id,
            name: `Sesi ${id.substring(0, 8)}...`,
            messages: [],
            createdAt: new Date(), // Placeholder, ideally from API if available per session
            messagesLoaded: false,
          }))
          .sort((a: Session, b: Session) => b.createdAt.getTime() - a.createdAt.getTime());

        setSessions(fetchedSessions);

        if (sessionIdFromUrl) {
          const sessionExists = fetchedSessions.some(s => s.id === sessionIdFromUrl);
          if (!sessionExists) {
            toast.warn("Sesi di URL tidak ditemukan. Memulai obrolan baru.");
            currentTargetSessionId = null;
            router.replace('/', { scroll: false }); // Clear invalid session ID
          }
          // If session exists, currentTargetSessionId remains sessionIdFromUrl
        } else {
          // No session ID in URL, default to new chat state
          currentTargetSessionId = null;
        }
        
        setActiveSessionId(currentTargetSessionId);

      } catch (error) {
        console.error("Error fetching chat history:", error);
        toast.error("Gagal memuat riwayat chat. Memulai obrolan baru.");
        setActiveSessionId(null); // Fallback to new chat
        router.replace('/', { scroll: false }); // Clear URL on error
      } finally {
        setIsSessionLoading(false);
      }
    };
    loadInitialSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Autorun when searchParams change (e.g. direct URL navigation)


  // Effect 2: Synchronize activeSessionId with URL
  useEffect(() => {
    if (activeSessionId && activeSessionId !== searchParams.get("sessionId")) {
      router.push(`/?sessionId=${activeSessionId}`, { scroll: false });
    } else if (activeSessionId === null && searchParams.get("sessionId")) {
      router.push('/', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, router]); // searchParams removed to avoid loop with effect 1

  // Effect 3: Load messages for the active session if it's set and messages aren't loaded
  useEffect(() => {
    if (activeSessionId && activeSession && !activeSession.messagesLoaded && activeSession.messages.length === 0) {
      const loadMessagesForSelectedSession = async () => {
        setIsLoading(true); // Use main loading indicator
        try {
          const sessionDetails = await fetchChatHistory(activeSessionId);
          const loadedMessages: Message[] = sessionDetails.map((m: any) => {
            let senderType: "user" | "bot" = m.role === "human" ? "user" : "bot";
            return {
              id: m.id || crypto.randomUUID(), // Prefer stable ID from backend
              text: m.content,
              sender: senderType,
              timestamp: new Date(m.created_at || Date.now()),
            };
          }).sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime());

          setSessions(prevSessions =>
            prevSessions.map(s =>
              s.id === activeSessionId
                ? { ...s, messages: loadedMessages, messagesLoaded: true }
                : s
            )
          );
        } catch (error) {
          console.error(`Error fetching messages for session ${activeSessionId}:`, error);
          toast.error("Gagal memuat pesan untuk sesi ini.");
          setSessions(prevSessions =>
            prevSessions.map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [createInitialBotMessage(), {id: 'err-msg-load', text:'Gagal memuat riwayat pesan untuk sesi ini.', sender: 'bot', timestamp: new Date()}], messagesLoaded: true }
                : s
            )
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadMessagesForSelectedSession();
    }
  }, [activeSessionId, activeSession]); // Depends on activeSessionId and the derived activeSession


  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, newChatMessages]); // Scroll for new chat messages too

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreateNewChat = () => {
    setActiveSessionId(null);
    setNewChatMessages([createInitialBotMessage()]);
    setInput("");
    // URL update is handled by the useEffect listening to activeSessionId
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === null || sessionId === undefined) { // Should not happen if UI is correct
        handleCreateNewChat();
    } else {
        setActiveSessionId(sessionId);
        setNewChatMessages([createInitialBotMessage()]); // Clear new chat messages when selecting existing
    }
  };

 const handleDeleteSession = async (sessionIdToDelete: string) => {
    const originalSessions = [...sessions];
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionIdToDelete));

    try {
      await deleteChatSession(sessionIdToDelete);
      toast.success("Sesi berhasil dihapus.");

      if (activeSessionId === sessionIdToDelete) {
        const remainingSessions = originalSessions.filter(s => s.id !== sessionIdToDelete);
        if (remainingSessions.length > 0) {
          // Sort by createdAt to select the newest as active (or most recent if timestamps are reliable)
          const sortedRemaining = [...remainingSessions].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
          setActiveSessionId(sortedRemaining[0].id);
        } else {
          handleCreateNewChat(); // No sessions left, go to new chat state
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Gagal menghapus sesi.");
      setSessions(originalSessions); // Revert on error
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

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    const botMessageId = `msg-bot-${Date.now() + 1}`;
    const initialBotMessagePlaceholder: Message = {
      id: botMessageId,
      text: "", // Will be filled by API response or error
      sender: "bot",
      timestamp: new Date(),
    };

    if (activeSessionId === null) {
      // Handling new chat: update temporary newChatMessages
      setNewChatMessages(prev => [...prev, userMessage, initialBotMessagePlaceholder]);
    } else if (activeSession) {
      // Handling existing chat: update messages in the active session
      setSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, userMessage, initialBotMessagePlaceholder] }
            : s
        )
      );
    } else {
      // Should not happen if logic is correct (e.g. input disabled when no active session and not a new chat)
      console.error("handleSendMessage called without activeSessionId and not in new chat state.");
      setIsLoading(false);
      return;
    }

    try {
      const responseData = await fetchChatResponse(currentInput, activeSessionId, isUsingRag);
      const botResponseText = responseData.answer;
      const newOrConfirmedSessionId = responseData.sessionId; 

      const processedBotText = (await remark().use(html).process(botResponseText || "...")).toString();

      if (activeSessionId === null) {
        // This was a new chat, now we have a session ID
        if (!newOrConfirmedSessionId) {
          console.error("Backend did not return session_id for a new chat.");
          toast.error("Gagal memulai sesi baru: ID tidak diterima.");
          // Update placeholder with error in newChatMessages
          setNewChatMessages(prev => prev.map(msg => msg.id === botMessageId ? {...msg, text: "Error: Tidak dapat membuat sesi baru."} : msg));
          setIsLoading(false);
          return;
        }

        const newSession: Session = {
          id: newOrConfirmedSessionId,
          name: `Sesi ${newOrConfirmedSessionId.substring(0, 8)}...`,
          messages: [
            ...newChatMessages.filter(m => m.id !== initialBotMessagePlaceholder.id && m.text !== createInitialBotMessage().text), // Keep user messages from newChat
             userMessage, // Ensure the current user message is included
            { ...initialBotMessagePlaceholder, text: processedBotText, id: botMessageId } // Update bot message with actual response
          ].filter((msg, index, self) => index === self.findIndex(t => t.id === msg.id || t.text === msg.text)), // Basic dedupe
          createdAt: new Date(),
          messagesLoaded: true,
        };
        
        // Filter out the initial bot message from newSession.messages if it's there
        newSession.messages = newSession.messages.filter(m => m.text !== createInitialBotMessage().text || m.sender !== "bot");


        setSessions(prevSessions => [newSession, ...prevSessions.filter(s => s.id !== newOrConfirmedSessionId)]); // Add new, ensure no duplicates if any race
        setActiveSessionId(newOrConfirmedSessionId);
        setNewChatMessages([createInitialBotMessage()]); // Reset new chat messages

      } else {
        // This was an existing session
        setSessions(prevSessions =>
          prevSessions.map(s =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map(msg =>
                    msg.id === botMessageId
                      ? { ...msg, text: processedBotText }
                      : msg
                  ),
                }
              : s
          )
        );
        // If backend confirms/changes session_id for an existing chat
        if (newOrConfirmedSessionId && activeSessionId !== newOrConfirmedSessionId) {
            console.warn(`Session ID changed by backend from ${activeSessionId} to ${newOrConfirmedSessionId}`);
            // Potentially update activeSessionId(newOrConfirmedSessionId) and re-structure sessions array.
        }
      }
    } catch (error) {
      console.error("Error sending message or processing response:", error);
      const errorText = "Maaf, terjadi kesalahan.";
      const processedErrorText = (await remark().use(html).process(errorText)).toString();

      if (activeSessionId === null) {
        setNewChatMessages(prev =>
          prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, text: processedErrorText }
              : msg
          )
        );
      } else {
        setSessions(prevSessions =>
          prevSessions.map(s =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map(msg =>
                    msg.id === botMessageId
                      ? { ...msg, text: processedErrorText }
                      : msg
                  ),
                }
              : s
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // UI Rendering
  if (isSessionLoading && activeSessionId === null && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingDots /> <span className="ml-2 text-black">Memuat sesi...</span>
      </div>
    );
  }
  
  const currentMessages = activeSessionId === null ? newChatMessages : activeSession?.messages || [];
  const displayChatTitle = activeSession ? activeSession.name : "Obrolan Baru";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Head>
        <title>Drugbot</title>
        <meta
          name="description"
          content="Chatbot pribadi dengan interface yang menarik"
        />
        {/* <link rel="icon" href="/icon.png" /> */}
      </Head>

      <header className="bg-sky-500 text-white shadow-md flex items-center justify-between p-4">
        <ChatHeader 
          title={displayChatTitle} 
          subtitle="Chatbot untuk Rekomendasi Obat" 
        />
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
            {isLoading && activeSessionId && activeSession && activeSession.messages.length === 0 && (
                 <div className="flex items-center justify-center h-full">
                    <LoadingDots /> <span className="ml-2">Memuat pesan...</span>
                 </div>
            )}
            {currentMessages.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                {currentMessages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    text={message.text}
                    sender={message.sender}
                    timestamp={message.timestamp}
                  />
                ))}
                {isLoading && (activeSessionId !== null ? activeSession?.messages.some(m => m.text === "") : newChatMessages.some(m=>m.text === "" && m.sender === "bot")) && <LoadingDots />}
                <div ref={messagesEndRef} />
              </div>
            )}
            {activeSessionId === null && currentMessages.length <=1 && !isSessionLoading && !isLoading && (
                 <div className="flex items-center justify-center h-full text-gray-500">
                    Mulai percakapan atau pilih sesi dari samping.
                 </div>
            )}
             {!activeSession && activeSessionId !== null && !isSessionLoading && !isLoading && (
                 <div className="flex items-center justify-center h-full text-gray-500">
                    Pilih sesi atau buat obrolan baru. Sesi yang dipilih mungkin tidak ada.
                 </div>
            )}
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
                  placeholder={activeSessionId !== null || newChatMessages.length > 0 ? "Ketik pesan Anda di sini..." : "Mulai obrolan baru atau pilih sesi"}
                  className="flex-grow px-4 py-2 border text-black border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
                  disabled={isLoading && (activeSessionId !== null ? activeSession?.messages.some(m => m.text === "") : newChatMessages.some(m=>m.text === "" && m.sender === "bot"))}
                />
                <button
                  type="submit"
                  className="bg-sky-500 text-white px-4 py-2 rounded-full hover:bg-sky-600 transition-colors disabled:bg-sky-300"
                  disabled={(isLoading && (activeSessionId !== null ? activeSession?.messages.some(m => m.text === "") : newChatMessages.some(m=>m.text === "" && m.sender === "bot"))) || !input.trim()}
                >
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
