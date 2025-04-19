import React from "react";
import {
  json,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import tailwindStylesheet from "~/tailwind.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheet },
];

export async function loader() {
  return json({
    ENV: {
      VITE_MISTRAL_API_KEY: process.env.VITE_MISTRAL_API_KEY,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY,
      VITE_POLYGON_API: process.env.VITE_POLYGON_API
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.process = ${JSON.stringify({
              env: data.ENV,
            })}`,
          }}
        />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
