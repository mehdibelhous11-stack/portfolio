import { MARK_PATH, MARK_VIEWBOX } from '@/lib/mark';

/**
 * The mark, from the canonical construction in lib/mark.js. Server
 * component — it is static markup and has no reason to ship JS.
 *
 * @param {{ className?: string, title?: string }} props
 *   Omit `title` for decorative use; the SVG is then hidden from assistive tech.
 */
export default function Mark({ className = 'mark', title }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path className="mark__glyph" d={MARK_PATH} fillRule="evenodd" />
    </svg>
  );
}
