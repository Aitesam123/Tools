import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Workspace from "@/components/Workspace";
import Faq from "@/components/Faq";

export default function Home() {
  return (
    <main id="top">
      <Header />
      <Hero />
      <Workspace />
      <Faq />
      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400 dark:border-ink-700">
        Pixel Studio — images are processed in memory and never stored.
      </footer>
    </main>
  );
}
