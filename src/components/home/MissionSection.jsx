const PILLARS = [
  { value: "1 tap", label: "para humingi ng tulong" },
  { value: "24/7", label: "na pagtugon ng mga responder" },
  { value: "Real-time", label: "na lokasyon at ETA" },
];

export const MissionSection = () => (
  <section id="mission" className="scroll-mt-16 bg-brand-950 py-20 text-white sm:py-28">
    <div className="container grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-semibold text-accent">Ang aming misyon</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Handa tayo sa anumang sakuna.</h2>
        <p className="text-lg text-white/80">
          Sa Kalinga, isang tap lang ang kailangan. Kami na ang bahala sa mabilis at maaasahang serbisyong medikal.
        </p>
        <p className="text-white/70">
          Mabilisang serbisyo, dekalidad na doktor, at agarang pagtugon sa pangangailangan. Mula botika hanggang
          kagamitan, kalakip ang tamang kaalamang medikal para sa bawat Pilipino, saan mang panig ng bansa, anumang
          oras.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {PILLARS.map(({ value, label }) => (
          <div key={value} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <dt className="sr-only">{label}</dt>
            <dd className="text-3xl font-bold text-accent">{value}</dd>
            <dd className="mt-1 text-sm text-white/70">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
