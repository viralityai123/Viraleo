// =============================================================================
// PM2 Ecosystem File — Production process manager for Viraleo
// =============================================================================
// Usage:  pm2 start deploy/ecosystem.config.cjs
// =============================================================================

module.exports = {
  apps: [
    {
      // ── App identity ──
      name: "viraleo",
      script: ".output/server/index.mjs",

      // ── Execution mode ──
      // Fork mode is safest for Nitro SSR (single process per instance)
      instances: 1,
      exec_mode: "fork",

      // ── Environment variables ──
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },

      // ── Resource protection ──
      // Restart if memory exceeds 2GB (catches memory leaks)
      max_memory_restart: "2G",
      // Max consecutive restarts before PM2 gives up
      max_restarts: 10,
      // Consider process "stable" after 10s uptime
      min_uptime: 10000, // 10 seconds in ms
      // Wait 5s before restarting after a crash
      restart_delay: 5000,

      // ── Logging ──
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/viraleo-error.log",
      out_file: "./logs/viraleo-out.log",
      merge_logs: true,
      // Prefix each log line with timestamp
      time: true,

      // ── Auto-restart ──
      watch: false,
      autorestart: true,
      // Auto-restart app daily at 4:00 AM (clears memory)
      cron_restart: "0 4 * * *",

      // ── Graceful shutdown ──
      // Wait up to 10s for active requests to finish
      kill_timeout: 10000,
      // Wait up to 10s for the server to start listening
      listen_timeout: 10000,
    },
  ],
};
