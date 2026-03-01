import Header from "./Header.tsx";
import { ComponentChildren } from "preact";

interface LayoutProps {
  user: { name: string; email: string; avatarUrl?: string | null };
  maxWidth?: "xl" | "2xl" | "3xl" | "5xl" | "6xl";
  children: ComponentChildren;
}

const widthClass = {
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export default function Layout({ user, maxWidth = "3xl", children }: LayoutProps) {
  return (
    <div class="min-h-screen">
      <Header user={user} />
      <main class={`${widthClass[maxWidth]} mx-auto px-4 py-8`}>
        {children}
      </main>
    </div>
  );
}
