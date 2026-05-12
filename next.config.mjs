/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  async redirects() {
    const screens = ['generate', 'story', 'history', 'usage', 'logs', 'settings'];
    return screens.map(s => ({
      source: `/${s}`,
      destination: `/#${s}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
