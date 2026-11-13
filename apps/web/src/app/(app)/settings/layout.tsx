import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, monitoring policy and demo data.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
