module.exports = {
  apps: [
    {
      name: 'sdp-tools',
      script: 'server/dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      watch: false,
      max_memory_restart: '300M',
      out_file: 'server/logs/pm2-out.log',
      error_file: 'server/logs/pm2-error.log',
      merge_logs: true,
      time: true
    }
  ]
};
