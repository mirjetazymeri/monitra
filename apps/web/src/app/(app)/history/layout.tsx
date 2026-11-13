import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monitoring History",
  description: "Every recorded health check, filterable and paginated.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
