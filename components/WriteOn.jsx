import { cloneElement, isValidElement } from 'react';

/* How long the caret holds after a character, ms — punctuation reads as a
   pause, the way it would be typed. */
const HOLD = { '.': 220, ',': 100, ':': 140, ';': 140, '—': 120, '?': 220, '!': 220 };

/** How long the caret blinks at the end of a block that closes its section, ms. */
const WRITE_BLINK = 1700;

/** The text of a React tree — the copy assistive tech reads instead of the split one. */
function plain(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plain).join('');
  if (isValidElement(node)) return plain(node.props.children);
  return '';
}

/**
 * Text that writes itself on when it scrolls into view: characters appear in
 * order behind a caret, which holds at punctuation. Each character carries
 * its own time (--t) and hold (--d) from render, so once useCue switches the
 * block on (data-in) the rest is CSS — no per-frame script.
 *
 * Elements inside are kept (a muted span, an <em>); only their text is
 * split. Screen readers get the sentence whole: the split copy is
 * aria-hidden and a plain one sits beside it.
 *
 * Pace follows length: a short line types at a hand's speed, a paragraph
 * speeds up so no block takes much more than a second and a half.
 *
 * @param {{ as?: string, className?: string, linger?: boolean, children: React.ReactNode }} props
 *   `linger` leaves the caret blinking a moment at the end — for the last
 *   block of a section.
 */
export default function WriteOn({ as: Tag = 'p', className = '', linger = false, children }) {
  const text = plain(children);
  const total = [...text].length;
  const step = Math.round(Math.min(26, Math.max(10, 1500 / Math.max(total, 1))));

  let t = 0;
  let n = 0;
  const split = (node, key) => {
    if (node == null || typeof node === 'boolean') return null;
    if (typeof node === 'string' || typeof node === 'number') {
      return [...String(node)].map((ch) => {
        n += 1;
        const end = n === total;
        const hold = HOLD[ch] ?? 0;
        const style = { '--t': t };
        const dwell = end ? (linger ? WRITE_BLINK : step) : step + hold;
        if (dwell !== step) style['--d'] = dwell;
        t += step + hold;
        return (
          <span className="wo__c" key={n} style={style} data-end={end ? '' : undefined}>
            {ch}
          </span>
        );
      });
    }
    if (Array.isArray(node)) return node.map((child, i) => split(child, `${key}.${i}`));
    if (isValidElement(node)) return cloneElement(node, { key: node.key ?? key }, split(node.props.children, key));
    return node;
  };
  const visual = split(children, 'w');

  return (
    <Tag className={`wo ${className}`.trim()} style={{ '--step': step }} data-wo={t}>
      <span className="sr-only">{text}</span>
      <span className="wo__v" aria-hidden="true">
        {visual}
      </span>
    </Tag>
  );
}
