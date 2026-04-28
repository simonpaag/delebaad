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
  parseISO,
  isBefore,
  startOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds
} from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertCircle, Trash2, Clock } from 'lucide-react'

const TIMESLOTS = [
  { label: '06:00 - 09:00 (Morgen)', startHour: 6, endHour: 9 },
  { label: '09:00 - 12:00 (Formiddag)', startHour: 9, endHour: 12 },
  { label: '12:00 - 15:00 (Eftermiddag)', startHour: 12, endHour: 15 },
  { label: '15:00 - 18:00 (Sen eftermiddag)', startHour: 15, endHour: 18 },
  { label: '18:00 - 21:00 (Aften)', startHour: 18, endHour: 21 },
  { label: '21:00 - 00:00 (Sen aften)', startHour: 21, endHour: 24 }
]

export default function BookingCalendar({ 
  bookings = [], 
  onBook, 
  onDeleteBooking,
  userId,
  loading,
  isBaadsmand
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(null)
  const [bookingError, setBookingError] = useState(null)

  const today = startOfDay(new Date())

  // Navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Tjek om et bestemt tidsrum er booket
  const isTimeslotBooked = (date, slot) => {
    // Bemærk: setHours(24) går automatisk til næste dag kl 00:00 hvilket er præcist hvad vi vil have
    const slotStart = setMilliseconds(setSeconds(setMinutes(setHours(date, slot.startHour), 0), 0), 0)
    const slotEnd = setMilliseconds(setSeconds(setMinutes(setHours(date, slot.endHour), 0), 0), 0)

    return bookings.some(booking => {
      const bStart = parseISO(booking.start_date)
      const bEnd = parseISO(booking.end_date)
      // Overlap logic: A overlaps B if A.start < B.end AND A.end > B.start
      return slotStart < bEnd && slotEnd > bStart
    })
  }

  // Find bookinger der rører en bestemt dag (til kalender grid dots)
  const getBookingsForDay = (date) => {
    const dayStart = startOfDay(date)
    const dayEnd = setMilliseconds(setSeconds(setMinutes(setHours(date, 24), 0), 0), 0)
    
    return bookings.filter(booking => {
      const bStart = parseISO(booking.start_date)
      const bEnd = parseISO(booking.end_date)
      return dayStart < bEnd && dayEnd > bStart
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
    setSelectedDate(day)
    setBookingError(null)
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
        
        // Hent bookinger for at vise små prikker
        const dayBookings = getBookingsForDay(day)
        const hasBookings = dayBookings.length > 0
        const hasOwnBooking = dayBookings.some(b => b.user_id === userId)
        const fullyBooked = TIMESLOTS.every(slot => isTimeslotBooked(day, slot))

        let isSelected = selectedDate && isSameDay(day, selectedDate)

        let bgClass = "bg-white hover:bg-blue-50 cursor-pointer"
        let textClass = isCurrentMonth ? "text-gray-900" : "text-gray-300"
        
        if (isPast) {
          bgClass = "bg-gray-50 cursor-not-allowed"
          textClass = "text-gray-400"
        } else if (isSelected) {
          bgClass = "bg-blue-500 hover:bg-blue-600"
          textClass = "text-white font-bold"
        } else if (fullyBooked) {
          bgClass = "bg-gray-100 cursor-pointer hover:bg-gray-200"
          textClass = "text-gray-400"
        }

        days.push(
          <div
            className={`flex flex-col items-center justify-center p-2 h-14 border border-gray-100 transition-colors relative ${bgClass}`}
            key={day}
            onClick={() => (!isPast) ? handleDateClick(cloneDay) : null}
          >
            <span className={textClass}>{formattedDate}</span>
            {/* Prik-indikatorer for bookinger under datoen */}
            {!isPast && hasBookings && !isSelected && (
              <div className="flex gap-0.5 mt-1">
                {hasOwnBooking ? (
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                ) : (
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                )}
              </div>
            )}
            {/* Vis streg hvis fuldt booket og ikke valgt */}
            {fullyBooked && !isSelected && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-full h-px bg-gray-900 rotate-45 transform origin-center scale-150"></div>
               </div>
            )}
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

  const handleBookTimeslot = (slot) => {
    if(!selectedDate) return
    
    const slotStart = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, slot.startHour), 0), 0), 0)
    const slotEnd = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, slot.endHour), 0), 0), 0)

    // Dobbelt tjek at den ikke er booket (selvom knappen burde være disabled)
    if (isTimeslotBooked(selectedDate, slot)) {
        setBookingError('Tidsrummet er desværre allerede booket.')
        setTimeout(() => setBookingError(null), 3000)
        return
    }

    onBook({
        start_date: slotStart.toISOString(),
        end_date: slotEnd.toISOString()
    })
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

          {/* Timeslot valgboks når en dag er valgt */}
          {selectedDate && (
              <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-fade-in">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Ledige tider d. {format(selectedDate, 'dd. MMM yyyy', { locale: da })}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TIMESLOTS.map((slot, idx) => {
                      const booked = isTimeslotBooked(selectedDate, slot)
                      return (
                        <button
                          key={idx}
                          disabled={booked || loading}
                          onClick={() => handleBookTimeslot(slot)}
                          className={`
                            flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-all
                            ${booked 
                              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-300 cursor-pointer shadow-sm'}
                          `}
                        >
                          <span>{slot.label}</span>
                          {booked ? (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Booket</span>
                          ) : (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Ledig - Reserver</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
              </div>
          )}
        </div>

        {/* Oversigt over egne (eller alle) bookinger */}
        <div className="w-full lg:w-80">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                {isBaadsmand ? 'Alle Bookinger (Bådsmand)' : 'Dine planlagte ture'}
            </h3>
            {displayedBookings.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Ingen bookinger at vise.</p>
            ) : (
                <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayedBookings.map(b => (
                        <li key={b.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col group items-start">
                            <span className="text-sm font-semibold text-gray-900 mb-1">
                                {format(parseISO(b.start_date), 'dd. MMM yyyy', { locale: da })}
                            </span>
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md mb-3">
                                {format(parseISO(b.start_date), 'HH:mm', { locale: da })} - {format(parseISO(b.end_date), 'HH:mm', { locale: da })}
                            </span>
                            
                            <div className="w-full flex justify-end">
                                <button 
                                  onClick={() => onDeleteBooking(b.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors flex items-center text-xs bg-gray-50 hover:bg-red-50 px-2 py-1 rounded border"
                                  title="Afmeld tur"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Afmeld tur
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            
            <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs leading-relaxed text-gray-600 space-y-2">
                <p className="flex items-center"><span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>Dato med din reservation</p>
                <p className="flex items-center"><span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>Dato med andres reservation</p>
                <p className="flex items-center"><span className="inline-block w-4 h-px bg-gray-900 rotate-45 mr-2 flex-shrink-0"></span>Fuldt booket dato</p>
            </div>
        </div>
      </div>
    </div>
  )
}
