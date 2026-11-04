import { useState } from "react";
import { Mail, Phone, Send } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { notify } from "@/lib/notify";

const SUPPORT_EMAIL = "kalinga.tup@gmail.com";

/**
 * Feedback form. There is no feedback API, so submitting opens the visitor's
 * email app with the message pre-filled instead of pretending to send it.
 */
export const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Kalinga feedback from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    notify.info("Opening your email app", `Send the drafted message to ${SUPPORT_EMAIL}.`);
  };

  return (
    <section id="contact" className="scroll-mt-16 py-20 sm:py-28">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-primary">Makipag-ugnayan</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">We value your feedback</h2>
          <p className="text-lg text-muted-foreground">
            Tell us how we can improve. Our team replies within 24–72 hours.
          </p>
          <ul className="space-y-3 pt-2 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <Mail className="size-4" aria-hidden="true" />
              </span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium hover:text-primary">
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <a href="tel:+639196013527" className="font-medium hover:text-primary">
                (+63) 919 601 3527
              </a>
            </li>
          </ul>
        </div>

        <Card className="p-6 sm:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Your name" required>
              <Input value={form.name} onChange={update("name")} placeholder="Juan Dela Cruz" autoComplete="name" />
            </Field>
            <Field label="Your email" required>
              <Input type="email" value={form.email} onChange={update("email")} placeholder="juan.delacruz@gmail.com" autoComplete="email" />
            </Field>
            <Field label="Message" required>
              <Textarea rows={5} value={form.message} onChange={update("message")} placeholder="Hello, I'd like to share my feedback…" />
            </Field>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Send aria-hidden="true" /> Send feedback
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
};
