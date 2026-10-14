import type { CSSProperties } from 'react';
import { FIGURE_SCALE, LINE } from '@/lib/women-on-line';
import { SYMPTOM_ICONS, type SymptomIcon } from './symptom-icons';

// The home scene's symptoms beat: the five symptoms of androgen excess, from
// the wiki design, coming in one by one in a ring round her as she floats.
// Drawn inside the scene's SVG, in its units, so they stay round her.

const SYMPTOMS = [
  { icon: SYMPTOM_ICONS.hirsutism, label: 'Hirsutism' },
  { icon: SYMPTOM_ICONS.acne, label: 'Acne & oily skin' },
  { icon: SYMPTOM_ICONS.hairLoss, label: ['Female-pattern', 'hair loss'] },
  { icon: SYMPTOM_ICONS.irregularMenstruation, label: ['Irregular', 'menstruation'] },
  { icon: SYMPTOM_ICONS.metabolic, label: ['Metabolic', 'abnormalities'] },
];

// The ring: its radii, and where on it each goes, in degrees clockwise from
// her right, leaving the space over her head (and floating hair) clear.
const RX = 300;
const RY = 205;
const ANGLES = [-30, 25, 90, 155, 210];
const ICON = 96;
const LABEL_LINE = 18;

// Each icon cropped to a square round its drawing, sized so that the
// drawings cover about the same area (whatever their shape), and so feel
// the same weight: the square's side, in the icon's units, and its line,
// drawn as wide as the women's.
const FILL = 0.8;
const fitted = ({ box: [x, y, w, h], weight = 1 }: SymptomIcon) => {
  const side = Math.sqrt(w * h) / FILL / weight;
  const viewBox = [x + w / 2 - side / 2, y + h / 2 - side / 2, side, side].map((n) => n.toFixed(2)).join(' ');
  return { viewBox, line: (LINE * FIGURE_SCALE * side) / ICON };
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function SymptomRing({ cx, cy, shown }: { cx: number; cy: number; shown: number }) {
  if (!shown) return null;
  return (
    <g className="symptom-ring">
      {SYMPTOMS.map(({ icon, label }, i) => {
        const t = smooth(clamp01(shown * SYMPTOMS.length - i));
        if (!t) return null;
        const a = (ANGLES[i] * Math.PI) / 180;
        // Each drifts in a little way out from her as it comes.
        const out = 1 + (1 - t) * 0.12;
        const x = cx + Math.cos(a) * RX * out;
        const y = cy + Math.sin(a) * RY * out;
        const lines = Array.isArray(label) ? label : [label];
        const { viewBox, line } = fitted(icon);
        return (
          <g key={i} opacity={t}>
            <svg
              x={x - ICON / 2}
              y={y - ICON / 2 - 20}
              width={ICON}
              height={ICON}
              viewBox={viewBox}
              className="symptom-ring__icon"
              style={{ '--icon-line': line.toFixed(3) } as CSSProperties}
              dangerouslySetInnerHTML={{ __html: icon.markup }}
            />
            <text className="symptom-ring__label" x={x} y={y + ICON / 2 + 6}>
              {lines.map((line, j) => (
                <tspan key={j} x={x} dy={j ? LABEL_LINE : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </g>
  );
}
