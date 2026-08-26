/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@devigo/i18n', '@devigo/ui'],
  webpack: (config) => {
    // Workspace packages use NodeNext-style ".js" specifiers in TS source.
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};

export default nextConfig;
