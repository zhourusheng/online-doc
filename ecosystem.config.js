module.exports = {
  apps: [{
    name: 'online-doc-backend',
    script: '/var/www/online-doc/backend/dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      MONGODB_URI: 'mongodb://localhost:27017/online-doc',
      JWT_SECRET: '$(grep JWT_SECRET /var/www/online-doc/backend/.env | cut -d= -f2)'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048' // 为Node.js增加内存限制
  }]
};