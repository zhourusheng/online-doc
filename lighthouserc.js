module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm run preview', // 根据你的项目调整预览命令
      url: ['http://localhost:4173/'], // 本地预览URL，根据实际调整
      numberOfRuns: 3, // 运行次数
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', {maxNumericValue: 1000}], // FCP < 1s
        'total-blocking-time': ['error', {maxNumericValue: 200}],   // TBT < 200ms
        'interactive': ['warn', {maxNumericValue: 3000}],
        'largest-contentful-paint': ['warn', {maxNumericValue: 2500}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}; 