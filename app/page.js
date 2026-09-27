import Link from 'next/link';
import Nav from '@/components/Nav';
import Runtime from '@/components/Runtime';
import Sections from '@/components/Sections';
import Mark from '@/components/Mark';
import { byline, site } from '@/lib/content';

export default function Home() {
  return (
    <>
      <Runtime />
      <Nav />
      <Sections />

      <footer className="footer">
        <div className="shell footer__inner">
          <Mark className="mark footer__mark" />
          <p className="label footer__byline">{byline}</p>
          <div className="footer__links">
            <Link className="label" href="/text">
              Version texte
            </Link>
            <a className="label" href="#top">
              Haut
            </a>
            <span className="label">© {site.year}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
