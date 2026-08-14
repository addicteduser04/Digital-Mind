import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, Check, Inbox, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Today" };

const formattedDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Casablanca",
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date());

export default function TodayPage() {
  return (
    <AppShell>
      <section className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{formattedDate}</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">Good day.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">A clear day starts with deciding what deserves your attention.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:self-auto">
          <span className="size-1.5 rounded-full bg-amber-500" />Setup in progress
        </div>
      </section>

      <div className="grid gap-10 pt-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <div className="space-y-12">
          <section aria-labelledby="priorities-heading">
            <div className="flex items-center justify-between">
              <div><p className="section-kicker">Decide</p><h2 id="priorities-heading" className="section-title">Top priorities</h2></div>
              <span className="font-mono text-xs text-muted-foreground">0 / 3</span>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
              {[1, 2, 3].map((number) => (
                <div key={number} className="flex min-h-16 items-center gap-4 border-b border-border px-5 last:border-b-0">
                  <span className="grid size-6 place-items-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">{number}</span>
                  <span className="text-sm text-muted-foreground">A priority will live here</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Priority planning arrives with the execution experience in Phase 2.</p>
          </section>

          <section aria-labelledby="schedule-heading">
            <div><p className="section-kicker">Execute</p><h2 id="schedule-heading" className="section-title">Today’s schedule</h2></div>
            <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground"><CalendarDays size={18} /></span>
              <p className="mt-4 text-sm font-medium">Your day is open</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Calendar and time-blocking tools will be introduced in a later phase.</p>
            </div>
          </section>
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="capture-heading">
            <div><p className="section-kicker">Record</p><h2 id="capture-heading" className="section-title">Quick capture</h2></div>
            <div className="mt-5 rounded-2xl border border-border bg-ink p-5 text-ink-foreground shadow-[0_18px_50px_-32px_rgba(14,18,16,0.6)]">
              <div className="flex items-start gap-3"><Inbox className="mt-0.5" size={17} /><div><p className="text-sm font-medium">Clear your mind</p><p className="mt-1 text-xs leading-5 text-ink-muted">Capture first. Organize when you are ready.</p></div></div>
              <button disabled className="mt-5 flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-xs text-ink-muted" aria-label="Quick capture coming in Phase 2">
                Write something down… <Plus size={16} />
              </button>
            </div>
          </section>

          <section aria-labelledby="rhythm-heading">
            <div><p className="section-kicker">Reflect</p><h2 id="rhythm-heading" className="section-title">Daily rhythm</h2></div>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {[{ icon: Check, label: "Choose what matters", detail: "Top 3 priorities" }, { icon: ArrowUpRight, label: "Protect your attention", detail: "Plan focused time" }].map(({ icon: Icon, label, detail }) => (
                <div key={label} className="flex items-center gap-3 py-4"><span className="grid size-9 place-items-center rounded-lg bg-secondary"><Icon size={16} /></span><div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div></div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
