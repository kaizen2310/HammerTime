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
import { registerAuctionHandlers } from './socket/auctionHandlers.js'
import { Redis } from 'ioredis'
import { createAdapter } from '@socket.io/redis-adapter'
import { startAuctionWorker } from './workers/auctionWorker.js'


//dotenv.config()
//every thing loads before we run not in runtime so, that why it shows (0) env inject cause everying is already injected if something new comes then it will show 

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

const pubClient = new Redis(process.env.REDIS_URL)
const subClient = pubClient.duplicate()

pubClient.on('error', (err) => console.error('Redis pub client error:', err.message))
subClient.on('error', (err) => console.error('Redis sub client error:', err.message))
pubClient.on('connect', () => console.log('Redis pub client connected'))

io.adapter(createAdapter(pubClient, subClient))

io.use(socketAuth)

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'user:', socket.user.username)

  registerRoomHandlers(io, socket)
  registerAuctionHandlers(io, socket)

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

startAuctionWorker(io)

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