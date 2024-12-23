import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Send } from "lucide-react";
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
    }, 20); // Adjust typing speed (50ms between characters)

    return () => clearInterval(typingInterval);
  }, [messages]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Remix Chat</CardTitle>
        </CardHeader>
        <CardContent className="h-96 overflow-y-auto space-y-4">
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
        </CardContent>
        <CardFooter className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 w-full p-2 border rounded-lg resize-none min-h-[44px] overflow-y-auto break-words whitespace-pre-wrap bg-white scrollbar-hide focus:outline-none"
          />
          <Button onClick={handleSendMessage} variant="default" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatInterface;
