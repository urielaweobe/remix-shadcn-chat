import { createClient } from "@supabase/supabase-js";
import { Mistral } from "@mistralai/mistralai";

const apiKey = "DV6vSywg34K6RY8YHN1lz7wHThUmEQaT";
const supabaseUrl = "https://anxdvsppnslhokzukahv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGR2c3BwbnNsaG9renVrYWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNzExMzcsImV4cCI6MjA0Nzg0NzEzN30.x6tt2reEn2WEfpnliWgc1DsBLtgkOzKWfL0LWFWu6AU";

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

function formatResponse(response: string): string {
  // Preserve formatting in headers and lists
  response = response.replace(/(#{1,6}\s.*?:)(\s*)/g, (header, space) => {
    return `<strong>${header}</strong>${space}`;
  });

  // Bold text with asterisks - but only outside of headers and list numbers
  response = response.replace(/(\*\*.*?\*\*)(:)/g, "<strong>$1</strong>$2");

  // Numbered lists with indentation
  response = response.replace(/^(\d+)\.\s(.+)$/gm, (num, content) => {
    return `<div class="pl-4"><strong>${num}.</strong> ${content}</div>`;
  });

  // Bullet points with indentation
  response = response.replace(/^-\s(.+)$/gm, '<div class="pl-4">• $1</div>');

  // Headings
  response = response.replace(/^(#{1,6})\s(.+)$/gm, (hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content}</h${level}>`;
  });

  return response;
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
    // return response;

    return formatResponse(typeof response === "string" ? response : "");
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
