import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xl font-bold tracking-tight">Algoview</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="#features" className="hover:underline">Features</Link>
          <Link href="#how-it-works" className="hover:underline">How it works</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="px-6 py-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-6">
            Watch your solutions come alive.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 mb-10">
            Algoview helps you master algorithms by tracing every variable, pointer, and
            state change. Learn patterns, predict steps, and prove yourself under pressure.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-background font-medium transition hover:opacity-90"
            >
              Start learning
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 px-8 font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              See features
            </Link>
          </div>
        </section>

        <section id="features" className="px-6 py-20 border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
            {[
              {
                title: "Visual traces",
                desc: "Step through arrays, trees, graphs, and heaps while your code runs.",
              },
              {
                title: "Predict the next step",
                desc: "Active learning: answer small questions before the engine reveals the answer.",
              },
              {
                title: "Timed practice",
                desc: "Mock assessments on realistic problems with hidden tests and instant feedback.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-20 border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight mb-10">How it works</h2>
            <ol className="space-y-8">
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-medium">1</span>
                <div>
                  <h3 className="font-semibold">Learn the pattern</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">Short lessons that show how to recognize a technique and the common mistakes to avoid.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-medium">2</span>
                <div>
                  <h3 className="font-semibold">Figure it out yourself</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">Each problem becomes a series of small prediction questions. You answer before the engine shows the next step.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-medium">3</span>
                <div>
                  <h3 className="font-semibold">Prove it under pressure</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">Take a timed mock interview. Your code runs against hidden tests and you get feedback after each session.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
        &copy; {new Date().getFullYear()} Algoview. Built to help you think deeper.
      </footer>
    </div>
  );
}
