/**
 * PM2 Ecosystem Configuration — Qubolt Production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
    apps: [
        {
            name: 'quiz-server',
            script: './server/server.js',
            instances: 'max',              // One per CPU core
            exec_mode: 'cluster',
            watch: false,
            env_production: {
                NODE_ENV: 'production',
                SERVICE_NAME: 'quiz-server',
                LOG_LEVEL: 'info',
                // Subscription/retry jobs should only run on ONE instance in cluster
                SUBSCRIPTION_JOBS_ENABLED: 'false',
            },
            // Log management
            log_file: './logs/quiz-server-combined.log',
            out_file: './logs/quiz-server-out.log',
            error_file: './logs/quiz-server-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '512M',
            // Restart policy
            restart_delay: 2000,
            max_restarts: 10,
            min_uptime: '10s',
            // Graceful shutdown
            kill_timeout: 12000,
            listen_timeout: 8000,
        },
        {
            name: 'quiz-server-job-runner',
            script: './server/server.js',
            instances: 1,                  // Only ONE instance runs background jobs
            exec_mode: 'fork',
            watch: false,
            env_production: {
                NODE_ENV: 'production',
                SERVICE_NAME: 'quiz-server-jobs',
                LOG_LEVEL: 'info',
                SUBSCRIPTION_JOBS_ENABLED: 'true',
            },
            log_file: './logs/quiz-server-jobs-combined.log',
            out_file: './logs/quiz-server-jobs-out.log',
            error_file: './logs/quiz-server-jobs-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '256M',
            restart_delay: 5000,
            max_restarts: 5,
        },
        {
            name: 'payment-service',
            script: './payment-service/server.js',
            instances: 2,
            exec_mode: 'cluster',
            watch: false,
            env_production: {
                NODE_ENV: 'production',
                SERVICE_NAME: 'payment-service',
                LOG_LEVEL: 'info',
                // Only ONE instance should run jobs to avoid duplicate retries
                SUBSCRIPTION_JOBS_ENABLED: 'false',
                FAILED_JOB_WORKER_ENABLED: 'false',
            },
            log_file: './logs/payment-service-combined.log',
            out_file: './logs/payment-service-out.log',
            error_file: './logs/payment-service-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '256M',
            restart_delay: 3000,
            max_restarts: 10,
            min_uptime: '10s',
            kill_timeout: 12000,
        },
        {
            name: 'payment-service-job-runner',
            script: './payment-service/server.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env_production: {
                NODE_ENV: 'production',
                SERVICE_NAME: 'payment-service-jobs',
                LOG_LEVEL: 'info',
                SUBSCRIPTION_JOBS_ENABLED: 'true',
                FAILED_JOB_WORKER_ENABLED: 'true',
            },
            log_file: './logs/payment-jobs-combined.log',
            out_file: './logs/payment-jobs-out.log',
            error_file: './logs/payment-jobs-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '256M',
            restart_delay: 5000,
            max_restarts: 5,
        },
    ],
};
