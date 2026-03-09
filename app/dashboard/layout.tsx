import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/progress", label: "Progress" },
  { href: "/dashboard/keywords", label: "Keywords" },
  { href: "/dashboard/pipeline", label: "Pipeline" },
  { href: "/dashboard/review", label: "Review" },
  { href: "/dashboard/publish", label: "Publish" },
  { href: "/dashboard/monitor", label: "Monitor" },
  { href: "/dashboard/notifications", label: "Alerts" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/playbook", label: "Playbook" },
];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="page-shell">
      <div className="container section-stack">
        <section className="hero">
          <p className="label">Blogger Ops Control Room</p>
          <div className="topbar">
            <div>
              <h1 style={{ marginBottom: 8 }}>Automated content workflow</h1>
              <p style={{ margin: 0 }}>
                Manage keywords, generate drafts with Gemini, review content,
                schedule publishing, and process alerts from one interface.
              </p>
            </div>
            <div className="actions">
              <Link className="button-link" href="/">
                Home
              </Link>
            </div>
          </div>
          <nav className="nav-strip">
            {links.map((link) => (
              <Link key={link.href} className="nav-pill" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </section>
        {children}
      </div>
    </main>
  );
}
