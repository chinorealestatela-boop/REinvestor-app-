import { TIER_COLOR } from "../lib/format";
import type { ScoreTier } from "../lib/types";

export default function ScoreRing({
  score,
  tier,
  size = 56,
}: {
  score: number;
  tier: ScoreTier;
  size?: number;
}) {
  const color = TIER_COLOR[tier];
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="score-ring shrink-0"
      style={{
        // @ts-expect-error custom property
        "--size": `${size}px`,
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--surface-2) 0deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: size - 8,
          height: size - 8,
          background: "var(--surface)",
        }}
      >
        <span
          className="font-bold"
          style={{ color, fontSize: size * 0.32 }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
