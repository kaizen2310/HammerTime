import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'
import { formatCurrency } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import AuctionTimerCard from '../components/AuctionTimerCard'
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
import { Eye, Gavel, Trophy, WifiOff, User } from 'lucide-react'

const BID_TIMEOUT_MS = 8000
const HIGHLIGHT_MS = 2000
const AUCTION_END_EFFECT_MS = 2500

// Opaque background (rows scroll underneath) and an inset shadow instead of a border,
// because collapsed table borders don't travel with sticky cells.
const STICKY_HEAD = 'sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_var(--border)]'

// Newest bid is always first, and bids only ever go up, so row 0 is the highest bid.
function BidHistoryTable({ bids, highlightId, currentUsername, isActive }) {
  if (bids.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No bids yet. Be the first to bid!</p>
      </div>
    )
  }

  return (
    // Single scroll container. <Table> wraps <table> in its own overflow-x-auto div, which
    // would trap `position: sticky`, so that wrapper is switched to overflow-visible here.
    <div className="max-h-72 overflow-auto rounded-lg border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow className="border-b-0!">
            <TableHead className={STICKY_HEAD}>Bidder</TableHead>
            <TableHead className={cn(STICKY_HEAD, 'text-right')}>Amount</TableHead>
            <TableHead className={cn(STICKY_HEAD, 'text-right')}>Time</TableHead>
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
                  <span className="flex flex-wrap items-center gap-2">
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
                <TableCell className={cn('text-right tabular-nums', isTop && 'font-semibold')}>
                  {formatCurrency(bid.amount)}
                </TableCell>
                <TableCell
                  className="text-right text-xs text-muted-foreground tabular-nums"
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
  const [auctionJustEnded, setAuctionJustEnded] = useState(false)

  const bidTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)
  const auctionEndEffectRef = useRef(null)

  const handleAuctionEnd = () => {
    setAuction((prev) =>
      prev
        ? {
          ...prev,
          status: 'ended',
        }
        : prev
    )

    setBidAmount('')
    setBidError('')
    setPlacingBid(false)
  }


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
      clearTimeout(auctionEndEffectRef.current)
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
      setAuctionJustEnded(true)
      auctionEndEffectRef.current = setTimeout(
        () => setAuctionJustEnded(false),
        AUCTION_END_EFFECT_MS
      )
    })

    return () => {
      clearTimeout(bidTimeoutRef.current)
      clearTimeout(highlightTimeoutRef.current)
      clearTimeout(auctionEndEffectRef.current)
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
  const isActive = auction.status === 'active' && new Date(auction.endsAt).getTime() > Date.now()

  const leadingBidder = auction.currentWinnerId?.username
  const displayBid = auction.currentBid || auction.startingPrice

  const bidHelp = connected
    ? `Enter an amount higher than ${formatCurrency(displayBid)}`
    : 'Bidding is unavailable while disconnected.'

  return (
    // The app's <main> is max-w-4xl. This centres a wider column on it (viewport width minus
    // page padding on small screens) without touching the global layout. The muted backdrop
    // keeps the white cards from blending into the white page.
    <div className="relative left-1/2 w-[min(64rem,calc(100vw_-_2rem))] -translate-x-1/2 space-y-4 rounded-2xl bg-muted/60 p-3 sm:p-4">
      <AuctionTimerCard endsAt={auction.endsAt} isActive={isActive} onEnd={handleAuctionEnd} />
      {!connected && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Connection lost — reconnecting...</p>
            <p className="text-destructive/80">
              Live updates may be delayed. You can still view the auction, but bidding is disabled.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Item */}
        <Card className="min-w-0">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={isActive ? 'default' : 'outline'} className="gap-1.5">
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    isActive ? 'bg-background' : 'bg-muted-foreground'
                  )}
                />
                {isActive ? 'Live' : 'Ended'}
              </Badge>
              <Badge variant="outline">
                <Eye />
                {viewerCount} watching
              </Badge>
            </div>

            <div className="space-y-2">
              <CardTitle
                role="heading"
                aria-level={1}
                className="break-words text-2xl font-semibold tracking-tight"
              >
                {auction.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Sold by
                <User className="size-3.5" />
                <span className="font-medium text-foreground">{auction.sellerId?.username}</span>
              </p>
            </div>
          </CardHeader>

          <div className="mx-4">
            <Separator />
          </div>

          <CardContent className="flex flex-1 flex-col gap-5">
            <p className="break-words leading-relaxed text-muted-foreground">
              {auction.description}
            </p>

            <div className="mt-auto space-y-5">
              <Separator />
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Starting price</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(auction.startingPrice)}</dd>
                <dt className="text-muted-foreground">Ends on</dt>
                <dd className="font-medium">{new Date(auction.endsAt).toLocaleString()}</dd>
              </dl>
            </div>
          </CardContent>
        </Card>

        {/* Current bid + history */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {auction.currentBid ? 'Current bid' : 'Starting price'}
              </p>

              <div aria-live="polite">
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(displayBid)}
                </p>
                {auction.currentBid ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started at {formatCurrency(auction.startingPrice)}
                  </p>
                ) : null}
              </div>

              {leadingBidder && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <Trophy className="size-4 shrink-0" />
                  <span>
                    {isActive ? 'Highest bidder' : 'Winner'}{' '}
                    <span className="font-medium">{leadingBidder}</span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle role="heading" aria-level={2}>
                Bid History
              </CardTitle>
              <Badge variant="secondary">
                {bidHistory.length} {bidHistory.length === 1 ? 'bid' : 'bids'}
              </Badge>
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
      </div>

      {isActive ? (
        <Card>
          <CardContent>
            <form
              onSubmit={handlePlaceBid}
              className="grid gap-4 md:grid-cols-2 md:items-center md:gap-6"
            >
              <div className="flex items-center gap-3">
                <Gavel className="size-5 shrink-0" aria-hidden="true" />
                <div>
                  <CardTitle role="heading" aria-level={2}>
                    Place your bid
                  </CardTitle>
                  <p id="bid-help" className="text-sm text-muted-foreground">
                    {bidHelp}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="bid-amount" className="sr-only">
                    Bid amount
                  </label>
                  <Input
                    id="bid-amount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`More than ${formatCurrency(displayBid)}`}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    disabled={!connected}
                    aria-describedby="bid-help"
                    aria-invalid={bidError ? true : undefined}
                    className="h-10"
                  />
                  <Button type="submit" className="h-10 px-5" disabled={placingBid || !connected}>
                    {placingBid ? 'Placing...' : 'Place bid'}
                  </Button>
                </div>
                {bidError && (
                  <p role="alert" className="text-sm text-destructive">
                    {bidError}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            'transition-shadow duration-700',
            auctionJustEnded && 'shadow-sm ring-2 ring-primary/20'
          )}
        >
          <CardContent className="flex flex-col items-center py-2 text-center">
            <div
              className={cn(
                'mb-4 flex size-12 items-center justify-center rounded-full border bg-muted transition-transform duration-700',
                auctionJustEnded && 'scale-105'
              )}
            >
              {leadingBidder ? (
                <Trophy className="size-5" />
              ) : (
                <Gavel className="size-5 text-muted-foreground" />
              )}
            </div>

            <Badge variant={leadingBidder ? 'secondary' : 'outline'} className="mb-3">
              Auction ended
            </Badge>

            <h2 className="text-xl font-semibold tracking-tight">
              {leadingBidder ? 'Auction Winner' : 'No winner'}
            </h2>

            {leadingBidder ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Congratulations to{' '}
                  <span className="font-medium text-foreground">{leadingBidder}</span>
                </p>
                <div className="mt-5">
                  <p className="text-sm text-muted-foreground">Winning bid</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(auction.currentBid)}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                This auction ended without any bids.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}