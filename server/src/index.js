import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import http from 'http'
import { Server } from 'socket.io'
import './models/User.js'
import './models/Auction.js'
import authRoutes from './routes/auth.js'
import auctionRoutes from './routes/auctions.js'
import { socketAuth } from './socket/socketAuth.js'
import { registerRoomHandlers } from './socket/roomHandlers.js'


dotenv.config()

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/auctions', auctionRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})

io.use(socketAuth)

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'user:', socket.user.username)

  registerRoomHandlers(io, socket)

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDb connected')
    server.listen(process.env.PORT || 5000, () => {
      console.log(`server running on port ${process.env.PORT || 5000}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed', err.message)
    process.exit(1)
  })