'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, PersonStanding, RotateCcw, Sun } from 'lucide-react';

// 'system' follows the OS light/dark preference (the default); light and
// dark are explicit overrides. data-theme on <html> always holds the
// resolved 'light' or 'dark', so the CSS never has to know about 'system'.
type Theme = 'system' | 'light' | 'dark';
type FontSize = 'default' | 'large' | 'larger';

// Every chip reads "A" (drawn bigger each step), so each needs a spoken
// name of its own.
const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

const DARK_QUERY = '(prefers-color-scheme: dark)';

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

const FONT_SIZES: { value: FontSize; label: string; name: string }[] = [
  { value: 'default', label: 'A', name: 'Default text size' },
  { value: 'large', label: 'A', name: 'Large text size' },
  { value: 'larger', label: 'A', name: 'Larger text size' },
];

// Every setting mirrors onto a data-* attribute on <html> (same pattern the
// old theme-toggle used for data-theme) so plain CSS can react to it, and
// into localStorage under its own key so the blocking init script in the
// root layout can apply it before first paint; see themeInitScript in
// src/app/layout.tsx, which this component's storage keys/values must stay
// in sync with.
//
// A disclosure, not an ARIA menu: role="menu" promises arrow-key navigation
// and focus moving into the panel, while this is a short panel of settings
// right after its button in the tab order. The on/off settings are switches
// and the theme and text sizes are toggle-button groups; the panel closes on Esc (focus
// back on the badge), on a click outside, or when focus tabs out of it.
export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wideSpacing, setWideSpacing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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
    setWideSpacing(localStorage.getItem('a11y-spacing') === 'wide');
  }, []);

  // While following the system, track OS changes live (e.g. an automatic
  // switch to dark at sunset), not just the preference at page load.
  useEffect(() => {
    if (theme !== 'system') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        if (panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function changeTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
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

  function toggleWideSpacing() {
    const next = !wideSpacing;
    setWideSpacing(next);
    localStorage.setItem('a11y-spacing', next ? 'wide' : 'default');
    document.documentElement.setAttribute('data-spacing', next ? 'wide' : 'default');
  }

  // Back to a first visit: every key removed (so the theme follows the
  // system again) and every attribute cleared or re-resolved.
  function resetAll() {
    for (const key of ['theme', 'a11y-font', 'a11y-font-size', 'a11y-motion', 'a11y-spacing']) {
      localStorage.removeItem(key);
    }
    const root = document.documentElement;
    for (const attr of ['data-font', 'data-font-size', 'data-motion', 'data-spacing']) {
      root.removeAttribute(attr);
    }
    setTheme('system');
    applyTheme('system');
    setDyslexicFont(false);
    setFontSize('default');
    setReduceMotion(false);
    setWideSpacing(false);
  }

  const isDefault = theme === 'system' && !dyslexicFont && fontSize === 'default' && !reduceMotion && !wideSpacing;

  return (
    <div
      className="site__a11y"
      ref={panelRef}
      onBlur={(event) => {
        // relatedTarget is null when a click lands on the panel's own
        // background (or the window loses focus); outside clicks are
        // already handled by the pointerdown listener.
        const next = event.relatedTarget;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={toggleRef}
        className="site__a11y-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Accessibility options"
      >
        <PersonStanding size={18} />
      </button>
      {open && (
        <div id="a11y-panel" className="site__a11y-panel">
          <div className="site__a11y-group" role="group" aria-labelledby="a11y-label-appearance">
            <span className="site__a11y-label" id="a11y-label-appearance">
              Appearance
            </span>
            <div className="site__a11y-sizes">
              {THEMES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  className="site__a11y-size site__a11y-size--theme"
                  onClick={() => changeTheme(value)}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="site__a11y-group" role="group" aria-labelledby="a11y-label-reading">
            <span className="site__a11y-label" id="a11y-label-reading">
              Reading
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={dyslexicFont}
              className="site__a11y-option"
              onClick={toggleDyslexicFont}
            >
              Dyslexia-friendly font
              <span className="site__a11y-switch" data-on={dyslexicFont} />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={wideSpacing}
              className="site__a11y-option"
              onClick={toggleWideSpacing}
            >
              Comfortable spacing
              <span className="site__a11y-switch" data-on={wideSpacing} />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={reduceMotion}
              className="site__a11y-option"
              onClick={toggleReduceMotion}
            >
              Reduce motion
              <span className="site__a11y-switch" data-on={reduceMotion} />
            </button>
          </div>

          <div className="site__a11y-group">
            <span className="site__a11y-label" id="a11y-label-size">
              Text size
            </span>
            <div className="site__a11y-sizes" role="group" aria-labelledby="a11y-label-size">
              {FONT_SIZES.map(({ value, label, name }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={fontSize === value}
                  aria-label={name}
                  className="site__a11y-size"
                  data-size={value}
                  onClick={() => changeFontSize(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* aria-disabled rather than disabled, so pressing it doesn't drop
              keyboard focus out of the panel as the button disables itself. */}
          <button
            type="button"
            className="site__a11y-reset"
            onClick={isDefault ? undefined : resetAll}
            aria-disabled={isDefault}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
