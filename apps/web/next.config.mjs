/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "*.github.dev",
    "*.app.github.dev",
    "*.githubpreview.dev",
    "*.app.githubpreview.dev"
  ],
  experimental: {
    typedRoutes: false,
    serverActions: {
      allowedOrigins: [
        "localhost",
        "localhost:3000",
        "127.0.0.1",
        "127.0.0.1:3000",
        "refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev",
        "*.github.dev",
        "*.app.github.dev",
        "*.githubpreview.dev",
        "*.app.githubpreview.dev"
      ]
    }
  }
};

export default nextConfig;
