'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useCue } from './Runtime';
import Sequence from './Sequence';
import WriteOn from './WriteOn';
import {
  approach, contact, lead, mantra, projects,
  sections, site, studies, tools, track, triad,
} from '@/lib/content';
import { reducedMotion } from '@/lib/scroll';

const pad = (n) => String(n).padStart(2, '0');
const featured = projects.filter((p) => p.featured);
const others = projects.filter((p) => !p.featured);

const ArrowNE = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

/** One cue observer for the whole document rather than one per section. */
export default function Sections() {
  const root = useRef(null);
  useCue(root);

  return (
    <main id="main" ref={root}>
      <Sequence />
      <Intro />
      <Approche />
      <Principes />
      <Travaux />
      <Parcours />
      <Contact />
    </main>
  );
}

/**
 * Every numbered section. On wide screens the heading sits in a rail on the
 * left and stays pinned to the bottom of the viewport while its section is
 * on screen — the reader always knows where they are, and the rail keeps it
 * from ever sitting on top of the content.
 */
function Section({ id, screen = false, children }) {
  const i = sections.findIndex((s) => s.id === id);
  return (
    <section
      className={`section shell${screen ? ' section--screen' : ''}`}
      id={id}
      aria-labelledby={`${id}-t`}
    >
      <h2 className="section__head" id={`${id}-t`}>
        <span className="section__label">{sections[i].label}</span>
        <span className="section__num" aria-hidden="true">
          {pad(i + 1)}
        </span>
      </h2>
      <div className="section__body">{children}</div>
    </section>
  );
}

/* ---- Intro ---------------------------------------------------------------
   The name is not here. One statement, what he does, where he is — the
   solid from the opening comes to rest beside it. */
function Intro() {
  return (
    <section className="intro shell" aria-label="Introduction">
      <div className="intro__body">
        <WriteOn className="intro__punch">
          {lead.punch.map((line, i) => (
            // The space is typed and read, and collapses at the start of the line.
            <span className="intro__line" key={line}>
              {i ? ' ' : ''}
              {line}
            </span>
          ))}
        </WriteOn>
        <WriteOn className="intro__role" linger>
          {lead.tagline}
        </WriteOn>
      </div>

      <div className="intro__foot">
        <p className="label">{site.location}</p>
        <p className="label intro__status">
          <span className="dot" aria-hidden="true" />
          {site.status}
        </p>
      </div>
    </section>
  );
}

/* ---- 01 Approche ---------------------------------------------------------
   The argument, alone on its screen. */
function Approche() {
  return (
    <Section id="approche" screen>
      <WriteOn className="statement">
        <span className="statement__muted">{lead.problem}</span> {lead.belief}
      </WriteOn>
      <div className="approach">
        {approach.map((p, i) => (
          <WriteOn key={p} linger={i === approach.length - 1}>
            {p}
          </WriteOn>
        ))}
      </div>
    </Section>
  );
}

/* ---- 02 Principes -------------------------------------------------------- */
function Principes() {
  return (
    <Section id="principes" screen>
      <ul className="mantra">
        {mantra.map((word) => (
          <WriteOn as="li" key={word}>
            {word}
          </WriteOn>
        ))}
      </ul>

      <div className="triad">
        {triad.map((row, i) => (
          <WriteOn className="triad__row" key={row.name} linger={i === triad.length - 1}>
            <span className="triad__name">{row.name}</span>{' '}
            <span className="triad__terms">
              {row.a} <em>×</em> {row.b}
            </span>
          </WriteOn>
        ))}
      </div>
    </Section>
  );
}

/* ---- 03 Travaux ----------------------------------------------------------
   Featured work gets a screen and a visual each; the rest share a list. */
