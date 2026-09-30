import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { toast } from 'sonner'

// Builds the end time in the user's local timezone and returns it as a UTC ISO string
// (e.g. "2026-09-30T12:30:00.000Z"), so the server never has to guess the timezone.
const combineDateTime = (date, time) => {
  if (!date || !time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  // toISOString() throws on an invalid date, and this runs during render
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

// Same rule the server enforces (createAuctionSchema: "End time must be in the future"), checked
// here so the user sees it next to the picker instead of after submitting. Returns '' when OK.
// Only called from event handlers, so reading the clock is fine.
const END_IN_PAST = 'End time must be in the future'
const validateEnd = (date, time) => {
  const iso = combineDateTime(date, time)
  return iso && new Date(iso).getTime() <= Date.now() ? END_IN_PAST : ''
}

export default function CreateAuction() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
  })
  const [date, setDate] = useState()
  const [time, setTime] = useState('18:00')
  const [endError, setEndError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // The user's values are never adjusted for them; an invalid combination is flagged, not fixed.
  const handleDateChange = (next) => {
    setDate(next)
    setEndError(validateEnd(next, time))
  }

  const handleTimeChange = (next) => {
    setTime(next)
    setEndError(validateEnd(date, next))
  }

  const endsAt = combineDateTime(date, time)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!endsAt) {
      toast.error('Pick an end date and time')
      return
    }

    // Re-check against the clock as of now: a time that was fine when picked may have passed.
    const error = validateEnd(date, time)
    if (error) {
      setEndError(error)
      toast.error(error)
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auctions', {
        ...form,
        startingPrice: Number(form.startingPrice),
        endsAt,
      })
      toast.success('Auction created')
      navigate(`/auctions/${data._id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Auction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startingPrice">Starting Price (₹)</Label>
              <Input
                id="startingPrice"
                name="startingPrice"
                type="number"
                min="0"
                value={form.startingPrice}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Ends At</Label>
              <DateTimePicker
                label="Ends at"
                date={date}
                time={time}
                onDateChange={handleDateChange}
                onTimeChange={handleTimeChange}
                invalid={Boolean(endError)}
                describedBy={endError ? 'ends-at-error' : undefined}
              />
              {endError && (
                <p id="ends-at-error" role="alert" className="text-sm text-destructive">
                  {endError}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Auction'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
