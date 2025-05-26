"use client";

import { useState, useRef, useEffect } from "react";
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
  messagesLoaded?: boolean; // Added to track if messages are fetched
}

// Helper function to create the initial bot message for new chats
const createInitialBotMessage = (): Message => ({
  id: `msg-bot-${Date.now()}`,
  text: "Halo! Saya chatbot Anda. Apa yang bisa saya bantu hari ini?",
  sender: "bot",
  timestamp: new Date(),
});

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For message sending & loading specific session messages
  const [isSessionLoading, setIsSessionLoading] = useState(true); // For initial session list loading
  const [isUsingRag, setIsUsingRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Special ID to indicate a new chat that hasn't been saved to backend yet
  const NEW_CHAT_TEMP_ID = "new-chat-temp-id";

  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );

  // Initial load of session history
  useEffect(() => {
    const loadInitialSessions = async () => {
      setIsSessionLoading(true);
      try {
        const historyData = await fetchChatSession(); // Corrected: Use fetchChatSession to get all sessions
        // Assuming historyData is an array of { id: string, name: string, created_at: string, ... }
        const fetchedSessions: Session[] = historyData.map((s: any) => ({
          id: s.id,
          name: s.name || `Sesi ${new Date(s.created_at).toLocaleDateString()}`,
          messages: [], // Messages will be loaded on demand when session is selected
          createdAt: new Date(s.created_at),
          messagesLoaded: false,
        })).sort((a: Session, b: Session) => b.createdAt.getTime() - a.createdAt.getTime());

        setSessions(fetchedSessions);

        if (fetchedSessions.length > 0) {
           setActiveSessionId(fetchedSessions[0].id);
        } else {
          handleCreateNewChat();
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
        toast.error("Gagal memuat riwayat chat.");
        if (sessions.length === 0) {
            handleCreateNewChat();
        }
      } finally {
        setIsSessionLoading(false);
      }
    };
    loadInitialSessions();
  }, []);

  // Effect to load messages when activeSessionId changes and messages are not loaded
   useEffect(() => {
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
  }, [activeSessionId, activeSession, sessions]); // sessions dependency to re-evaluate if sessions array itself changes


  // Auto-scroll to bottom when messages in the active session change
  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreateNewChat = () => {
    setActiveSessionId(NEW_CHAT_TEMP_ID);
    setInput(""); 
    // Optionally, create a temporary local session object if needed for UI rendering of "New Chat"
    const tempSessionExists = sessions.find(s => s.id === NEW_CHAT_TEMP_ID);
    if (!tempSessionExists) {
      const tempNewSession: Session = {
        id: NEW_CHAT_TEMP_ID,
        name: "Obrolan Baru",
        messages: [createInitialBotMessage()], // Show initial bot message for new chat
        createdAt: new Date(),
        messagesLoaded: true, // Considered loaded as it's local
      };
      setSessions(prev => [tempNewSession, ...prev.filter(s => s.id !== NEW_CHAT_TEMP_ID)]);
    }
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
    // If it's a new chat, the activeSession might be the temporary one or not exist yet in the main list.
    if (activeSessionId === NEW_CHAT_TEMP_ID) {
        // If it's the first message of a new chat, update the temporary session or create it if not done in handleCreateNewChat
        setSessions(prev => {
            const existingTemp = prev.find(s => s.id === NEW_CHAT_TEMP_ID);
            if (existingTemp) {
                return prev.map(s => s.id === NEW_CHAT_TEMP_ID ? {...s, messages: [...s.messages, userMessage]} : s);
            }
            // This case should ideally be covered by handleCreateNewChat adding a temp session
            return prev; 
        });
    } else if (activeSession) {
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
      // response = { message: { text_content: string, ...other_bot_message_fields }, sessionId: string }

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
        let sessionExists = prevSessions.find(s => s.id === returnedSessionId);
        if (activeSessionId === NEW_CHAT_TEMP_ID || !sessionExists) {
          // This was a new chat, or the session ID returned is new to the frontend.
          // Replace temp session or add new session.
          const newSessionName = activeSession?.name === "Obrolan Baru" && activeSessionId === NEW_CHAT_TEMP_ID 
                                 ? `Sesi ${new Date().toLocaleDateString()}` // Give a default name
                                 : (sessionExists ? sessionExists.name : `Sesi ${new Date().toLocaleDateString()}`);
          
          return [
            { 
              id: returnedSessionId, 
              name: newSessionName, // You might want to get name from user input or first message later
              messages: activeSessionId === NEW_CHAT_TEMP_ID && prevSessions.find(s => s.id === NEW_CHAT_TEMP_ID) 
                        ? [...(prevSessions.find(s => s.id === NEW_CHAT_TEMP_ID)?.messages || []), botMessage] // keep user + initial bot + new bot
                        : [userMessage, botMessage], // Or just the current exchange for a totally new ID
              createdAt: new Date(), 
              messagesLoaded: true 
            },
            ...prevSessions.filter(s => s.id !== NEW_CHAT_TEMP_ID && s.id !== returnedSessionId)
          ];
        } else {
          // Existing session, just add the bot message
          return prevSessions.map(s =>
            s.id === returnedSessionId
              ? { ...s, messages: [...s.messages, botMessage], messagesLoaded: true }
              : s
          );
        }
      });
      setActiveSessionId(returnedSessionId); // Ensure the active session is the one from backend

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `msg-err-${Date.now() + 1}`,
        text: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
        sender: "bot",
        timestamp: new Date(),
      };
      setSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
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
                  placeholder={activeSession ? "Ketik pesan Anda di sini..." : "Pilih atau buat sesi untuk memulai"}
                  className="flex-grow px-4 py-2 border text-black border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
                  disabled={isLoading || !activeSessionId}
                />
                <button
                  type="submit"
                  className="bg-sky-500 text-white px-4 py-2 rounded-full hover:bg-sky-600 transition-colors disabled:bg-sky-300"
                  disabled={isLoading || !input.trim() || !activeSessionId}>
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
