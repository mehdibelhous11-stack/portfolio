import Link from 'next/link';
import Mark from '@/components/Mark';
import {
  approach, byline, contact, lead, mantra, markNote, projects,
  site, studies, tools, track, triad,
} from '@/lib/content';

export const metadata = {
  title: 'Version texte',
  description: `${site.name}, ${site.role}. Parcours, travaux et contact en texte intégral.`,
  alternates: { canonical: '/text' },
};

/**
 * The whole site as text. No canvas, no smooth scroll, no client components —
 * only Next's own router runtime, and the page reads fine with that disabled.
 *
 * It exists for two reasons that happen to be the same reason: a page that
 * claims clarity as a value should be readable without scripts, and the
 * short main page can stay short because every detail a recruiter needs
 * lives here in full.
 */
export default function TextVersion() {
  return (
    <main className="shell text-page" id="main">
      <p className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Mark className="mark" />
        <Link href="/">Retour au site</Link>
      </p>

      <h1 style={{ marginTop: '2rem' }}>{site.name}</h1>
      <p className="label">
        {site.role} · {site.location} · {site.status}
      </p>

      <h2>Position</h2>
      <p>{lead.problem}</p>
      <p>{lead.belief}</p>
      <p>
        <strong>{lead.punch.join(' ')}</strong>
      </p>

      <h2>Approche</h2>
      {approach.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>Principes</h2>
      <p>{mantra.join(' ')}</p>
      <dl>
        {triad.map((row) => (
          <div key={row.name}>
            <dt>{row.name}</dt>
            <dd>
              {row.a} × {row.b}
            </dd>
          </div>
        ))}
      </dl>

      <h2>Travaux</h2>
      {projects.map((p, i) => (
        <section key={p.name}>
          <h3>
            {String(i + 1).padStart(2, '0')} — {p.name}
          </h3>
          <span className="label">{p.kicker}</span>
          <p>{p.long}</p>
          <p className="label">{p.stack.join(' · ')}</p>
        </section>
      ))}

      <h2>Expérience</h2>
      {track.map((row) => (
        <section key={row.title}>
          <h3>
            {row.title} — {row.at}
          </h3>
          <span className="label">
            {row.from} — {row.to} · {row.kind}
          </span>
          <p>{row.long}</p>
        </section>
      ))}

      <h2>Formation</h2>
      <dl>
        {studies.map((row) => (
          <div key={row.title}>
            <dt>{row.title}</dt>
            <dd>
              {row.at} · {row.from} — {row.to}
            </dd>
          </div>
        ))}
      </dl>

      <h2>Outils</h2>
      <p>{tools.join(' · ')}</p>

      <h2>Contact</h2>
      <dl>
        {contact.map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd>
              <a
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {c.value}
              </a>
            </dd>
          </div>
        ))}
      </dl>

      <h2>Colophon</h2>
      <p>{byline}</p>
      <p>{markNote}</p>
      <p>
        Composé en Space Grotesk. Site construit en Next.js, Three.js et CSS natif. © {site.year}.
      </p>
    </main>
  );
}
