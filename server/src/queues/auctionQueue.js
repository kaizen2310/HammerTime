import { Queue } from 'bullmq'
import connection from '../lib/redisConnection.js'

export const auctionQueue = new Queue('auction-expiry', { connection })

export const scheduleAuctionEnd = async (auctionId, endsAt) => {
  const delay = new Date(endsAt).getTime() - Date.now()

  await auctionQueue.add(
    'end-auction',
    { auctionId },
    {
      delay: Math.max(delay, 0),
      jobId: auctionId.toString(),
    }
  )
}