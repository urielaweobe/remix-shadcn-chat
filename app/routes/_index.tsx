// app/routes/_index.tsx
import type { MetaFunction } from "@remix-run/node";
import ChatInterface from "~/components/ChatInterface";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix Shadcn Chat" },
    { name: "description", content: "A simple chat application" }
  ];
};

export default function Index() {
  return <ChatInterface />;
}