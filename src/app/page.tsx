"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Head from "next/head";
import ChatHeader from "@/components/ChatHeader";
import LoadingDots from "@/components/LoadingDots";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { 
  fetchChatResponse, 
  fetchHealthCheck,
  fetchChatSession,
  fetchChatHistory,
  deleteChatCollection
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
  messagesLoaded?: boolean;
}

const createInitialBotMessage = (): Message => ({
  id: `msg-bot-initial-${Date.now()}`,
  text: "Halo! Saya chatbot Anda. Apa yang bisa saya bantu hari ini?",
  sender: "bot",
  timestamp: new Date(),
});

// Temporary session structure for a new chat when activeSessionId is null
const newChatInitialState: Omit<Session, 'id' | 'createdAt' | 'messagesLoaded'> = {
  name: "Obrolan Baru",
  messages: [createInitialBotMessage()],
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // Changed: null indicates new chat
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [isSessionLoading, setIsSessionLoading] = useState(true); 
  const [isUsingRag, setIsUsingRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive activeSession. If activeSessionId is null, it means it's a new chat.
  const activeSession = activeSessionId 
    ? sessions.find((session) => session.id === activeSessionId) 
    : { ...newChatInitialState, id: 'new-chat', createdAt: new Date(), messagesLoaded: true }; // Provide a temporary structure for new chat

  // Initial load of session history & URL handling (will be refactored further in next step)
  useEffect(() => {
    const urlSessionId = searchParams.get('sessionId');

    const loadInitialSessions = async () => {
      setIsSessionLoading(true);
      try {
        const historyData = await fetchChatSession(); 
        const fetchedSessions: Session[] = historyData.map((s: any) => ({
          id: s.id,
          name: s.name || `Sesi ${new Date(s.created_at).toLocaleDateString()}`,
          messages: [], 
          createdAt: new Date(s.created_at),
          messagesLoaded: false,
        })).sort((a: Session, b: Session) => b.createdAt.getTime() - a.createdAt.getTime());

        setSessions(fetchedSessions);

        let initialActiveIdToSet: string | null = null;

        if (urlSessionId) {
          // If there's a session ID in the URL
          const sessionFromUrl = fetchedSessions.find(s => s.id === urlSessionId);
          if (sessionFromUrl) {
            initialActiveIdToSet = sessionFromUrl.id;
          } else {
            // Invalid session ID in URL, treat as new chat, clear URL
            toast.warn("ID Sesi di URL tidak valid. Memulai obrolan baru.");
            router.replace(`/`, { scroll: false }); // Clear invalid sessionId from URL
            initialActiveIdToSet = null; // Fallback to new chat state
          }
        } else {
          // No session ID in URL, default to new chat state
          initialActiveIdToSet = null;
        }
        
        setActiveSessionId(initialActiveIdToSet);

      } catch (error) {
        console.error("Error fetching initial sessions:", error);
        toast.error("Gagal memuat riwayat chat.");
        // Fallback to new chat if history load fails and no URL session specified
        if (!urlSessionId) {
            setActiveSessionId(null); 
        }
      } finally {
        setIsSessionLoading(false);
      }
    };
    loadInitialSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // searchParams is used, but typically stable on initial mount. router is not needed here.

  // Effect to load messages when activeSessionId changes and messages are not loaded
  useEffect(() => {
    // Only load if activeSessionId is a real ID (not null) and messages aren't loaded
    if (activeSessionId && activeSession && !activeSession.messagesLoaded && activeSession.messages.length === 0) {
      const loadMessagesForSelectedSession = async () => {
        setIsLoading(true); // Use main loading indicator for messages
        try {
          // Use fetchChatHistory to get messages for the specific activeSessionId
          const sessionDetails = await fetchChatHistory(activeSessionId); 
          const loadedMessages: Message[] = sessionDetails.messages.map((m: any) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: new Date(m.timestamp),
          })).sort((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort messages by time

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
                ? { ...s, messages: [createInitialBotMessage(), {id: 'err', text:'Gagal memuat riwayat pesan untuk sesi ini.', sender: 'bot', timestamp: new Date()}], messagesLoaded: true } // Mark as loaded to avoid loop
                : s
            )
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadMessagesForSelectedSession();
    }
  }, [activeSessionId, activeSession, sessions]);


  // Auto-scroll to bottom when messages in the active session change
  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to update URL when activeSessionId changes
  useEffect(() => {
    const currentUrlSessionId = searchParams.get('sessionId');
    if (activeSessionId && activeSessionId !== currentUrlSessionId) {
      router.replace(`/?sessionId=${activeSessionId}`, { scroll: false });
    } else if (activeSessionId === null && currentUrlSessionId) {
      router.replace(`/`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, router, searchParams]);

  const handleCreateNewChat = () => {
    setActiveSessionId(null); // Set to null for new chat
    setInput("");
  };

  const handleSelectSession = (sessionId: string) => {
    // Setting activeSessionId will trigger the useEffect to load messages if needed
    setActiveSessionId(sessionId);
  };

 const handleDeleteSession = async (sessionId: string) => {
    // Optimistically update UI or wait for API response
    const originalSessions = [...sessions];
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));

    try {
      await deleteChatCollection(sessionId);
      toast.success("Sesi berhasil dihapus.");

      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(session => session.id !== sessionId); // Use updated sessions from state
         if (remainingSessions.length > 0) {
          // Sort by createdAt to select the newest as active
          const sortedRemaining = [...remainingSessions].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
          setActiveSessionId(sortedRemaining[0].id);
        } else {
          handleCreateNewChat(); // Create a new one if all are deleted
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

    // activeSession is now guaranteed to be at least the newChatInitialState structure
    if (!input.trim() || !activeSession) return; 

    const userMessage: Message = {
      id: `msg-user-${Date.now()}`,
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    // Optimistically add user message to the UI
    // If activeSessionId is null, it's a new chat. We update the temporary newChatInitialState via activeSession derivation.
    if (activeSessionId === null) {
      // For a new chat, we are updating the messages array that `activeSession` references for the new chat state.
      const currentNewChatMessages = activeSession.messages;
      activeSession.messages.push(userMessage); 
    } else {
      // Existing session
      setSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, userMessage] }
            : s
        )
      );
    }

    try {
      const response = await fetchChatResponse(currentInput, activeSessionId, isUsingRag); 
      const botMessageText = response.message?.text_content || "Maaf, saya tidak dapat memproses permintaan Anda.";
      const processedBotText = (await remark().use(html).process(botMessageText)).toString();
      
      const botMessage: Message = {
        id: `msg-bot-${Date.now() + 1}`,
        text: processedBotText,
        sender: "bot",
        timestamp: new Date(),
      };

      const returnedSessionId = response.sessionId;

      setSessions(prevSessions => {
        const existingSessionIndex = prevSessions.findIndex(s => s.id === returnedSessionId);

        if (existingSessionIndex !== -1) {
          // Session already exists, update its messages
          return prevSessions.map((s, index) =>
            index === existingSessionIndex
              ? { 
                  ...s, 
                  messages: [...s.messages, botMessage], 
                  messagesLoaded: true 
                }
              : s
          );
        } else {
          // New session ID returned from backend (likely was a new chat)
          // The user message was already added to `activeSession.messages` if it was a new chat.
          const messagesForNewSession = activeSessionId === null 
            ? [...activeSession.messages, botMessage] // Includes initial bot, user message, and new bot message
            : [userMessage, botMessage]; // Should not happen if session ID is new but activeSessionId wasn't null

          return [
            { 
              id: returnedSessionId, 
              name: `Sesi ${new Date().toLocaleDateString()}`, // Or generate from first message, or let backend define
              messages: messagesForNewSession, 
              createdAt: new Date(), 
              messagesLoaded: true 
            },
            ...prevSessions // Add new session to the top (or sort as preferred)
          ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
      });
      setActiveSessionId(returnedSessionId); // Critical: update activeSessionId to the one from backend

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `msg-err-${Date.now() + 1}`,
        text: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
        sender: "bot",
        timestamp: new Date(),
      };
      // Add error message to current view (either existing session or new chat view)
      if (activeSessionId === null) {
        activeSession.messages.push(errorMessage);
        // Force re-render if needed (setSessions with a dummy change or re-set activeSessionId)
        setSessions(prev => [...prev]); // Trigger re-render for new chat optimistic update
      } else {
         setSessions(prevSessions =>
            prevSessions.map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, errorMessage] }
                : s
            )
          );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // UI Rendering
  if (isSessionLoading && sessions.length === 0) { // Show full page loader only if no sessions yet
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingDots /> <span className="ml-2">Memuat sesi...</span>
      </div>
    );
  }

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
        <ChatHeader 
          title={activeSession ? activeSession.name : "Drugbot Cihuy"} 
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
          // isLoading={isSessionLoading} // Optionally pass loading state to Sidebar
        />
        
        <div className="flex flex-col flex-grow">
          <main className="flex-grow min-h-0 container mx-auto px-4 pt-6 max-w-3xl overflow-y-auto">
            {isLoading && activeSession && activeSession.messages.length === 0 && ( // Show loading dots if messages are being fetched for the first time for this session
                 <div className="flex items-center justify-center h-full">
                    <LoadingDots /> <span className="ml-2">Memuat pesan...</span>
                 </div>
            )}
            {/* Render messages only if not initial loading OR if there are messages */}
            {activeSession && (!isLoading || activeSession.messages.length > 0) && (
                 <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                  {activeSession.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      text={message.text}
                      sender={message.sender}
                      timestamp={message.timestamp}
                    />
                  ))}
                  {isLoading && activeSession && activeSession.messages.length > 0 && <LoadingDots /> /* Show loading dots for new messages */}
                  <div ref={messagesEndRef} />
                </div>
            )}
            {!activeSession && !isSessionLoading && (
                 <div className="flex items-center justify-center h-full text-gray-500">
                    Pilih sesi atau buat obrolan baru.
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
                  placeholder={activeSession ? "Ketik pesan Anda di sini..." : "Mulai obrolan baru..."}
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
