import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'
import { formatCurrency, formatCountdown } from '../lib/format'
import { useCountdown } from '../hooks/useCountdown'
import { useAuth } from '../context/AuthContext'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Trophy, WifiOff, Clock } from 'lucide-react'

const BID_TIMEOUT_MS = 8000
const URGENT_THRESHOLD_MS = 5 * 60 * 1000
const HIGHLIGHT_MS = 2000

// Newest bid is always first, and bids only ever go up, so row 0 is the highest bid.
function BidHistoryTable({ bids, highlightId, currentUsername, isActive }) {
  if (bids.length === 0) {
    return <p className="text-sm text-muted-foreground">No bids yet. Be the first to bid!</p>
  }

  return (
    <div className="max-h-72 overflow-y-auto  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bidder</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids.map((bid, index) => {
            const isTop = index === 0
            const isYou = Boolean(currentUsername) && bid.username === currentUsername

            return (
              <TableRow
                key={bid.id}
                className={cn('duration-700', bid.id === highlightId && 'bg-primary/10')}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {bid.username ?? 'Unknown'}
                    {isYou && <Badge variant="secondary">You</Badge>}
                    {isTop && (
                      <Badge variant={isActive ? 'default' : 'outline'} className="gap-1">
                        <Trophy />
                        {isActive ? 'Highest' : 'Winner'}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className={cn('text-right', isTop && 'font-semibold')}>
                  {formatCurrency(bid.amount)}
                </TableCell>
                <TableCell
                  className="text-right text-xs text-muted-foreground"
                  title={bid.createdAt ? new Date(bid.createdAt).toLocaleString() : undefined}
                >
                  {bid.createdAt ? new Date(bid.createdAt).toLocaleTimeString() : ''}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function AuctionRoom() {
  const { id } = useParams()
  const { user } = useAuth()
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [connected, setConnected] = useState(true)

  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError] = useState('')
  const [placingBid, setPlacingBid] = useState(false)
  const [bidHistory, setBidHistory] = useState([])
  const [highlightId, setHighlightId] = useState(null)

  const bidTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)

  const remaining = useCountdown(auction?.endsAt || Date.now())

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

  const fetchBidHistory = ({ silent } = {}) => {
    return api.get(`/auctions/${id}/bids`)
      .then(({ data }) => {
        setBidHistory(
          data.map((bid) => ({
            id: bid._id,
            amount: bid.amount,
            username: bid.bidderId?.username,
            createdAt: bid.createdAt,
          }))
        )
      })
      .catch(() => {
        if (!silent) setBidHistory([])
      })
  }

  useEffect(() => {
    fetchAuction()
    fetchBidHistory()
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
        fetchBidHistory({ silent: true })
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

    socket.on('bid_update', ({ currentBid, bidderUsername, createdAt }) => {
      clearTimeout(bidTimeoutRef.current)
      setAuction((prev) =>
        prev ? { ...prev, currentBid, currentWinnerId: { username: bidderUsername } } : prev
      )
      setBidAmount('')
      setBidError('')
      setPlacingBid(false)

      const liveId = `live-${Date.now()}`
      setBidHistory((prev) => [
        { id: liveId, amount: currentBid, username: bidderUsername, createdAt },
        ...prev,
      ])
      setHighlightId(liveId)
      clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
    })

    socket.on('bid_error', ({ message }) => {
      clearTimeout(bidTimeoutRef.current)
      setBidError(message)
      setPlacingBid(false)
    })

    socket.on('auction_ended', ({ finalBid, winnerUsername }) => {
      setAuction((prev) =>
        prev
          ? {
              ...prev,
              status: 'ended',
              currentBid: finalBid,
              currentWinnerId: winnerUsername ? { username: winnerUsername } : null,
            }
          : prev
      )
    })

    return () => {
      clearTimeout(bidTimeoutRef.current)
      clearTimeout(highlightTimeoutRef.current)
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

  const isActive = auction.status === 'active'
  const leadingBidder = auction.currentWinnerId?.username
  const isUrgent = isActive && remaining > 0 && remaining <= URGENT_THRESHOLD_MS
  const countdownLabel = remaining <= 0 ? 'Ending...' : formatCountdown(remaining)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>{auction.title}</CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant={isUrgent ? 'destructive' : 'outline'} className="gap-1">
                <Clock className="size-3" />
                {countdownLabel}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Eye className="size-3" />
              {viewerCount}
            </Badge>
            <Badge variant={isActive ? 'secondary' : 'outline'}>
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

          {!isActive && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <Trophy className="size-4 shrink-0" />
              {leadingBidder ? (
                <span>
                  Sold to <span className="font-medium">{leadingBidder}</span> for{' '}
                  <span className="font-medium">{formatCurrency(auction.currentBid)}</span>
                </span>
              ) : (
                <span>Auction ended with no bids</span>
              )}
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">
              {auction.currentBid ? 'Current bid' : 'Starting price'}
            </p>
            <p className="text-3xl font-semibold">
              {formatCurrency(auction.currentBid || auction.startingPrice)}
            </p>
            {auction.currentBid ? (
              <p className="text-xs text-muted-foreground mt-1">
                Started at {formatCurrency(auction.startingPrice)}
              </p>
            ) : null}
          </div>

          {isActive && leadingBidder && (
            <p className="text-sm text-muted-foreground">
              Highest bidder <span className="font-medium">{leadingBidder}</span>
            </p>
          )}

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Sold by {auction.sellerId?.username}</p>
            <p>Ends: {new Date(auction.endsAt).toLocaleString()}</p>
          </div>
          <Separator />

          <form onSubmit={handlePlaceBid} className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                placeholder={`More than ${formatCurrency(auction.currentBid || auction.startingPrice)}`}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bid History</CardTitle>
        </CardHeader>
        <CardContent>
          <BidHistoryTable
            bids={bidHistory}
            highlightId={highlightId}
            currentUsername={user?.username}
            isActive={isActive}
          />
        </CardContent>
      </Card>
    </div>
  )
}