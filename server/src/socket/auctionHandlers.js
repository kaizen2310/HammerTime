import Auction from '../models/Auction.js'
import Bid from '../models/Bid.js'

export const registerAuctionHandlers = (io, socket) => {
  socket.on('place_bid', async ({ auctionId, amount }) => {
    try {
      const updatedAuction = await Auction.findOneAndUpdate(
        {
          _id: auctionId,
          status: 'active',
          endsAt: { $gt: new Date() },
          sellerId: { $ne: socket.user.id },
          $expr: {
            $lt: [{ $ifNull: ['$currentBid', '$startingPrice'] }, amount],
          },
        },
        {
          $set: {
            currentBid: amount,
            currentWinnerId: socket.user.id,
          },
        },
        { returnDocument: 'after' }
      )

      if (!updatedAuction) {
        const existing = await Auction.findById(auctionId)

        if (!existing) {
          return socket.emit('bid_error', { message: 'Auction not found' })
        }
        if (existing.sellerId.toString() === socket.user.id) {
          return socket.emit('bid_error', { message: 'You cannot bid on your own auction' })
        }
        if (existing.status !== 'active' || existing.endsAt <= new Date()) {
          return socket.emit('bid_error', { message: 'This auction has ended' })
        }

        const currentPrice = existing.currentBid || existing.startingPrice
        return socket.emit('bid_error', {
          message: `Bid must be higher than ₹${currentPrice}`,
        })
      }

      const bid = await Bid.create({
        auctionId,
        bidderId: socket.user.id,
        amount,
      })

      io.to(auctionId).emit('bid_update', {
        currentBid: amount,
        bidderUsername: socket.user.username,
        createdAt: bid.createdAt,
      })
    } catch (err) {
      socket.emit('bid_error', { message: 'Something went wrong' })
    }
  })
}