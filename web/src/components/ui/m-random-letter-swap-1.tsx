import { Fragment, type ReactNode } from 'react';

import { RandomLetterSwap } from './random-letter-swap';

export interface LetterSwapLink {
  label: string;
  /** Renders the item: pass a router link or an anchor wrapping `children`. */
  render: (children: ReactNode, className: string) => ReactNode;
  active?: boolean;
}

/**
 * The navigation bar: a transparent row of links whose letters swap on hover
 * (RandomLetterSwap). The active item sits in the lime pill. Each item has a
 * fixed box, so hovering or switching pages never moves its neighbours.
 */
export default function RandomLetterSwapNav({ links, label = 'Main' }: { links: LetterSwapLink[]; label?: string }) {
  return (
    <nav className="lsnav" aria-label={label}>
      {links.map((link) => (
        <Fragment key={link.label}>
          {link.render(
            <RandomLetterSwap label={link.label} staggerDuration={0.025} transition={{ duration: 0.6, type: 'spring' }} />,
            `lsnav__item${link.active ? ' lsnav__item--active' : ''}`,
          )}
        </Fragment>
      ))}
    </nav>
  );
}
