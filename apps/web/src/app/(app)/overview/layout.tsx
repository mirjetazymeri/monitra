import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview",
  description: "Health of every monitored service at a glance.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
