import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd());
  
  // 获取API和WebSocket服务器地址
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';
  const wsUrl = env.VITE_WS_URL || 'ws://localhost:3001';
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: wsUrl,
          ws: true,
        },
      },
    },
    // 优化构建配置
    build: {
      // 启用源码映射，便于调试
      sourcemap: mode === 'development',
      // 分块策略
      rollupOptions: {
        output: {
          // 手动分块配置
          manualChunks: {
            // 将Vue相关库打包到一起
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            // 将Ant Design Vue相关库打包到一起
            'antd-vendor': ['ant-design-vue', '@ant-design/icons-vue'],
            // 将编辑器相关库打包到一起
            'editor-vendor': [
              '@tiptap/vue-3',
              '@tiptap/starter-kit',
              '@tiptap/extension-collaboration',
              '@tiptap/extension-collaboration-cursor',
              '@tiptap/extension-document',
              '@tiptap/extension-paragraph',
              '@tiptap/extension-text',
              'y-prosemirror',
              'y-websocket',
              'yjs'
            ]
          },
          // 为静态资源添加内容哈希，优化缓存
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      },
      // 设置块大小警告阈值
      chunkSizeWarningLimit: 1000,
      // 压缩选项
      minify: 'terser',
      terserOptions: {
        compress: {
          // 移除console.log
          drop_console: mode === 'production',
          // 移除debugger语句
          drop_debugger: mode === 'production',
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: [
        'vue', 
        'vue-router', 
        'pinia', 
        'ant-design-vue', 
        '@ant-design/icons-vue',
        'axios'
      ]
    }
  };
}); 