import { useState } from "react";
import { Activity, AlertTriangle, Ambulance, Bell, Plus, Search, Trash2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Kbd,
  Page,
  PageHeader,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Skeleton,
  StatCard,
  StatusBadge,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeSelector,
  Tooltip,
  useConfirm,
} from "@/components/ui";
import { notify } from "@/lib/notify";
import { useChartTheme } from "@/lib/chartTheme";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
    {children}
  </section>
);

const SWATCHES = [
  ["bg-primary", "primary"],
  ["bg-accent", "accent"],
  ["bg-critical", "critical"],
  ["bg-warning", "warning"],
  ["bg-success", "success"],
  ["bg-info", "info"],
  ["bg-surface border", "surface"],
  ["bg-surface-2", "surface-2"],
  ["bg-sidebar", "sidebar"],
];

const chartData = [
  { area: "Urban", medical: 12, fire: 4, flood: 2 },
  { area: "Coastal", medical: 7, fire: 2, flood: 9 },
  { area: "Mountain", medical: 5, fire: 1, flood: 3 },
];

export default function StyleGuide() {
  const confirm = useConfirm();
  const chart = useChartTheme();
  const [email, setEmail] = useState("");

  return (
    <Page>
      <PageHeader
        eyebrow="Design system"
        title="Kalinga UI kit"
        description="Every shared component in both themes. Dev builds only."
        actions={<ThemeSelector />}
      />

      <Section title="Colour tokens">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {SWATCHES.map(([cls, name]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-14 rounded-lg ${cls}`} />
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-3xl font-bold tracking-tight">Display 30 / bold</p>
            <p className="text-2xl font-bold tracking-tight">Page title 24 / bold</p>
            <p className="text-lg font-semibold">Section 18 / semibold</p>
            <p className="text-base font-semibold">Card title 16 / semibold</p>
            <p className="text-sm">Body 14 / regular. The quick brown fox jumps over the lazy dog.</p>
            <p className="text-xs text-muted-foreground">Caption 12 / muted</p>
            <p className="tabular text-2xl font-bold">1,284 · 09:41</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="destructive">
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <Button variant="emergency" size="lg">
            <AlertTriangle aria-hidden="true" /> Emergency SOS
          </Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="link">Link</Button>
          <IconButton label="Search">
            <Search />
          </IconButton>
          <Tooltip content="Add incident">
            <Button size="icon" variant="outline" aria-label="Add incident">
              <Plus />
            </Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="critical">Critical</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="solidCritical">Live</Badge>
          {["reported", "en_route", "on_scene", "resolved", "pending", "approved", "rejected", "critical", "high", "low"].map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active incidents" value="10" icon={Activity} tone="critical" delta="+3" deltaDirection="down" hint="vs last 6h" />
          <StatCard label="Responders available" value="38" icon={Users} hint="1 on assignment" />
          <StatCard label="Vehicles en route" value="4" icon={Ambulance} tone="info" />
          <StatCard label="Unread alerts" value="12" icon={Bell} tone="warning" />
        </div>
      </Section>

      <Section title="Forms">
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Field label="Email" hint="We never share it." required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@example.com" />
            </Field>
            <Field label="Urgency" error="Choose an urgency level.">
              <Select defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                <option>Low</option>
                <option>High</option>
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea placeholder="Describe the situation" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Notify the receiving hospital
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch defaultChecked /> Auto-refresh
            </label>
          </CardContent>
        </Card>
      </Section>

      <Section title="Cards, tabs, table">
        <Card>
          <CardHeader actions={<Button size="sm" variant="outline">View all</Button>}>
            <CardTitle>Recent incidents</CardTitle>
            <CardDescription>Live from the dispatch queue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="empty">Empty</TabsTrigger>
              </TabsList>
              <TabsContent value="active">
                <Table>
                  <THead>
                    <tr>
                      <TH>Incident</TH>
                      <TH>Location</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Responders</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {[
                      ["INC-11", "Emergency SOS", "Marikina", "acknowledged", 1],
                      ["INC-5", "Fire rescue", "Tondo, Manila", "reported", 0],
                      ["INC-7", "Industrial accident", "Calamba", "en_route", 2],
                    ].map(([id, type, place, status, count]) => (
                      <TR key={id} onClick={() => {}}>
                        <TD>
                          <p className="font-medium">{type}</p>
                          <p className="text-xs text-muted-foreground">{id}</p>
                        </TD>
                        <TD className="text-muted-foreground">{place}</TD>
                        <TD>
                          <StatusBadge status={status} />
                        </TD>
                        <TD className="tabular text-right">{count}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TabsContent>
              <TabsContent value="resolved">
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              </TabsContent>
              <TabsContent value="empty">
                <EmptyState title="No incidents" description="New reports appear here in real time." />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <p className="mr-auto text-xs text-muted-foreground">Updated just now</p>
            <Button size="sm" variant="ghost">
              Refresh
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Chart">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by area</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid {...chart.gridProps} />
                <XAxis dataKey="area" {...chart.axisProps} />
                <YAxis {...chart.axisProps} width={32} />
                <ChartTooltip {...chart.tooltipProps} />
                <Legend {...chart.legendProps} />
                {["medical", "fire", "flood"].map((key, i) => (
                  <Bar key={key} dataKey={key} name={key[0].toUpperCase() + key.slice(1)} fill={chart.seriesColor(i)} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Section>

      <Section title="Feedback">
        <div className="grid gap-4 lg:grid-cols-2">
          <Callout tone="warning" icon={AlertTriangle} title="Showing cached data">
            The live feed is unavailable. Figures may be up to 5 minutes old.
          </Callout>
          <Callout tone="critical" icon={AlertTriangle} title="Hospital at capacity">
            Redirect incoming patients to the nearest Level 3 facility.
          </Callout>
          <Card>
            <ErrorState compact description="The responder list couldn't load." onRetry={() => {}} />
          </Card>
          <Card className="flex flex-wrap items-center gap-2 p-5">
            <Button variant="outline" onClick={() => notify.success("Request submitted", "Logistics has been notified.")}>
              Success toast
            </Button>
            <Button variant="outline" onClick={() => notify.error("Could not save", "Network unavailable.")}>
              Error toast
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete this asset?",
                  description: "It will be removed from the registry for everyone.",
                  confirmLabel: "Delete",
                  tone: "critical",
                });
                if (ok) notify.info("Deleted");
              }}
            >
              Confirm dialog
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Dialog</Button>
              </DialogTrigger>
              <DialogContent title="Assign responder" description="Pick an available unit near the incident.">
                <Field label="Responder">
                  <Select defaultValue="1">
                    <option value="1">Responder One · 1.2 km</option>
                    <option value="2">Responder Two · 3.4 km</option>
                  </Select>
                </Field>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Assign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Sheet</Button>
              </SheetTrigger>
              <SheetContent title="Incident details" description="INC-11 · Emergency SOS">
                <div className="space-y-3 p-5 text-sm text-muted-foreground">Slide-over content.</div>
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Signed in as Admin</DropdownMenuLabel>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="critical">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        </div>
      </Section>

      <Section title="Misc">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Patient One" />
          <Avatar name="Responder Two" size="lg" />
          <span className="text-sm text-muted-foreground">
            Press <Kbd>/</Kbd> to search
          </span>
        </div>
      </Section>
    </Page>
  );
}
