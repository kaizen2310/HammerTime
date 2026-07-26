import { Worker } from 'bullmq'
import connection from '../lib/redisConnection.js'
import Auction from '../models/Auction.js'

export const startAuctionWorker = (io) => {
  const worker = new Worker(
    'auction-expiry',
    async (job) => {
      const { auctionId } = job.data

      const auction = await Auction.findById(auctionId).populate('currentWinnerId', 'username')

      if (!auction || auction.status !== 'active') {
        return
      }

      auction.status = 'ended'
      await auction.save()

      io.to(auctionId).emit('auction_ended', {
        finalBid: auction.currentBid,
        winnerUsername: auction.currentWinnerId?.username || null,
      })

      console.log(`Auction ${auctionId} ended. Winner: ${auction.currentWinnerId?.username || 'none'}`)
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    console.error(`Auction expiry job ${job?.id} failed:`, err.message)
  })

  return worker
}