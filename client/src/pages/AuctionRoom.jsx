import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Eye } from 'lucide-react'

export default function AuctionRoom() {
  const { id } = useParams()
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)

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

    return () => {
      socket.emit('leave_room', id)
      disconnectSocket()
    }
  }, [id])

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
            <Badge variant="secondary">{auction.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{auction.description}</p>
          <Separator />
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
            <p className="text-muted-foreground">
              Sold by {auction.sellerId?.username}
            </p>
            <p className="text-muted-foreground">
              Ends: {new Date(auction.endsAt).toLocaleString()}
            </p>
          </div>
          <Separator />
          <div className="border rounded-lg p-4 text-sm text-muted-foreground text-center">
            Live bidding coming in Phase 2b
          </div>
        </CardContent>
      </Card>
    </div>
  )
}