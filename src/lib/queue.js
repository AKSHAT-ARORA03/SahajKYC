/**
 * Background Job Queue System
 * 
 * Handles async processing for KYC operations:
 * - Document OCR processing
 * - Face verification jobs
 * - Setu DigiLocker data fetching
 * - Offline sync processing
 * - Cleanup and maintenance tasks
 * 
 * @author KYC Backend Team
 */

import Bull from 'bull';
import Redis from 'ioredis';
import { logger } from './logger.js';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  lazyConnect: true
};

// Use Upstash Redis if configured (for serverless)
if (process.env.UPSTASH_REDIS_REST_URL) {
  redisConfig.host = new URL(process.env.UPSTASH_REDIS_REST_URL).hostname;
  redisConfig.port = new URL(process.env.UPSTASH_REDIS_REST_URL).port;
  redisConfig.password = process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Queue Manager Class
 */
class QueueManager {
  constructor() {
    this.redis = new Redis(redisConfig);
    this.queues = new Map();
    this.processors = new Map();
    
    this.setupQueues();
    this.setupEventHandlers();
  }

  /**
   * Setup different queues for different job types
   */
  setupQueues() {
    // Document processing queue (OCR, validation)
    this.queues.set('document-processing', new Bull('document-processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    // Face verification queue (async processing)
    this.queues.set('face-verification', new Bull('face-verification', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }));

    // Setu DigiLocker queue (data fetching)
    this.queues.set('setu-digilocker', new Bull('setu-digilocker', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }));

    // Sync processing queue (offline sync)
    this.queues.set('sync-processing', new Bull('sync-processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      },
    }));

    // Notification queue (emails, SMS)
    this.queues.set('notifications', new Bull('notifications', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      },
    }));

    // Cleanup queue (maintenance tasks)
    this.queues.set('cleanup', new Bull('cleanup', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 2,
        repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
      },
    }));

    logger.info('Queue manager initialized', {
      queues: Array.from(this.queues.keys()),
      redisHost: redisConfig.host,
      redisPort: redisConfig.port
    });
  }

  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    for (const [name, queue] of this.queues) {
      queue.on('completed', (job, result) => {
        logger.info('Job completed', {
          queue: name,
          jobId: job.id,
          jobType: job.name,
          duration: Date.now() - job.timestamp,
          result: typeof result === 'object' ? result.success : result
        });
      });

      queue.on('failed', (job, err) => {
        logger.error('Job failed', {
          queue: name,
          jobId: job.id,
          jobType: job.name,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          error: err.message,
          stack: err.stack
        });
      });

      queue.on('stalled', (job) => {
        logger.warn('Job stalled', {
          queue: name,
          jobId: job.id,
          jobType: job.name
        });
      });

      queue.on('progress', (job, progress) => {
        logger.debug('Job progress', {
          queue: name,
          jobId: job.id,
          jobType: job.name,
          progress: progress
        });
      });
    }
  }

  /**
   * Add a job to a specific queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const job = await queue.add(jobType, data, {
        ...options,
        timestamp: Date.now(),
      });

      logger.info('Job added to queue', {
        queue: queueName,
        jobId: job.id,
        jobType: jobType,
        priority: options.priority || 0,
        delay: options.delay || 0
      });

      return job;
    } catch (error) {
      logger.error('Failed to add job to queue', {
        queue: queueName,
        jobType: jobType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process jobs in a queue
   */
  async processQueue(queueName, processor, concurrency = 1) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      // Store processor for later reference
      this.processors.set(queueName, processor);

      // Start processing
      queue.process('*', concurrency, async (job) => {
        logger.info('Processing job', {
          queue: queueName,
          jobId: job.id,
          jobType: job.name,
          attempts: job.attemptsMade + 1
        });

        try {
          const result = await processor(job);
          return result;
        } catch (error) {
          logger.error('Job processing failed', {
            queue: queueName,
            jobId: job.id,
            jobType: job.name,
            error: error.message
          });
          throw error;
        }
      });

      logger.info('Queue processor started', {
        queue: queueName,
        concurrency: concurrency
      });

    } catch (error) {
      logger.error('Failed to start queue processor', {
        queue: queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
        queue.getPaused()
      ]);

      return {
        queue: queueName,
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          paused: paused.length
        },
        jobs: {
          waiting: waiting.slice(0, 5).map(job => ({ id: job.id, name: job.name })),
          active: active.slice(0, 5).map(job => ({ id: job.id, name: job.name })),
          failed: failed.slice(0, 5).map(job => ({ 
            id: job.id, 
            name: job.name, 
            error: job.failedReason 
          }))
        }
      };
    } catch (error) {
      logger.error('Failed to get queue stats', {
        queue: queueName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = {};
    for (const queueName of this.queues.keys()) {
      try {
        stats[queueName] = await this.getQueueStats(queueName);
      } catch (error) {
        stats[queueName] = { error: error.message };
      }
    }
    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    logger.info('Queue paused', { queue: queueName });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    logger.info('Queue resumed', { queue: queueName });
  }

  /**
   * Clean up completed/failed jobs
   */
  async cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) { // 24 hours default
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const cleaned = await queue.clean(grace, 'completed');
    const cleanedFailed = await queue.clean(grace, 'failed');

    logger.info('Queue cleaned', {
      queue: queueName,
      completedCleaned: cleaned.length,
      failedCleaned: cleanedFailed.length,
      graceHours: grace / (60 * 60 * 1000)
    });

    return cleaned.length + cleanedFailed.length;
  }

  /**
   * Health check for queue system
   */
  async healthCheck() {
    try {
      // Test Redis connection
      await this.redis.ping();

      // Get basic stats
      const stats = await this.getAllQueueStats();
      
      // Check for unhealthy conditions
      const issues = [];
      for (const [queueName, queueStats] of Object.entries(stats)) {
        if (queueStats.error) {
          issues.push(`${queueName}: ${queueStats.error}`);
        } else if (queueStats.counts.failed > 100) {
          issues.push(`${queueName}: Too many failed jobs (${queueStats.counts.failed})`);
        } else if (queueStats.counts.waiting > 1000) {
          issues.push(`${queueName}: Too many waiting jobs (${queueStats.counts.waiting})`);
        }
      }

      return {
        healthy: issues.length === 0,
        issues: issues,
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Queue health check failed', {
        error: error.message
      });
      
      return {
        healthy: false,
        issues: [error.message],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down queue manager...');
    
    // Close all queues
    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        logger.info('Queue closed', { queue: name });
      } catch (error) {
        logger.error('Error closing queue', { queue: name, error: error.message });
      }
    }

    // Close Redis connection
    try {
      await this.redis.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error.message });
    }
  }
}

// Create singleton instance
const queueManager = new QueueManager();

// Export convenience functions
export const addJob = (queueName, jobType, data, options) => 
  queueManager.addJob(queueName, jobType, data, options);

export const processQueue = (queueName, processor, concurrency) => 
  queueManager.processQueue(queueName, processor, concurrency);

export const getQueueStats = (queueName) => 
  queueManager.getQueueStats(queueName);

export const getAllQueueStats = () => 
  queueManager.getAllQueueStats();

export const pauseQueue = (queueName) => 
  queueManager.pauseQueue(queueName);

export const resumeQueue = (queueName) => 
  queueManager.resumeQueue(queueName);

export const cleanQueue = (queueName, grace) => 
  queueManager.cleanQueue(queueName, grace);

export const queueHealthCheck = () => 
  queueManager.healthCheck();

export { queueManager };
export default queueManager;
