/** @type {import('next').NextConfig} */

// GitHub Pages serves a project site from https://<owner>.github.io/<repo>/, so
// every asset and link needs that prefix. Left empty for local dev and for the
// Actions route, where actions/configure-pages injects it from the repo name.
//   BASE_PATH=/catalogue-of-api-solutions npm run build
const basePath = process.env.BASE_PATH ?? '';

const nextConfig = {
  // Emit a folder of plain HTML/CSS/JS instead of running a server.
  output: 'export',
  basePath,
  // No server to optimise images on a static host.
  images: {unoptimized: true},
  // Pages serves /foo as /foo/index.html, so emit directory-style routes.
  trailingSlash: true,
};

export default nextConfig;
