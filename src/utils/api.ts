export const fetchChatResponse = async (query: string, sessionId: string | null, isUsingRag: boolean) => {
  try {
    const payload: { query: string; session_id?: string } = { query };
    if (sessionId !== null && sessionId !== undefined) {
      payload.session_id = sessionId;
    }

    const response = await fetch(`/api/chat?is_using_rag=${isUsingRag}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    return await response.json(); // Original non-streaming behavior
  } catch (error) {
    console.error("Error fetching chat response:", error);
    throw error;
  }
};

export async function* fetchChatStreamResponse(query: string, sessionId: string | null, isUsingRag: boolean) {
  try {
    const payload: { query: string; sessionId?: string } = { query };
    if (sessionId !== null && sessionId !== undefined) {
      payload.sessionId = sessionId;
    }

    const response = await fetch(`/api/chat?is_using_rag=${isUsingRag}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Client hints it can accept a stream, though the Flask backend decides based on the endpoint logic
        "Accept": "application/x-ndjson, application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim().length > 0) {
          try {
            yield JSON.parse(buffer);
          } catch (e) {
            console.error("Error parsing final JSON chunk from stream:", buffer, e);
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; 

      for (const line of lines) {
        if (line.trim().length > 0) {
          try {
            yield JSON.parse(line);
          } catch (e) {
            console.error("Error parsing JSON chunk from stream:", line, e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching or processing chat stream:", error);
    throw error;
  }
}

export const fetchChatSession = async () => {
  try {
    const response = await fetch("api/chat/histories");
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

export const deleteChatSession = async (sessionId: string) => {
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
