import { io as ioClient } from 'socket.io-client'

const API_URL = 'http://localhost:5000/api'
const SOCKET_URL = 'http://localhost:5000'

const suffix = Date.now()

const register = async (name) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `${name}${suffix}`,
      email: `${name}${suffix}@test.com`,
      password: 'testpassword123',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

const createAuction = async (token) => {
  const res = await fetch(`${API_URL}/auctions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Race condition test item',
      description: 'Created by testRace.js',
      startingPrice: 2000,
      endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

const connectSocket = (token, label) =>
  new Promise((resolve, reject) => {
    const socket = ioClient(SOCKET_URL, { auth: { token } })

    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', (err) => reject(err))

    socket.on('bid_update', ({ currentBid, bidderUsername }) => {
      console.log(`[${label}] bid_update -> ₹${currentBid} by ${bidderUsername}`)
    })

    socket.on('bid_error', ({ message }) => {
      console.log(`[${label}] bid_error -> "${message}"`)
    })
  })

const run = async () => {
  console.log('Registering two bidders and a seller...')
  const seller = await register('seller')
  const bidderA = await register('bidderA')
  const bidderB = await register('bidderB')

  console.log('Creating auction, starting price ₹2000...')
  const auction = await createAuction(seller.token)
  console.log('Auction ID:', auction._id)

  console.log('Connecting both bidders...')
  const socketA = await connectSocket(bidderA.token, 'Bidder A')
  const socketB = await connectSocket(bidderB.token, 'Bidder B')

  console.log('\nFiring both bids back-to-back — A bids ₹2600, B bids ₹2500...\n')

  socketA.emit('place_bid', { auctionId: auction._id, amount: 2600 })
  socketB.emit('place_bid', { auctionId: auction._id, amount: 2500 })

  await new Promise((resolve) => setTimeout(resolve, 1500))

  const res = await fetch(`${API_URL}/auctions/${auction._id}`)
  const final = await res.json()

  console.log('\n--- Final state in MongoDB ---')
  console.log('currentBid:', final.currentBid)
  console.log('currentWinnerId:', final.currentWinnerId?.username)

  const correct =
    final.currentBid === 2600 && final.currentWinnerId?.username === bidderA.user.username

  if (correct) {
    console.log('\nNo race caught this run — correct bid (₹2600, Bidder A) won. Run it again.')
  } else {
    console.log('\nBUG CONFIRMED: the lower bid (₹2500) overwrote the higher one (₹2600).')
    console.log('This is exactly the race condition Phase 3 fixes.')
  }

  socketA.disconnect()
  socketB.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})