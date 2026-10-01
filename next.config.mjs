/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sql.js'],
  outputFileTracingIncludes: {
    '/**': ['./public/sql-wasm.wasm', './node_modules/sql.js/dist/sql-wasm.wasm'],
  },
};

export default nextConfig;
