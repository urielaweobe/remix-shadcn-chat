import { Messages } from "@mistralai/mistralai/models/components";
import { getCurrentWeather, getLocation, tools } from "./tools";
import { mistralClient } from "./utils";

interface availableFunctionsProps {
  getCurrentWeather: ({ location }: { location: string }) => Promise<string>;
  getLocation: () => Promise<string>;
}

const availableFunctions: availableFunctionsProps = {
  getCurrentWeather,
  getLocation,
};

/**
 * Goal - build an agent that can answer any questions that might require knowledge about my current location and the current weather at my location.
 */
 export async function assistantAgent(query: string) {
  const messages: Messages[] = [
    {
      role: "system",
      content:
        "You are a helpful AI agent. Give highly specific answers based on the information you're provided. Prefer to gather information with the tools provided to you rather than giving basic, generic answers.",
    },
    {
      role: "user",
      content: query,
    },
  ];

  const MAX_INTERATIONS = 3;

  for (let i = 0; i < MAX_INTERATIONS; i++) {
    console.log(`Iteration #${i + 1}`);
    const response = await mistralClient.chat.complete({
      model: "mistral-large-latest",
      messages,
      tools,
      toolChoice: "auto",
    });

    if (
      !response?.choices ||
      !response?.choices[0] ||
      response.choices.length === 0
    ) {
      console.error("No choices available in the response");
      return;
    }

    const { finishReason, message } = response.choices[0];
    const { toolCalls } = message;
    console.log(response.choices[0].message);

    messages.push(message as Messages);

    if (!toolCalls) {
      console.error("No tool calls available in the response");
      return;
    }

    if (finishReason === "stop") {
      console.log("AGENT ENDING");
      return;
    } else if (finishReason === "tool_calls") {
      const functionObject = toolCalls[0].function;
      const functionName = functionObject.name as keyof availableFunctionsProps;

      if (typeof functionObject.arguments !== "string") {
        console.error("Function arguments are not a string");
        return;
      }

      const functionArgs = JSON.parse(functionObject.arguments);
      const functionResponse = await availableFunctions[functionName](
        functionArgs
      );
      console.log(functionResponse);
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function
          .name as keyof availableFunctionsProps;
        const functionToCall = availableFunctions[functionName];
        if (typeof toolCall.function.arguments !== "string") {
          console.error("Function arguments are not a string");
          return;
        }
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await functionToCall(functionArgs);
        messages.push({
          toolCallId: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        });
      }
    }
  }
}

// await assistantAgent("What's the current weather in my current location?");
