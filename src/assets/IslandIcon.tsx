import React from "react";
import Svg, { G, Circle, Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function IslandIcon({ size = 24, color = "#000000", strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      >
        <Circle cx={6} cy={7} r={3} />
        <Path d="M16 14s1-3 1-8V4s-1-2-3-2c-1 0-2 .5-2 .5" />
        <Path d="M13 8a4 4 0 0 1 8 0" />
        <Path d="M17 4s1-2 3-2c1 0 2 .5 2 .5M19.75 19A8 8 0 0 0 4 21" />
        <Path d="M2 20c.6.5 1.2 1 2.5 1c2.5 0 2.5-2 5-2c2.6 0 2.4 2 5 2c2.5 0 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
      </G>
    </Svg>
  );
}
