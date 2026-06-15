/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // static export -> out/ for Amplify Hosting manual deploy
  trailingSlash: true,
  images: { unoptimized: true },
};
module.exports = nextConfig;
