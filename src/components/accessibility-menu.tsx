'use client';

import { useEffect, useRef, useState } from 'react';
import { Moon, PersonStanding, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
type FontSize = 'default' | 'large' | 'larger';

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'default', label: 'A' },
  { value: 'large', label: 'A' },
  { value: 'larger', label: 'A' },
];

// Every setting mirrors onto a data-* attribute on <html> (same pattern the
// old theme-toggle used for data-theme) so plain CSS can react to it, and
// into localStorage under its own key so the blocking init script in the
// root layout can apply it before first paint; see themeInitScript in
// src/app/layout.tsx, which this component's storage keys/values must stay
// in sync with.
export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [reduceMotion, setReduceMotion] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    }
    setDyslexicFont(localStorage.getItem('a11y-font') === 'dyslexic');
    const storedSize = localStorage.getItem('a11y-font-size');
    if (storedSize === 'large' || storedSize === 'larger') {
      setFontSize(storedSize);
    }
    setReduceMotion(localStorage.getItem('a11y-motion') === 'reduce');
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function toggleDyslexicFont() {
    const next = !dyslexicFont;
    setDyslexicFont(next);
    localStorage.setItem('a11y-font', next ? 'dyslexic' : 'default');
    document.documentElement.setAttribute('data-font', next ? 'dyslexic' : 'default');
  }

  function changeFontSize(next: FontSize) {
    setFontSize(next);
    localStorage.setItem('a11y-font-size', next);
    document.documentElement.setAttribute('data-font-size', next);
  }

  function toggleReduceMotion() {
    const next = !reduceMotion;
    setReduceMotion(next);
    localStorage.setItem('a11y-motion', next ? 'reduce' : 'no-preference');
    document.documentElement.setAttribute('data-motion', next ? 'reduce' : 'no-preference');
  }

  return (
    <div className="site__a11y" ref={panelRef}>
      <button
        type="button"
        className="site__a11y-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Accessibility options"
      >
        <PersonStanding size={18} />
      </button>
      {open && (
        <div id="a11y-panel" role="menu" className="site__a11y-panel">
          <div className="site__a11y-group">
            <span className="site__a11y-label">Appearance</span>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={theme === 'dark'}
              className="site__a11y-option"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>

          <div className="site__a11y-group">
            <span className="site__a11y-label">Reading</span>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={dyslexicFont}
              className="site__a11y-option"
              onClick={toggleDyslexicFont}
            >
              Dyslexia-friendly font
              <span className="site__a11y-switch" data-on={dyslexicFont} />
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={reduceMotion}
              className="site__a11y-option"
              onClick={toggleReduceMotion}
            >
              Reduce motion
              <span className="site__a11y-switch" data-on={reduceMotion} />
            </button>
          </div>

          <div className="site__a11y-group">
            <span className="site__a11y-label">Text size</span>
            <div className="site__a11y-sizes" role="group" aria-label="Text size">
              {FONT_SIZES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={fontSize === value}
                  className="site__a11y-size"
                  data-size={value}
                  onClick={() => changeFontSize(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
