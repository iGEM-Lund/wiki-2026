import type { ReactNode } from 'react';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata = {
  title: 'iGEM Lund 2026 Wiki',
};

// Blocking script so stored accessibility choices (theme, dyslexia-friendly
// font, text size, reduced motion, spacing) apply before first paint; without it the
// page would flash the defaults, then swap once accessibility-menu.tsx's
// effect runs. Storage keys/values here must stay in sync with that file.
// A theme other than an explicit 'light'/'dark' (unset, or 'system') follows
// the OS preference.
const themeInitScript = `(function(){try{
  var t=localStorage.getItem('theme');
  if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  document.documentElement.setAttribute('data-theme',t);
  var f=localStorage.getItem('a11y-font');
  if(f==='dyslexic'){document.documentElement.setAttribute('data-font',f);}
  var s=localStorage.getItem('a11y-font-size');
  if(s==='large'||s==='larger'){document.documentElement.setAttribute('data-font-size',s);}
  var m=localStorage.getItem('a11y-motion');
  if(m==='reduce'){document.documentElement.setAttribute('data-motion',m);}
  var p=localStorage.getItem('a11y-spacing');
  if(p==='wide'){document.documentElement.setAttribute('data-spacing',p);}
}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
