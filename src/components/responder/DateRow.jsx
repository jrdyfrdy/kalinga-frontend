import { PageHeader } from "@/components/ui";

/** Responder dashboard header with today's date. */
const DateRow = () => {
  const today = new Date();
  return (
    <PageHeader
      eyebrow={today.toLocaleDateString("en-PH", { weekday: "long" })}
      title={today.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
      description="Responder availability, hospital capacity and nearby facilities."
    />
  );
};

export default DateRow;