function Travaux() {
  return (
    <Section id="travaux">
      <div className="features">
        {featured.map((p, i) => (
          <Feature key={p.name} p={p} n={i + 1} />
        ))}
      </div>

      {others.length > 0 && (
        <div className="others cue">
          <h3 className="others__title">Autres travaux</h3>
          <ul>
            {others.map((p, i) => (
              <li className="others__row" key={p.name}>
                <span className="others__num">{pad(featured.length + i + 1)}</span>
                <span className="others__name">{p.name}</span>
                <span className="others__line">{p.line}</span>
                <span className="others__kicker">{p.kicker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function Feature({ p, n }) {
  return (
    <article className="feature cue">
      <Visual p={p} n={n} />
      <div className="feature__text">
        <p className="label">
          {pad(n)} — {p.kicker}
        </p>
        <h3 className="feature__name">{p.name}</h3>
        <p className="feature__line">{p.line}</p>
        <p className="feature__stack">{p.stack.join(' · ')}</p>
        {p.href ? (
          <a className="feature__link" href={p.href} target="_blank" rel="noopener noreferrer">
            Voir le projet
            <ArrowNE />
          </a>
        ) : null}
      </div>
    </article>
  );
}

/** A render, a loop, or — until one exists — a drawing sheet. */
function Visual({ p, n }) {
  const alt = p.alt ?? `${p.name} — ${p.kicker}`;
  if (p.video) {
    return (
      <div className="visual">
        <LoopVideo src={p.video} poster={p.image ?? undefined} label={alt} />
      </div>
    );
  }
  if (p.image) {
    return (
      <div className="visual">
        <Image
          className="visual__media"
          src={p.image}
          alt={alt}
          fill
          sizes="(max-width: 1000px) 100vw, 56vw"
        />
      </div>
    );
  }
  return <Sheet p={p} n={n} />;
}

/** Plays only while on screen, and never for reduced motion. */
function LoopVideo({ src, poster, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.removeAttribute('autoplay');
      el.pause();
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className="visual__media"
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

/**
 * Stand-in until a render exists: a drawing sheet with its title block. It
 * belongs to the design rather than reading as a missing image — the work
 * starts as a drawing anyway.
 */
function Sheet({ p, n }) {
  return (
    <div className="visual sheet" aria-hidden="true">
      <span className="sheet__num">{pad(n)}</span>
      <dl className="sheet__block">
        <div>
          <dt>Planche</dt>
          <dd>{pad(n)}</dd>
        </div>
        <div>
          <dt>Pièce</dt>
          <dd>{p.name}</dd>
        </div>
        <div>
          <dt>Outils</dt>
          <dd>{p.stack.join(', ')}</dd>
        </div>
      </dl>
    </div>
  );
}

/* ---- 04 Parcours --------------------------------------------------------- */
function Parcours() {
  return (
    <Section id="parcours">
      {[
        ['Expérience', track],
        ['Formation', studies],
      ].map(([label, rows]) => (
        <div className="track cue" key={label}>
          <h3 className="track__group">{label}</h3>
          <ul>
            {rows.map((row) => (
              <li className="track__row" key={`${row.from}-${row.title}`}>
                <span className="track__years">
                  {row.from} — {row.to}
                </span>
                <span className="track__title">{row.title}</span>
                <span className="track__at">{row.at}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="tools cue">
        <h3 className="track__group">Outils</h3>
        <ul className="tools__run">
          {tools.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ---- 05 Contact ---------------------------------------------------------- */
function Contact() {
  const mail = contact.find((c) => c.primary);
  return (
    <Section id="contact" screen>
      <a className="contact__mail cue" href={mail.href}>
        <span>{mail.value}</span>
      </a>

      <ul className="contact__links cue" style={{ '--delay': '100ms' }}>
        {contact.filter((c) => !c.primary).map((c) => (
          <li key={c.label}>
            <a
              className="contact__link"
              href={c.href}
              {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span className="label">{c.label}</span>
              <span className="contact__value">
                {c.value}
                {c.external ? <ArrowNE /> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
