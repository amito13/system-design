import { IsoBlock } from '../../components/IsoBlock';

/** Original mark: three isometric blocks joined by a signal path. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path
        d="M11 27 L20 22 L29 27"
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <IsoBlock x={20} y={17} r={8} h={6} category="network" />
      <IsoBlock x={10} y={32} r={7} h={5} category="compute" />
      <IsoBlock x={30} y={32} r={7} h={5} category="data" />
    </svg>
  );
}
