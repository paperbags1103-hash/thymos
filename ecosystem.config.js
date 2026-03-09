// Update cwd to your actual Thymos directory before running.
// autorestart: true means pm2 will restart Thymos if it crashes.
// This does NOT add Thymos to system startup; run `pm2 startup` separately if desired.
module.exports = {
  apps: [
    {
      name: 'thymos',
      script: './src/daemon.js',
      cwd: '/path/to/thymos', // <-- update this to your actual path
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Seoul',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
