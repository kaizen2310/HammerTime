import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

connection.on('error', (err) => {
  console.error('BullMQ Redis connection error:', err.message)
})

connection.on('connect', () => {
  console.log('BullMQ Redis connection established')
})

export default connection