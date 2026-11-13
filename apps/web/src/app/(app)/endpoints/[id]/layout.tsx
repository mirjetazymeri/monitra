import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Endpoint details",
  description: "Availability and response times recorded for this endpoint.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
