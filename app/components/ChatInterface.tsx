import React from "react";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Menu, Send, X, Trash } from "lucide-react";
import { ActionFunction, json } from "@remix-run/node";
import { agent } from "~/lib/agent";

// Message type
type Message = {
  id: string;
  content: string;
  sender: "user" | "bot" | "loading";
  displayContent?: string;
};

type SavedConversation = {
  id: string;
  messages: Message[];
  name: string;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "initialize-conversation") {
    return json({
      conversationId: `conversation-${Date.now()}`,
      messages: [],
    });
  }

  if (actionType === "send-message") {
    const conversationId = formData.get("conversationId") as string;
    const userMessage = formData.get("message") as string;

    if (!conversationId || !userMessage) {
      return json({ error: "Invalid input" }, { status: 400 });
    }

    try {
      // Get the bot's response from the agent
      const botResponse = await agent(userMessage);

      // Return both the user's and bot's messages
      return json({
        messages: [
          { id: `user-${Date.now()}`, content: userMessage, sender: "user" },
          { id: `bot-${Date.now()}`, content: botResponse, sender: "bot" },
        ],
      });
    } catch (error) {
      return json(
        { error: `Failed to process the message - ${error}` },
        { status: 500 }
      );
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

const LoadingDots = () => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start">
      <div className={`p-3 rounded-lg bg-gray-200 text-black`}>
        Thinking{".".repeat(dots)}
      </div>
    </div>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoadedFromLocalStorage, setIsLoadedFromLocalStorage] =
    useState(false);

  useEffect(() => {
    const chats = localStorage.getItem("savedChats");
    if (chats) {
      setSavedChats(JSON.parse(chats));
    }
  }, []);

  const saveCurrentChat = (updatedMessages: Message[]) => {
    // Generate a name for the conversation based on the first message
    const firstUserMessage = updatedMessages.find(
      (msg) => msg.sender === "user"
    )?.content;
    const chatName = firstUserMessage
      ? `${firstUserMessage.slice(0, 20)}...`
      : "New Chat";

    if (activeChatId) {
      // Update the existing chat
      const updatedChats = savedChats.map((chat) =>
        chat.id === activeChatId ? { ...chat, messages: updatedMessages } : chat
      );
      setSavedChats(updatedChats);
      localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    } else {
      // Create a new chat
      const newChat: SavedConversation = {
        id: `chat-${Date.now()}`,
        name: chatName,
        messages: updatedMessages,
      };
      const updatedChats = [...savedChats, newChat];
      setSavedChats(updatedChats);
      localStorage.setItem("savedChats", JSON.stringify(updatedChats));
      setActiveChatId(newChat.id);
    }
  };

  // Load a saved conversation
  const loadChat = (id: string) => {
    const chat = savedChats.find((c) => c.id === id);
    if (chat) {
      setMessages(chat.messages);
      setActiveChatId(chat.id);
      setSidebarOpen(false);
      setIsLoadedFromLocalStorage(true);
    }
  };

  // Delete a saved conversation
  const deleteChat = (id: string) => {
    const updatedChats = savedChats.filter((c) => c.id !== id);
    setSavedChats(updatedChats);
    localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    if (id === activeChatId) {
      startNewChat(); // Clear the current chat if it was deleted
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setSidebarOpen(false);
    setIsLoadedFromLocalStorage(false);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;

    // User's message
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: "user",
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");

    try {
      // Add a loading message
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        content: "",
        sender: "loading",
      };
      setMessages((prev) => [...prev, loadingMessage]);

      // Simulate sending user message
      const botResponse = (await agent(inputMessage)) as string;

      setMessages((prev) => {
        const updatedMessages = prev
          .filter((msg) => msg.sender !== "loading")
          .concat({
            id: `bot-${Date.now()}`,
            content: botResponse,
            sender: "bot",
          });

        // Save conversation after bot's reply
        saveCurrentChat(updatedMessages);

        return updatedMessages;
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Letter-by-letter typing effect
  useEffect(() => {
    if (isLoadedFromLocalStorage) {
      return;
    }

    const typingInterval = setInterval(() => {
      setMessages((prevMessages) => {
        return prevMessages.map((message) => {
          if (
            message.sender === "bot" &&
            message.displayContent !== message.content
          ) {
            const nextChar = message.content.charAt(
              message.displayContent?.length || 0
            );
            return {
              ...message,
              displayContent: (message.displayContent || "") + nextChar,
            };
          }
          return message;
        });
      });
    }, 20); // Adjust typing speed (50ms between characters)

    return () => clearInterval(typingInterval);
  }, [messages, isLoadedFromLocalStorage]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 z-10`}
      >
        <div className="flex flex-col w-full">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Conversations</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Conversation list items */}
            <div className="flex justify-center mb-3">
              <Button variant="outline" onClick={startNewChat}>
                Start a new chat
              </Button>
            </div>
            {savedChats.map((chat) => (
              <div
                key={chat.id}
                className="flex justify-between items-center p-2 border rounded-lg hover:bg-gray-200 cursor-pointer mb-3"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => loadChat(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      loadChat(chat.id);
                    }
                  }}
                >
                  {chat.name}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteChat(chat.id)}
                >
                  <Trash className="h-4 w-4" color="red" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full">
        <div className="bg-white border-b p-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Remix Chat</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.sender === "loading") {
              return <LoadingDots key={msg.id} />;
            }

            return (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[70%] whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  {msg.sender === "user" ? (
                    msg.content
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.displayContent || msg.content,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t bg-white p-4">
          <div className="flex space-x-2">
            <textarea
              rows={1}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                const textarea = e.target;
                textarea.style.height = "auto";
                textarea.style.height =
                  Math.min(textarea.scrollHeight, 4 * 24) + "px";
              }}
              style={{ minHeight: "24px", maxHeight: "96px" }}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-lg resize-none overflow-y-auto break-words whitespace-pre-wrap bg-white scrollbar-hide focus:outline-none"
            />
            <Button
              onClick={handleSendMessage}
              variant="default"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
