import Link from "next/link";
import { Inbox, ListTodo, Sparkles, Sun } from "lucide-react";
import { GlobalQuickAction } from "./global-quick-action";

const navItems = [
  { label: "Today", href: "/today", icon: Sun },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Inbox", href: "/inbox", icon: Inbox }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/70 bg-sidebar px-5 py-6 md:flex md:flex-col">
        <Link href="/today" className="flex items-center gap-3 rounded-lg px-2 py-1.5" aria-label="Digital Mind home">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background"><Sparkles size={15} strokeWidth={1.8} /></span>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Digital Mind</span>
        </Link>
        <nav className="mt-10" aria-label="Primary navigation">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent">
              <Icon size={17} strokeWidth={1.8} />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-background/60 p-4">
          <p className="text-xs font-medium">Foundation mode</p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Plan → Execute → Record → Review → Adjust</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:hidden">
        <Link href="/today" className="flex items-center gap-2.5" aria-label="Digital Mind home">
          <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background"><Sparkles size={14} /></span>
          <span className="text-sm font-semibold">Digital Mind</span>
        </Link>
        <span className="size-8 rounded-full border border-border bg-secondary" aria-hidden="true" />
      </header>

      <div className="md:pl-64">
        <header className="hidden h-16 items-center justify-end border-b border-border/70 px-8 md:flex">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />Private workspace</div>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 md:pb-12 md:pt-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[76px] grid-cols-4 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile navigation">
        <Link href="/today" aria-current="page" className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium"><Sun size={20} /><span>Today</span></Link>
        <Link href="/tasks" className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"><ListTodo size={20} /><span>Tasks</span></Link>
        <GlobalQuickAction />
        <Link href="/inbox" className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"><Inbox size={20} /><span>Inbox</span></Link>
      </nav>
    </div>
  );
}
