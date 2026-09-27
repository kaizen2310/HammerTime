import { Router } from 'express'
import Auction from '../models/Auction.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createAuctionSchema } from '../validation/schemas.js'
import { scheduleAuctionEnd } from '../queues/auctionQueue.js'

const router = Router()

router.post('/', requireAuth, validate(createAuctionSchema), async (req, res) => {
  try {
    const { title, description, startingPrice, endsAt } = req.body

    const auction = await Auction.create({
      title,
      description,
      startingPrice,
      endsAt: new Date(endsAt),
      sellerId: req.user.id,
    })

    await scheduleAuctionEnd(auction._id, auction.endsAt)

    res.status(201).json(auction)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const auctions = await Auction.find({ status: 'active' })
      .populate('sellerId', 'username')
      .populate('currentWinnerId', 'username')
      .sort({ endsAt: 1 })

    res.json(auctions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const auctions = await Auction.find({})
      .populate('sellerId', 'username')
      .populate('currentWinnerId', 'username')
      .sort({ createdAt: -1 })

    res.json(auctions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('sellerId', 'username')
      .populate('currentWinnerId', 'username')

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' })
    }

    res.json(auction)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router