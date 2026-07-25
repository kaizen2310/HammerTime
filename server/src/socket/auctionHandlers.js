import Auction from '../models/Auction.js'

export const registerAuctionHandlers = (io, socket) => {
  socket.on('place_bid', async ({ auctionId, amount }) => {
    try {
      const auction = await Auction.findById(auctionId)

      if (!auction) {
        return socket.emit('bid_error', { message: 'Auction not found' })
      }

      if (auction.status !== 'active') {
        return socket.emit('bid_error', { message: 'This auction has ended' })
      }

      const currentPrice = auction.currentBid || auction.startingPrice

      if (amount <= currentPrice) {
        return socket.emit('bid_error', {
          message: `Bid must be higher than ₹${currentPrice}`,
        })
      }

      auction.currentBid = amount
      auction.currentWinnerId = socket.user.id
      await auction.save()

      io.to(auctionId).emit('bid_update', {
        currentBid: amount,
        bidderUsername: socket.user.username,
      })
    } catch (err) {
      socket.emit('bid_error', { message: 'Something went wrong' })
    }
  })
}