import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const DOCK_PATH = 'M 34 40 C 44 40 44 17 55 17 L 100 17 L 100 40 Z';
const DOCK_EDGE = 'M 34 40 C 44 40 44 17 55 17 L 100 17';

/**
 * The app's signature button detail: the lower-right of the surface steps
 * down through an S-curve into a slightly recessed "dock", with a hairline
 * highlight riding the curve's lip. Stretched to the button's box, so it
 * reads correctly at any width.
 */
export function CurvedDock({ depth = 0.12 }: { depth?: number }) {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Path d={DOCK_PATH} fill="#001D39" fillOpacity={depth} />
      <Path
        d={DOCK_EDGE}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.45}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}
