import { mistralClient, stockDataFetchUrl } from "./utils";

async function fetchReport(data: string) {
  const response = await mistralClient.chat.complete({
    model: "open-mistral-7b",
    messages: [
      {
        role: "system",
        content:
          "You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell.",
      },
      {
        role: "user",
        content: data,
      },
    ],
  });

  console.log(response.choices && response.choices[0].message.content);
}

async function fetchStockData() {
  const res = await fetch(stockDataFetchUrl, {
    method: "GET",
  });

  const data = await res.text();
  fetchReport(data);

  return data;
}

fetchStockData();