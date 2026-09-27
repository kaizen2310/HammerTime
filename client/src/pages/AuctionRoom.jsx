import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, Trophy, WifiOff } from 'lucide-react'

const BID_TIMEOUT_MS = 8000

export default function AuctionRoom() {
  const { id } = useParams()
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [connected, setConnected] = useState(true)

  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError] = useState('')
  const [placingBid, setPlacingBid] = useState(false)
  const [lastBidder, setLastBidder] = useState('')

  const [endedInfo, setEndedInfo] = useState(null)

  const bidTimeoutRef = useRef(null)

  const fetchAuction = ({ silent } = {}) => {
    if (!silent) setLoading(true)
    return api.get(`/auctions/${id}`)
      .then(({ data }) => setAuction(data))
      .catch(() => {
        if (!silent) setAuction(null)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }

  useEffect(() => {
    fetchAuction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const socket = connectSocket()
    let hasConnectedBefore = false

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_room', id)

      if (hasConnectedBefore) {
        fetchAuction({ silent: true })
      }
      hasConnectedBefore = true
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setPlacingBid((wasPlacing) => {
        if (wasPlacing) {
          clearTimeout(bidTimeoutRef.current)
          setBidError('Connection lost — please try again')
        }
        return false
      })
    })

    socket.on('viewer_count', (count) => {
      setViewerCount(count)
    })

    socket.on('bid_update', ({ currentBid, bidderUsername }) => {
      clearTimeout(bidTimeoutRef.current)
      setAuction((prev) => (prev ? { ...prev, currentBid } : prev))
      setLastBidder(bidderUsername)
      setBidAmount('')
      setBidError('')
      setPlacingBid(false)
    })

    socket.on('bid_error', ({ message }) => {
      clearTimeout(bidTimeoutRef.current)
      setBidError(message)
      setPlacingBid(false)
    })

    socket.on('auction_ended', ({ finalBid, winnerUsername }) => {
      setAuction((prev) => (prev ? { ...prev, status: 'ended' } : prev))
      setEndedInfo({ finalBid, winnerUsername })
    })

    return () => {
      clearTimeout(bidTimeoutRef.current)
      socket.emit('leave_room', id)
      socket.off('connect')
      socket.off('disconnect')
      socket.off('viewer_count')
      socket.off('bid_update')
      socket.off('bid_error')
      socket.off('auction_ended')
      disconnectSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    bidTimeoutRef.current = setTimeout(() => {
      setPlacingBid(false)
      setBidError('No response from the server — check your connection and try again')
    }, BID_TIMEOUT_MS)
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
          {!connected && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              <WifiOff className="size-4" />
              Connection lost — reconnecting...
            </div>
          )}

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
                disabled={auction.status !== 'active' || !connected}
              />
              <Button
                type="submit"
                disabled={placingBid || auction.status !== 'active' || !connected}
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