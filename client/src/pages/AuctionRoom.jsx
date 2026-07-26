import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, Trophy } from 'lucide-react'

export default function AuctionRoom() {
  const { id } = useParams()
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)

  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError] = useState('')
  const [placingBid, setPlacingBid] = useState(false)
  const [lastBidder, setLastBidder] = useState('')

  const [endedInfo, setEndedInfo] = useState(null)

  useEffect(() => {
    api.get(`/auctions/${id}`)
      .then(({ data }) => setAuction(data))
      .catch(() => setAuction(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const socket = connectSocket()

    socket.emit('join_room', id)

    socket.on('viewer_count', (count) => {
      setViewerCount(count)
    })

    socket.on('bid_update', ({ currentBid, bidderUsername }) => {
      setAuction((prev) => (prev ? { ...prev, currentBid } : prev))
      setLastBidder(bidderUsername)
      setBidAmount('')
      setBidError('')
      setPlacingBid(false)
    })

    socket.on('bid_error', ({ message }) => {
      setBidError(message)
      setPlacingBid(false)
    })

    socket.on('auction_ended', ({ finalBid, winnerUsername }) => {
      setAuction((prev) => (prev ? { ...prev, status: 'ended' } : prev))
      setEndedInfo({ finalBid, winnerUsername })
    })

    return () => {
      socket.emit('leave_room', id)
      socket.off('viewer_count')
      socket.off('bid_update')
      socket.off('bid_error')
      socket.off('auction_ended')
      disconnectSocket()
    }
  }, [id])

  const handlePlaceBid = (e) => {
    e.preventDefault()
    setBidError('')

    const amount = Number(bidAmount)
    if (!amount || amount <= 0) {
      setBidError('Enter a valid amount')
      return
    }

    setPlacingBid(true)
    getSocket().emit('place_bid', { auctionId: id, amount })
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!auction) {
    return <p className="text-muted-foreground">Auction not found.</p>
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{auction.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Eye className="size-3" />
              {viewerCount}
            </Badge>
            <Badge variant={auction.status === 'active' ? 'secondary' : 'outline'}>
              {auction.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{auction.description}</p>
          <Separator />

          {endedInfo && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <Trophy className="size-4 shrink-0" />
              {endedInfo.winnerUsername ? (
                <span>
                  Sold to <span className="font-medium">{endedInfo.winnerUsername}</span> for{' '}
                  <span className="font-medium">₹{endedInfo.finalBid}</span>
                </span>
              ) : (
                <span>Auction ended with no bids</span>
              )}
            </div>
          )}

          <div className="space-y-1 text-sm">
            <p>
              Starting price:{' '}
              <span className="font-medium">₹{auction.startingPrice}</span>
            </p>
            <p>
              Current bid:{' '}
              <span className="font-medium">
                {auction.currentBid ? `₹${auction.currentBid}` : 'No bids yet'}
              </span>
            </p>
            {lastBidder && (
              <p className="text-muted-foreground">
                Last bid by {lastBidder}
              </p>
            )}
            <p className="text-muted-foreground">
              Sold by {auction.sellerId?.username}
            </p>
            <p className="text-muted-foreground">
              Ends: {new Date(auction.endsAt).toLocaleString()}
            </p>
          </div>
          <Separator />

          <form onSubmit={handlePlaceBid} className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                placeholder={`More than ₹${auction.currentBid || auction.startingPrice}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                disabled={auction.status !== 'active'}
              />
              <Button
                type="submit"
                disabled={placingBid || auction.status !== 'active'}
              >
                {placingBid ? 'Placing...' : 'Place bid'}
              </Button>
            </div>
            {bidError && (
              <p className="text-sm text-destructive">{bidError}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}