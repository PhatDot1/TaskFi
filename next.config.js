/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove or comment out the 'output: "export"' line
  // output: "export", // <-- Remove this line
  
  // Keep other configurations you might have
  experimental: {
    appDir: true,
  },
  
  // If you have other settings, keep them
  images: {
    unoptimized: true, // You might need this if you were using static export
  },
}

module.exports = nextConfig