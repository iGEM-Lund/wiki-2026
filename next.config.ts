import type { NextConfig } from 'next';

const isProductionExport = process.env.BUILD_TARGET === 'production';
const basePath = isProductionExport ? '/lund' : '';
// GitLab sets CI=true. iGEM's runner kills a job after 10 minutes and is slow
// enough that type-checking and linting during `next build` can tip it over.
// Both already ran in scripts/deploy-production.sh's local pre-flight build
// (which has no CI set) on the exact tree being published, so skip them there.
const skipChecks = process.env.CI === 'true' && isProductionExport;

const nextConfig: NextConfig = {
  output: isProductionExport ? 'export' : undefined,
  // iGEM serves the published export at https://2026.igem.wiki/lund/, not
  // at that domain's root; without this, every generated asset URL and
  // internal link is root-relative and 404s once live. Must stay unset for
  // staging, which serves from wiki.igemlund.org's root.
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // next/link applies basePath on its own, but a plain fetch() doesn't;
  // site search reads this to find its index file (site-search.tsx).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Content images are always external static.igem.wiki URLs rendered via
  // plain <img> in content components; Image Optimization is a server-only
  // runtime feature that provides no value here and must be off for export.
  images: { unoptimized: true },
  // trailingSlash is required for the production static export so igem.wiki's
  // directory-style static hosting resolves `/team/` to `/team/index.html`.
  // It MUST stay off for dev/staging, where the Keystatic admin runs: with it
  // on, Next 308-redirects every `/api/keystatic/*` request (adding a trailing
  // slash), which breaks Keystatic's GitHub OAuth login/callback round-trip:
  // Keystatic's redirect_uri is registered without a trailing slash and it does
  // not support trailingSlash. Keystatic is stripped from the production build,
  // so scoping this flag to the export target fixes login with no prod impact.
  trailingSlash: isProductionExport,
  typescript: { ignoreBuildErrors: skipChecks },
  eslint: { ignoreDuringBuilds: skipChecks },
  // The static export never ships server code, so minifying the server bundle
  // is pure build time (about 20% of a build on a single core, more on iGEM's
  // slow runner, which is close to its 10 minute limit).
  experimental: { serverMinification: false },
  // On that runner the first pages can take over the default 60 seconds, and
  // each timeout throws the attempt away and starts it again.
  staticPageGenerationTimeout: 180,
  // Dev-only badge; its default bottom-left corner covers the accessibility
  // button at the foot of the nav sidebar.
  devIndicators: { position: 'top-right' },
};

export default nextConfig;
