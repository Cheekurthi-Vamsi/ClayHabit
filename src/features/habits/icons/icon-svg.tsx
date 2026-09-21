import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { ICON_SVGS } from './icon-svgs.generated';

interface IconSvgProps {
  id: string;
  size: number;
  /** Fills `currentColor` — line icons use it; colour emoji ignore it. */
  color?: string;
}

/** Draws a bundled habit icon. Memoised: parsing the markup is the costly part. */
export const IconSvg = memo(function IconSvg({ id, size, color }: IconSvgProps) {
  const xml = ICON_SVGS[id];
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
});
