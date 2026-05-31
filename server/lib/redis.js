import Redis from 'ioredis';

let redis;

export function getRedis() {
  if (!redis) {
    const url = process.env.REDIS_URL?.startsWith('redis')
      ? process.env.REDIS_URL
      : `redis:${process.env.REDIS_URL}`;
    redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });
    redis.on('error', (err) => console.error('[Redis]', err.message));
  }
  return redis;
}
