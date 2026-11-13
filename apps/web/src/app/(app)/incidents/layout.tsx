import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incidents",
  description: "Outages detected from failing checks and their recovery.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
