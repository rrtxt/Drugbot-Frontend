import React from "react";

interface Session {
  id: string;
  name: string;
  messages: any[];
  createdAt: Date;
}

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewChat,
  onDeleteSession,
}) => {
  return (
    <div className="w-64 bg-gray-100 p-4 border-r border-gray-200 flex flex-col h-full">
      <button
        onClick={onCreateNewChat}
        className="mb-4 bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600 transition-colors w-full"
      >
        + Obrolan Baru
      </button>
      <h2 className="text-lg font-semibold mb-2 text-gray-700">Riwayat Chat</h2>
      <div className="flex-grow overflow-y-auto space-y-2">
        {sessions.length === 0 && (
          <p className="text-sm text-gray-500">Belum ada riwayat chat.</p>
        )}
        {sessions
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Sort by newest first
          .map((session) => (
            <div
              key={session.id}
              className={`p-2 rounded-md cursor-pointer transition-colors flex justify-between items-center 
                ${activeSessionId === session.id
                  ? "bg-sky-100 text-sky-700"
                  : "hover:bg-gray-200 text-gray-600"
                }`}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="truncate text-sm">{session.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering onSelectSession
                  onDeleteSession(session.id);
                }}
                className="text-red-400 hover:text-red-600 p-1 rounded-full"
                title="Hapus sesi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Sidebar; 