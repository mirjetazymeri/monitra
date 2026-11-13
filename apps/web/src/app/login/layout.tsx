import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your MonitraZ monitoring workspace.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
