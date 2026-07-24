import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auctions')
      .then(({ data }) => setAuctions(data))
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">Loading auctions...</p>
  }

  if (auctions.length === 0) {
    return (
      <p className="text-muted-foreground">
        No active auctions yet.{' '}
        <Link to="/create" className="underline">Create one.</Link>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Active Auctions</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {auctions.map((auction) => (
          <Card key={auction._id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{auction.title}</CardTitle>
              <Badge variant="secondary">{auction.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{auction.description}</p>
              <p className="text-sm">
                Starting: <span className="font-medium">₹{auction.startingPrice}</span>
              </p>
              <p className="text-sm">
                Current bid:{' '}
                <span className="font-medium">
                  {auction.currentBid ? `₹${auction.currentBid}` : 'No bids yet'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                by {auction.sellerId?.username}
              </p>
              <Button size="sm" className="w-full" nativeButton={false} render = {
                <Link to={`/auctions/${auction._id}`}>View Auction</Link>
              }/>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}