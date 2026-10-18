'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ActionButton } from '@keystar/ui/button';
import { Flex } from '@keystar/ui/layout';
import { TextField } from '@keystar/ui/text-field';
import { Text } from '@keystar/ui/typography';
import type { Bubble } from './bubbles-value';

// The figure's own Image URL field is a sibling this field cannot see, so
// the photo is read back from that input in the page. Keystatic gives the
// field's label as the <label>'s text.
function findImageUrl(from: HTMLElement | null): string {
  const root = from?.closest('[role="dialog"], form') ?? document;
  for (const label of root.querySelectorAll('label')) {
    if (!label.textContent?.trim().startsWith('Image URL')) continue;
    const control = label.htmlFor ? document.getElementById(label.htmlFor) : label.querySelector('input');
    if (control instanceof HTMLInputElement && /^https?:\/\//.test(control.value)) return control.value;
  }
  return '';
}

export function BubblesInput({ value, onChange }: { value: Bubble[]; onChange: (value: Bubble[]) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const read = () => setSrc(findImageUrl(rootRef.current));
    read();
    const id = window.setInterval(read, 1000);
    return () => window.clearInterval(id);
  }, []);

  const pointToPercent = (e: PointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const pct = (n: number, size: number) => Math.round(Math.min(100, Math.max(0, (n / size) * 100)) * 10) / 10;
    return { x: pct(e.clientX - rect.left, rect.width), y: pct(e.clientY - rect.top, rect.height) };
  };

  const update = (i: number, patch: Partial<Bubble>) =>
    onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <Flex direction="column" gap="regular">
      <div ref={rootRef}>
        <Text>
          Click the photo to add a bubble, drag a bubble to move it. Fill in the Image URL above first.
        </Text>
      </div>
      {src ? (
        <div
          ref={stageRef}
          style={{ position: 'relative', width: 'fit-content', maxWidth: '100%', cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget && !(e.target instanceof HTMLImageElement)) return;
            onChange([...value, { name: '', url: '', ...pointToPercent(e) }]);
            setSelected(value.length);
          }}
        >
          <img src={src} alt="" draggable={false} style={{ display: 'block', maxWidth: '100%', maxHeight: 420 }} />
          {value.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Bubble ${i + 1}${b.name ? `: ${b.name}` : ''}`}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                top: `${b.y}%`,
                transform: 'translate(-50%, -100%)',
                minWidth: 26,
                height: 26,
                borderRadius: 13,
                border: '2px solid #004747',
                background: selected === i ? '#7e0c28' : '#e8f4f4',
                color: selected === i ? '#fff' : '#004747',
                font: '600 12px sans-serif',
                cursor: 'grab',
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                dragging.current = i;
                moved.current = false;
                setSelected(i);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragging.current !== i) return;
                moved.current = true;
                update(i, pointToPercent(e));
              }}
              onPointerUp={() => {
                dragging.current = null;
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
      {value.map((b, i) => (
        <Flex key={i} gap="regular" alignItems="end" UNSAFE_style={selected === i ? { outline: '2px solid #7e0c28', padding: 4 } : { padding: 4 }}>
          <TextField label={`${i + 1}. Name`} value={b.name} onChange={(name) => update(i, { name })} onFocus={() => setSelected(i)} />
          <TextField
            label="Spotify episode link"
            value={b.url}
            onChange={(url) => update(i, { url })}
            onFocus={() => setSelected(i)}
            flex
          />
          <ActionButton
            onPress={() => {
              onChange(value.filter((_, j) => j !== i));
              setSelected(null);
            }}
          >
            <Text>Remove</Text>
          </ActionButton>
        </Flex>
      ))}
    </Flex>
  );
}
