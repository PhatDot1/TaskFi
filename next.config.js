/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification to avoid Terser crashing on worker code
  swcMinify: false,

  // Remove or comment out the 'output: "export"' line
  // output: "export", // <-- Removed

  experimental: {
    // App router is enabled by default in recent Next.js versions,
    // so you can leave this empty or remove it entirely if unused
  },

  images: {
    unoptimized: true, // Useful if you were using static export
  },
};

module.exports = nextConfig;
