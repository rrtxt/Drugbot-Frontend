export const fetchChatResponse = async (query: string) => {
  try {
    const response = await fetch(`api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
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
