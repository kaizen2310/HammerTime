import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

const pad = (n) => String(n).padStart(2, '0')

const combineDateTime = (date, time) => {
  if (!date) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CreateAuction() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
  })
  const [date, setDate] = useState()
  const [time, setTime] = useState('18:00')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleDateSelect = (selected) => {
    setDate(selected)
    setPickerOpen(false)
  }

  const endsAt = combineDateTime(date, time)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!endsAt) {
      toast.error('Pick an end date and time')
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
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {date ? `${date.toLocaleDateString()} at ${time}` : 'Select date and time'}
                      <CalendarIcon className="size-4 opacity-60" />
                    </Button>
                  }
                />
                <PopoverContent className="w-auto space-y-3 p-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
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