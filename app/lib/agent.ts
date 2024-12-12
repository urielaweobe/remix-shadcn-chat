import { createClient } from "@supabase/supabase-js";
import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);
const mistralClient = new Mistral({ apiKey });

async function fetchDataFromSupabase(embedding: number[]) {
  try {
    const { data, error } = await supabase.rpc("match_handbook_docs", {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 5,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.map((chunk: { content: string }) => chunk.content).join(" ");
  } catch (error) {
    console.error("Error fetching data from Supabase:", error);
    return null;
  }
}

export async function agent(query: string) {
  try {
    // Create an embedding of the query
    const embeddingResponse = await mistralClient.embeddings.create({
      model: "mistral-embed",
      inputs: [query],
    });

    // Extract the embedding array directly
    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Embedding is undefined");
    }

    // Fetch relevant data from Supabase using the embedding
    const context = await fetchDataFromSupabase(embedding);

    // Combine the context and query to generate a response
    const response = await generateChatResponse({ context, query });
    return response;
  } catch (error) {
    console.error("Error in agent function:", error);
    return "I'm sorry, I couldn't process your request.";
  }
}

async function generateChatResponse({
  context,
  query,
}: {
  context: string;
  query: string;
}) {
  try {
    const response = await mistralClient.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "user",
          content: `Handbook context: ${context} - Question: ${query}`,
        },
      ],
    });
    if (!response?.choices || response.choices.length === 0) {
      throw new Error("No choices available in the response");
    }
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I couldn't process your request.";
  }
}
