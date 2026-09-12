const FAQS = [
  {
    q: "Does converting an image reduce quality?",
    a: "Converting between lossy formats (like JPEG or WEBP) re-encodes the image and can lose a small amount of detail. Converting to a lossless format like PNG at full quality does not discard image data — but it can't undo quality already lost from the source file.",
  },
  {
    q: "How can I get an image under 1 MB?",
    a: "Use the \"1 MB\" file size preset. We binary-search the encoder's quality setting to find the highest quality that still fits your limit, and only reduce the image's dimensions as a last resort if quality reduction alone can't reach the target.",
  },
  {
    q: "Does PNG support transparency?",
    a: "Yes. PNG, WEBP, AVIF, and TIFF all support an alpha (transparency) channel in this app. JPEG does not — converting a transparent image to JPEG fills transparent areas with a background color you choose.",
  },
  {
    q: "What is WEBP / AVIF?",
    a: "WEBP and AVIF are modern image formats that typically produce smaller files than JPEG or PNG at equivalent visual quality, with broad current browser support. AVIF often compresses further than WEBP but can take longer to encode.",
  },
  {
    q: "Is my upload stored anywhere?",
    a: "Processing happens in memory for the duration of your request. Files aren't written to disk or a database, and nothing is used to train any model.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="space-y-3">
        {FAQS.map((item) => (
          <details key={item.q} className="card group p-4">
            <summary className="cursor-pointer list-none text-sm font-medium">
              <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
              {item.q}
            </summary>
            <p className="mt-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
