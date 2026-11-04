import AppShell from "@/layouts/AppShell";
import { Allocation } from "../components/logistics/Allocation";

export const RequestAllocation = () => {
  return (
    <AppShell role="logistics">
          <Allocation />
    </AppShell>
  );
};

