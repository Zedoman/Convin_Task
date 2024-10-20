const { createClient } = require('redis');

const redisClient = createClient({
  password: 'tjtxDm4iSI0iC8LpVOu2BgMEnuAlwpw5',
  socket: {
    host: 'redis-17997.c301.ap-south-1-1.ec2.redns.redis-cloud.com',
    port: 17997,
  },
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis error: ', err);
});

// Connect to Redis server
redisClient.connect();

module.exports = redisClient;
