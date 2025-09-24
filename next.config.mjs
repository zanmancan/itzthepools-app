// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Redirect old singular paths to the new plural ones.
  // Next returns a 308 Permanent Redirect (SEO-friendly & cacheable).
  async redirects() {
    return [
      // /league/:leagueId  ->  /leagues/:leagueId
      {
        source: "/league/:leagueId",
        destination: "/leagues/:leagueId",
        permanent: true,
      },
      // If you ever had nested paths under /league/:id/*
      {
        source: "/league/:leagueId/:path*",
        destination: "/leagues/:leagueId/:path*",
        permanent: true,
      },
      // If you linked to "new" on the singular path anywhere
      {
        source: "/league/new",
        destination: "/leagues/new",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
