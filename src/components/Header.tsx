import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur-md dark:border-ink-700 dark:bg-ink-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">P</span>
          <span className="text-base">Pixel Studio</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300 md:flex">
          <a href="#workspace" className="hover:text-neutral-900 dark:hover:text-white">
            Converter
          </a>
          <a href="#compare" className="hover:text-neutral-900 dark:hover:text-white">
            Compare
          </a>
          <a href="#faq" className="hover:text-neutral-900 dark:hover:text-white">
            FAQ
          </a>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
