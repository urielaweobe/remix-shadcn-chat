import { Mistral } from "@mistralai/mistralai";
import { createClient } from "@supabase/supabase-js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateNDaysAgo(daysDifference: number) {
  const now = new Date(); // current date and time
  now.setDate(now.getDate() - daysDifference); // subtract n days
  return formatDate(now);
}

export const dates = {
  startDate: getDateNDaysAgo(3), // alter days to increase/decrease data set
  endDate: getDateNDaysAgo(1), // leave at 1 to get yesterday's data
};

const mistralApiKey = process.env.VITE_MISTRAL_API_KEY || "";
export const SUPABASEURL = process.env.VITE_SUPABASE_URL || "";
export const SUPABASEKEY = process.env.VITE_SUPABASE_KEY || "";
export const POLYGONAPIKEY = process.env.VITE_POLYGON_API || "";

export const mistralClient = new Mistral({ apiKey: mistralApiKey });
export const supabase = createClient(SUPABASEURL, SUPABASEKEY);

export const stockDataFetchUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${POLYGONAPIKEY}`;
