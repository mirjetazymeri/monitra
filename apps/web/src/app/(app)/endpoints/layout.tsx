import type { Metadata } from "next";

export const metadata: Metadata = {
  // Re-declares the template so the nested endpoint detail route keeps the "· MonitraZ" suffix.
  title: { default: "Endpoints", template: "%s · MonitraZ" },
  description: "Register and manage the HTTP services you monitor.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
