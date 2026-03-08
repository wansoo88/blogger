import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <section className="hero">
          <p className="label">Blogger Local Admin</p>
          <h1>Content pipeline, weekly quotas, and alert monitoring.</h1>
          <p>
            This app manages draft production, human review, publish scheduling,
            and email alerts for the Blogger operation.
          </p>
          <p>
            <Link href="/dashboard">Open dashboard</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
