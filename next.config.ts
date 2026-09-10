import type { NextConfig } from 'next';

const isProductionExport = process.env.BUILD_TARGET === 'production';

const nextConfig: NextConfig = {
  output: isProductionExport ? 'export' : undefined,
  // iGEM serves the published export at https://2026.igem.wiki/lund/, not
  // at that domain's root — without this, every generated asset URL and
  // internal link is root-relative and 404s once live. Must stay unset for
  // staging, which serves from wiki.igemlund.org's root.
  basePath: isProductionExport ? '/lund' : undefined,
  assetPrefix: isProductionExport ? '/lund' : undefined,
  // Content images are always external static.igem.wiki URLs rendered via
  // plain <img> in content components — Image Optimization is a server-only
  // runtime feature that provides no value here and must be off for export.
  images: { unoptimized: true },
  // trailingSlash is required for the production static export so igem.wiki's
  // directory-style static hosting resolves `/team/` to `/team/index.html`.
  // It MUST stay off for dev/staging, where the Keystatic admin runs: with it
  // on, Next 308-redirects every `/api/keystatic/*` request (adding a trailing
  // slash), which breaks Keystatic's GitHub OAuth login/callback round-trip —
  // Keystatic's redirect_uri is registered without a trailing slash and it does
  // not support trailingSlash. Keystatic is stripped from the production build,
  // so scoping this flag to the export target fixes login with no prod impact.
  trailingSlash: isProductionExport,
};

export default nextConfig;
