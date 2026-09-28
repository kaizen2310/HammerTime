import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { formatCurrency } from '../lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function Home() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = () => {
    return api.get('/auctions')
      .then(({ data }) => setAuctions(data))
      .catch(() => setAuctions([]))
  }

  useEffect(() => {
    fetchAuctions().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const socket = connectSocket()

    socket.on('auction_status_changed', () => {
      fetchAuctions()
    })

    return () => {
      socket.off('auction_status_changed')
      disconnectSocket()
    }
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">Loading auctions...</p>
  }

  const activeAuctions = auctions.filter((a) => a.status === 'active')
  const endedAuctions = auctions.filter((a) => a.status === 'ended')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Auctions</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAuctions.length})</TabsTrigger>
          <TabsTrigger value="ended">Ended ({endedAuctions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeAuctions.length === 0 ? (
            <p className="text-muted-foreground">
              No active auctions yet.{' '}
              <Link to="/create" className="underline">Create one.</Link>
            </p>
          ) : (
            <AuctionGrid auctions={activeAuctions} />
          )}
        </TabsContent>

        <TabsContent value="ended" className="mt-4">
          {endedAuctions.length === 0 ? (
            <p className="text-muted-foreground">No auctions have ended yet.</p>
          ) : (
            <AuctionGrid auctions={endedAuctions} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AuctionGrid({ auctions }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {auctions.map((auction) => (
        <AuctionCard key={auction._id} auction={auction} />
      ))}
    </div>
  )
}

function AuctionCard({ auction }) {
  const isEnded = auction.status === 'ended'

  return (
    <Card className={isEnded ? 'opacity-70' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{auction.title}</CardTitle>
        <Badge variant={isEnded ? 'outline' : 'secondary'}>{auction.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{auction.description}</p>
        <p className="text-sm">
          Starting: <span className="font-medium">{formatCurrency(auction.startingPrice)}</span>
        </p>
        {isEnded ? (
          <p className="text-sm">
            {auction.currentWinnerId ? (
              <>
                Won by{' '}
                <span className="font-medium">{auction.currentWinnerId.username}</span>{' '}
                for <span className="font-medium">{formatCurrency(auction.currentBid)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Closed with no bids</span>
            )}
          </p>
        ) : (
          <p className="text-sm">
            Current bid:{' '}
            <span className="font-medium">
              {auction.currentBid ? formatCurrency(auction.currentBid) : 'No bids yet'}
            </span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          by {auction.sellerId?.username}
        </p>
        <Button
          size="sm"
          className="w-full"
          nativeButton={false}
          render={<Link to={`/auctions/${auction._id}`}>{isEnded ? 'View result' : 'View auction'}</Link>}
        />
      </CardContent>
    </Card>
  )
}