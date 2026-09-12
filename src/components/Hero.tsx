export default function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20">
      <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Convert. Enhance. Optimize.
        <br />
        <span className="text-brand-600 dark:text-brand-400">Without compromising quality.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-400">
        Real image processing, not a mockup. Set an exact file size and resolution, preview the
        real before/after, and download a file we&apos;ve actually verified matches your target.
      </p>
      <a href="#workspace" className="btn-primary mt-8 inline-flex">
        Upload an image
      </a>
    </section>
  );
}
