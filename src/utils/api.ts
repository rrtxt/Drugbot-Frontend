export const fetchChatResponse = async (query: string, sessionId: string | null, isUsingRag: boolean) => {
  try {
    const response = await fetch(`api/chat?is_using_rag=${isUsingRag}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, sessionId }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat response:", error);
    throw error;
  }
};

export const fetchChatSession = async () => {
  try {
    const response = await fetch("api/chat/sessions");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat session:", error);
    throw error;
  }
};

export const fetchChatHistory = async (sessionId: string) => {
  try {
    const response = await fetch(`api/chat/histories/${sessionId}`); 
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
};

// export const fetchChatHistoryBySessionId = async (sessionId: string) => {
//   try {
//     const response = await fetch(`api/chat/histories/${sessionId}`);
//     if (!response.ok) {
//       throw new Error("Network response was not ok");
//     }
//     return await response.json();
//   } catch (error) {
//     console.error("Error fetching chat collection:", error);
//     throw error;
//   }
// };

export const deleteChatCollection = async (sessionId: string) => {
  try {
    const response = await fetch(`api/chat/histories/${sessionId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting chat collection:", error);
    throw error;
  }
};

export const fetchHealthCheck = async () => {
  try {
    const response = await fetch("api/health");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat response:", error);
    throw error;
  }
};
