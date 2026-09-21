import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';

export type OrbPattern = 'bubbles' | 'drift' | 'glow';

interface DecorativeOrbsProps {
  pattern?: OrbPattern;
  color?: string;
}

/**
 * Soft translucent shapes pinned to the top-right of a gradient card —
 * the same layered-circle texture as a classic stat card, kept faint so it
 * adds depth without competing with the content.
 */
export function DecorativeOrbs({ pattern = 'bubbles', color = '#FFFFFF' }: DecorativeOrbsProps) {
  return (
    <Svg
      style={styles.svg}
      width="70%"
      height="100%"
      viewBox="0 0 200 160"
      preserveAspectRatio="xMaxYMin slice"
      pointerEvents="none"
    >
      {pattern === 'bubbles' && (
        <>
          <Circle cx="170" cy="40" r="70" fill={color} fillOpacity={0.1} />
          <Circle cx="200" cy="10" r="46" fill={color} fillOpacity={0.12} />
          <Circle cx="130" cy="135" r="34" fill={color} fillOpacity={0.07} />
          <Circle cx="190" cy="120" r="18" fill={color} fillOpacity={0.14} />
        </>
      )}
      {pattern === 'drift' && (
        <>
          <Ellipse cx="170" cy="30" rx="60" ry="26" fill={color} fillOpacity={0.12} />
          <Rect x="120" y="70" width="90" height="26" rx="13" fill={color} fillOpacity={0.09} />
          <Circle cx="186" cy="130" r="22" fill={color} fillOpacity={0.13} />
        </>
      )}
      {pattern === 'glow' && (
        <>
          <Circle cx="180" cy="20" r="80" fill={color} fillOpacity={0.08} />
          <Circle cx="180" cy="20" r="48" fill={color} fillOpacity={0.09} />
          <Circle cx="150" cy="110" r="12" fill={color} fillOpacity={0.16} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
