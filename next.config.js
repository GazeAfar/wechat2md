/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除已废弃的 appDir 配置，Next.js 14 默认启用 app 目录
  images: {
    domains: ['mmbiz.qpic.cn', 'mp.weixin.qq.com'],
    unoptimized: true
  },
  // 启用 SWC 编译器优化
  swcMinify: true,
  // 启用实验性功能以提升性能
  experimental: {
    // 启用 Turbo 模式（如果可用）
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig