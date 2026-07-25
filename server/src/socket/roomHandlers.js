const roomViewers = {}

export const registerRoomHandlers = (io, socket) => {
  socket.on('join_room', (auctionId) => {
    socket.join(auctionId)
    socket.currentRoom = auctionId

    roomViewers[auctionId] = (roomViewers[auctionId] || 0) + 1
    io.to(auctionId).emit('viewer_count', roomViewers[auctionId])
  })

  socket.on('leave_room', (auctionId) => {
    leaveRoom(io, socket, auctionId)
  })

  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      leaveRoom(io, socket, socket.currentRoom)
    }
  })
}

const leaveRoom = (io, socket, auctionId) => {
  socket.leave(auctionId)

  if (roomViewers[auctionId]) {
    roomViewers[auctionId] -= 1
    if (roomViewers[auctionId] <= 0) {
      delete roomViewers[auctionId]
    } else {
      io.to(auctionId).emit('viewer_count', roomViewers[auctionId])
    }
  }

  if (socket.currentRoom === auctionId) {
    socket.currentRoom = null
  }
}