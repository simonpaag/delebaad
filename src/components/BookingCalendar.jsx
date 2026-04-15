import React, { useState } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isWithinInterval,
  parseISO,
  isBefore,
  startOfDay,
  eachDayOfInterval
} from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertCircle, Trash2 } from 'lucide-react'

export default function BookingCalendar({ 
  bookings = [], 
  onBook, 
  onDeleteBooking,
  userId,
  loading,
  isBaadsmand
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selection, setSelection] = useState({ start: null, end: null })
  const [bookingError, setBookingError] = useState(null)

  const today = startOfDay(new Date())

  // Navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Tjek om en bestemt dato er booket
  const getBookingForDate = (date) => {
    return bookings.find(booking => {
      const start = parseISO(booking.start_date)
      const end = parseISO(booking.end_date)
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end)
    })
  }

  // Kalender Grid generering
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: da })}
        </h2>
        <button type="button" onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    )
  }

  const renderDays = () => {
    const defaultFormat = "EEEEEE"
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 })
    const days = []
    
    for (let i = 0; i < 7; i++) {
        days.push(
        <div className="text-center font-medium text-xs text-gray-400 uppercase py-2" key={i}>
            {format(addDays(startDate, i), defaultFormat, { locale: da })}
        </div>
        )
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>
  }

  const handleDateClick = (day) => {
    if (isBefore(day, today)) return // Kan ikke booke tilbage i tiden
    
    const existing = getBookingForDate(day)
    if (existing) {
        setBookingError('Datoen er allerede booket.')
        setTimeout(() => setBookingError(null), 3000)
        return
    }

    if (!selection.start || (selection.start && selection.end)) {
        // Ny markering
        setSelection({ start: day, end: null })
    } else {
        // Færdiggør markering
        if (isBefore(day, selection.start)) {
            setSelection({ start: day, end: selection.start })
        } else {
            setSelection({ ...selection, end: day })
        }
    }
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const rows = []
    let days = []
    let day = startDate
    let formattedDate = ""

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd')
        const cloneDay = day
        
        const isPast = isBefore(day, today)
        const isCurrentMonth = isSameMonth(day, monthStart)
        const booking = getBookingForDate(day)
        const isBooked = !!booking
        const isOwnBooking = isBooked && booking.user_id === userId

        // Tjek om markeret i selection (gældende UI range)
        let isSelected = false
        if (selection.start && isSameDay(day, selection.start)) isSelected = true
        if (selection.end && isSameDay(day, selection.end)) isSelected = true
        if (selection.start && selection.end && isWithinInterval(day, { start: selection.start, end: selection.end })) {
            isSelected = true
        }

        let bgClass = "bg-white hover:bg-blue-50 cursor-pointer"
        let textClass = isCurrentMonth ? "text-gray-900" : "text-gray-300"
        
        if (isPast) {
          bgClass = "bg-gray-50 cursor-not-allowed"
          textClass = "text-gray-400"
        } else if (isSelected) {
          bgClass = "bg-blue-500 hover:bg-blue-600"
          textClass = "text-white font-bold"
        } else if (isOwnBooking) {
          bgClass = "bg-green-100 hover:bg-green-200 cursor-pointer"
          textClass = "text-green-800 font-bold"
        } else if (isBooked) {
          bgClass = "bg-gray-200 cursor-not-allowed"
          textClass = "text-gray-500 line-through"
        }

        days.push(
          <div
            className={`flex flex-col items-center justify-center p-2 h-12 border border-gray-100 transition-colors ${bgClass}`}
            key={day}
            onClick={() => (!isPast && !isBooked) ? handleDateClick(cloneDay) : null}
          >
            <span className={textClass}>{formattedDate}</span>
            {isOwnBooking && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></span>}
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div className="grid grid-cols-7" key={day}>
          {days}
        </div>
      )
      days = []
    }
    return <div className="border border-gray-200 rounded-lg overflow-hidden">{rows}</div>
  }

  const handleConfirmBooking = () => {
    const s = selection.start
    const e = selection.end || selection.start
    
    // Tjek at ingen booked dates eksisterer INNENFOR vores range!
    if (s && e) {
        const intervalDates = eachDayOfInterval({ start: s, end: e })
        const overlap = intervalDates.some(d => getBookingForDate(d))
        if(overlap) {
            setBookingError('Valgte periode overlapper eksisterende bookinger.')
            setTimeout(() => setBookingError(null), 3000)
            setSelection({start: null, end: null})
            return
        }
    }

    onBook({
        start_date: format(s, 'yyyy-MM-dd'),
        end_date: format(e, 'yyyy-MM-dd')
    })
    setSelection({ start: null, end: null })
  }

  // Tjek om vi har vist brugerens egne reservationer (eller alle hvis brugeren er Bådsmand)
  const displayedBookings = isBaadsmand
    ? [...bookings].sort((a,b) => new Date(a.start_date) - new Date(b.start_date))
    : [...bookings]
        .filter(b => b.user_id === userId)
        .sort((a,b) => new Date(a.start_date) - new Date(b.start_date))

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Kalenderen */}
        <div className="flex-1">
          {renderHeader()}
          {renderDays()}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
             {renderCells()}
          </div>

          {/* Booking Error State */}
          {bookingError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {bookingError}
              </div>
          )}

          {/* Action buttons */}
          {selection.start && (
              <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg flex justify-between items-center">
                  <div>
                      <p className="text-sm font-medium text-blue-900">
                          Reserver fra: <span className="font-bold">{format(selection.start, 'dd. MMM yyyy', { locale: da })}</span> 
                          {selection.end && <span> til <span className="font-bold">{format(selection.end, 'dd. MMM yyyy', { locale: da })}</span></span>}
                      </p>
                  </div>
                  <button 
                    disabled={loading}
                    onClick={handleConfirmBooking}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Reserverer...' : 'Godkend Booking'}
                  </button>
              </div>
          )}
        </div>

        {/* Oversigt over egne (eller alle) bookinger */}
        <div className="w-full lg:w-72">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                {isBaadsmand ? 'Alle Bookinger (Bådsmand)' : 'Dine planlagte ture'}
            </h3>
            {displayedBookings.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Ingen bookinger at vise.</p>
            ) : (
                <ul className="space-y-3">
                    {displayedBookings.map(b => (
                        <li key={b.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col group justify-between items-start">
                            <span className="text-sm font-semibold text-gray-900">
                                {format(parseISO(b.start_date), 'dd. MMM', { locale: da })} - {format(parseISO(b.end_date), 'dd. MMM', { locale: da })}
                            </span>
                            <div className="w-full flex justify-end mt-2">
                                <button 
                                  onClick={() => onDeleteBooking(b.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors flex items-center text-xs"
                                  title="Afmeld tur"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Afmeld
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            
            <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs leading-relaxed text-gray-600 space-y-2">
                <p className="flex items-center"><span className="inline-block w-3 h-3 bg-green-100 rounded-full border border-green-300 mr-2 flex-shrink-0"></span>Dine reservationer</p>
                <p className="flex items-center"><span className="inline-block w-3 h-3 bg-gray-200 rounded-full border border-gray-300 mr-2 flex-shrink-0"></span>Booket af andre (skjult for dig)</p>
                <p className="flex items-center"><span className="inline-block w-3 h-3 bg-blue-500 rounded-full border border-blue-600 mr-2 flex-shrink-0"></span>Dit aktuelle valg</p>
            </div>
        </div>
      </div>
    </div>
  )
}
