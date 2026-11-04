import { Ambulance, MapPinHouse, PackageOpen, UsersRound } from "lucide-react";

const FEATURES = [
  {
    icon: Ambulance,
    title: "Mabilis na responde sa tamang oras",
    text: "Maibibigay agad ang iyong mga pangangailangan, dahil ang iyong kaligtasan ang aming prioridad.",
  },
  {
    icon: PackageOpen,
    title: "Inuuna namin ang iyong pangangailangan",
    text: "May first aid kit na handang ibigay, pati pagkain at inumin para sa iyong kalusugan.",
  },
  {
    icon: MapPinHouse,
    title: "Abot-kamay ang tulong nasaan ka man",
    text: "Sa real-time tracking, madaling matutukoy ang iyong lokasyon anumang oras, kahit saan.",
  },
  {
    icon: UsersRound,
    title: "Makipag-ugnayan at ipaalam ang kalagayan",
    text: "Iparating kung saan ka naroroon at kung ano ang iyong kailangan, direkta sa responder.",
  },
];

export const AboutSection = () => (
  <section id="about" className="scroll-mt-16 py-20 sm:py-28">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">Tungkol sa Kalinga</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">May Kalinga para sa bawat pangangailangan</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Handang maghatid ng tulong at kaligtasan anumang oras at kahit saan ka man naroroon.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 rounded-xl border border-border bg-surface p-6 shadow-xs">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
