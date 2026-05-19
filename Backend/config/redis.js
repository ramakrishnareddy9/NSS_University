const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = createClient({ url: REDIS_URL });
client.on('error', (err) => console.error('Redis Client Error', err));

let connected = false;
(async () => {
  try {
    await client.connect();
    connected = true;
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️ Redis connection failed:', err.message);
  }
})();

async function get(key) {
  if (!connected) return null;
  return client.get(key);
}

async function setEx(key, ttlSeconds, value) {
  if (!connected) return null;
  return client.setEx(key, ttlSeconds, value);
}

async function del(key) {
  if (!connected) return null;
  return client.del(key);
}

async function purgePattern(pattern) {
  if (!connected) return 0;
  const keys = [];
  for await (const k of client.scanIterator({ MATCH: pattern })) {
    keys.push(k);
  }
  if (keys.length === 0) return 0;
  return client.del(keys);
}

module.exports = {
  client,
  get,
  setEx,
  del,
  purgePattern
};
