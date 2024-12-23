import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Menu, Send, X } from "lucide-react";
import { ActionFunction, json } from "@remix-run/node";
import { agent } from "~/lib/agent";

// Message type
type Message = {
  id: string;
  content: string;
  sender: "user" | "bot" | "loading";
  displayContent?: string;
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
      return json({ error: "Failed to process the message" }, { status: 500 });
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

      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.sender !== "loading"));

      // Bot's response
      const newBotMessage: Message = {
        id: `bot-${Date.now()}`,
        content: botResponse,
        sender: "bot",
        displayContent: "",
      };

      setMessages((prev) => [...prev, newBotMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Letter-by-letter typing effect
  useEffect(() => {
    const typingInterval = setInterval(() => {
      setMessages((prevMessages) => {
        return prevMessages.map((message) => {
          // Only apply typing to bot messages that are not fully typed
          if (
            message.sender === "bot" &&
            message.displayContent !== message.content
          ) {
            // Get the next character to display
            const nextChar = message.content.charAt(
              message.displayContent?.length || 0
            );

            return {
              ...message,
              displayContent: (message.displayContent || "") + (nextChar || ""),
            };
          }
          return message;
        });
      });
    }, 10);

    return () => clearInterval(typingInterval);
  }, [messages]);

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
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Conversation list items */}
            {["Chat 1", "Chat 2", "Chat 3"].map((chat, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer mb-2"
              >
                {chat}
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
            className="lg:hidden mr-2"
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
                  className={`p-3 rounded-lg max-w-[70%] ${
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
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-lg resize-none min-h-[44px] max-h-[120px] overflow-y-auto break-words whitespace-pre-wrap bg-white scrollbar-hide focus:outline-none"
            />
            <Button
              onClick={handleSendMessage}
              variant="default"
              size="icon"
              className="mt-3"
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
