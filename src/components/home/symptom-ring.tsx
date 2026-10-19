import type { CSSProperties } from "react";
import { Tooltip } from "@/components/content/Tooltip";
import { FIGURE_SCALE, LINE } from "@/lib/women-on-line";
import { SYMPTOM_ICONS, type SymptomIcon } from "./symptom-icons";

// The home scene's symptoms beat: the five symptoms of androgen excess, from
// the wiki design, coming in one by one in a ring round her as she floats.
// Drawn inside the scene's SVG, in its units, so they stay round her.

const SYMPTOMS = [
  {
    icon: SYMPTOM_ICONS.hirsutism,
    label: "Hirsutism",
    tip: "Excess growth of thick, dark hair in places where women usually have little or none, such as the face, chest and back.",
  },
  { icon: SYMPTOM_ICONS.acne, label: "Acne & oily skin" },
  {
    icon: SYMPTOM_ICONS.hairLoss,
    label: ["Female-pattern", "hair loss"],
    tip: "Thinning of the hair on the top and front of the scalp, driven by androgens.",
  },
  {
    icon: SYMPTOM_ICONS.irregularMenstruation,
    label: ["Irregular", "menstruation"],
    tip: "Periods that come rarely, unpredictably or not at all, often because ovulation is irregular.",
  },
  {
    icon: SYMPTOM_ICONS.metabolic,
    label: ["Metabolic", "abnormalities"],
    tip: "Problems with how the body handles sugar and fats, such as insulin resistance and abnormal blood lipids.",
  },
];

// The ring: its radii, and where on it each goes, in degrees clockwise from
// her right, leaving the space over her head (and floating hair) clear.
// Where less of the scene's width is on the screen (`span`, see
// WomenOnLine), narrower, to keep each icon and its label FIT_EDGE in from
// the screen's sides, and taller to make up for it, with labels larger to
// stay legible as the scene's units shrink.
const RX = 300;
const RY = 205;
const FIT_EDGE = 95;
const ANGLES = [-30, 25, 90, 155, 210];
const ICON = 96;
// The least the symptom straight under her sits below her middle, however
// shallow the ring: her feet reach about 90 below it, and half the icon
// and a gap come on top.
const BELOW_HER = 150;
const LABEL_LINE = 18;
const ITEM_W = 200;

// Each icon cropped to a square round its drawing, sized so that the
// drawings cover about the same area (whatever their shape), and so feel
// the same weight: the square's side, in the icon's units, and its line,
// drawn as wide as the women's.
const FILL = 0.8;
const fitted = ({ box: [x, y, w, h], weight = 1 }: SymptomIcon) => {
  const side = Math.sqrt(w * h) / FILL / weight;
  const viewBox = [x + w / 2 - side / 2, y + h / 2 - side / 2, side, side]
    .map((n) => n.toFixed(2))
    .join(" ");
  return { viewBox, line: (LINE * FIGURE_SCALE * side) / ICON };
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function SymptomRing({
  cx,
  cy,
  span,
  depth,
  shown,
}: {
  cx: number;
  cy: number;
  span: number;
  depth: number;
  shown: number;
}) {
  if (!shown) return null;
  const rx = Math.min(RX, span / 2 - FIT_EDGE);
  // Shallower on a short screen, where she is let lower for the text above.
  const ry = (RY + (RX - rx) * 0.8) * depth;
  const labels = Math.max(1, 0.75 * (1200 / span));
  return (
    <g
      className="symptom-ring"
      style={{ "--label-scale": labels.toFixed(3) } as CSSProperties}
    >
      {SYMPTOMS.map(({ icon, label, tip }, i) => {
        const t = smooth(clamp01(shown * SYMPTOMS.length - i));
        if (!t) return null;
        const a = (ANGLES[i] * Math.PI) / 180;
        // Each drifts in a little way out from her as it comes.
        const out = 1 + (1 - t) * 0.12;
        const x = cx + Math.cos(a) * rx * out;
        const down = Math.sin(a) * ry;
        const y = cy + (Math.abs(Math.cos(a)) < 0.3 ? Math.max(down, BELOW_HER) : down) * out;
        const lines = Array.isArray(label) ? label : [label];
        const { viewBox, line } = fitted(icon);
        return (
          <g key={i} opacity={t}>
            <foreignObject
              x={x - ITEM_W / 2}
              y={y - ICON / 2 - 20}
              width={ITEM_W}
              height={ICON + 4 + lines.length * LABEL_LINE * labels}
              className="symptom-ring__item"
            >
              <div className="symptom-ring__stack">
                <Tooltip text={tip}>
                  <svg
                    width={ICON}
                    height={ICON}
                    viewBox={viewBox}
                    className="symptom-ring__icon"
                    style={{ "--icon-line": line.toFixed(3) } as CSSProperties}
                    dangerouslySetInnerHTML={{ __html: icon.markup }}
                  />
                  <span
                    className={`symptom-ring__label${tip ? " symptom-ring__label--tip" : ""}`}
                    style={{ fontSize: `${16 * labels}px` }}
                  >
                    {lines.map((text, j) => (
                      <span key={j}>{text}</span>
                    ))}
                  </span>
                </Tooltip>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
