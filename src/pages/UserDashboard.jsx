import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Ship, Calendar as CalendarIcon, MapPin, LogOut, X } from 'lucide-react'
import BookingCalendar from '../components/BookingCalendar'
import BoatLogbook from '../components/BoatLogbook'
export default function UserDashboard() {
  const { user } = useAuth()
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Kalender state
  const [activeBoat, setActiveBoat] = useState(null)
  const [bookings, setBookings] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Boat state
  const [isEditingBoat, setIsEditingBoat] = useState(false)
  const [editBoatData, setEditBoatData] = useState({})

  async function fetchBoats() {
    if (!user) return
    const { data, error } = await supabase.from('boats').select(`
      *,
      boat_members!inner(user_id, member_role)
    `).eq('boat_members.user_id', user.id)
    if (error) {
      console.error('Fejl ved hentning af både', error)
      setLoading(false)
      return
    }
    setBoats(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBoats()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // --- Kalender og Bookings logik ---
  const handleOpenCalendar = async (boat) => {
    setActiveBoat(boat)
    setEditBoatData(boat)
    fetchBookings(boat.id)
  }

  const handleUpdateBoat = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('boats')
      .update({
        name: editBoatData.name,
        location: editBoatData.location,
        description: editBoatData.description
      }).eq('id', activeBoat.id)
      
    if (error) {
      alert('Fejl under opdatering: ' + error.message)
    } else {
      setActiveBoat({ ...activeBoat, ...editBoatData })
      setIsEditingBoat(false)
      fetchBoats()
    }
    setLoading(false)
  }

  const fetchBookings = async (boatId) => {
    setCalendarLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('boat_id', boatId)
      
    if (error) {
      console.error('Kunne ikke hente bookinger', error)
    } else {
      setBookings(data || [])
    }
    setCalendarLoading(false)
  }

  const handleCreateBooking = async ({ start_date, end_date }) => {
    setCalendarLoading(true)
    const { error } = await supabase
      .from('bookings')
      .insert({
        boat_id: activeBoat.id,
        user_id: user.id,
        start_date,
        end_date
      })
      
    if (error) {
      console.error('Kunne ikke gemme booking', error)
      if (error.message.includes('overlapper')) {
         alert('Beklager, reservationen kunne ikke gennemføres: Datoen er i mellemtiden blevet booket af en anden.')
      } else {
         alert('Der skete en fejl: ' + error.message)
      }
    } else {
      fetchBookings(activeBoat.id) // genindlæs efter succes
    }
    setCalendarLoading(false)
  }

  const handleDeleteBooking = async (bookingId) => {
    if(!window.confirm('Er du sikker på du vil afmelde denne tur?')) return
    
    setCalendarLoading(true)
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      
    if (error) {
      console.error('Fejl ved sletning', error)
    } else {
      fetchBookings(activeBoat.id)
    }
    setCalendarLoading(false)
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Indlæser platformen...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Ship className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Mine Både</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-gray-500 hidden sm:block">
                Logget ind som: {user?.email}
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
              >
                Log ud
                <LogOut className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex gap-6 flex-col">
        {!activeBoat ? (
          <>
            {boats.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                Du har i øjeblikket ikke adgang til nogen både. Kontakt administratoren.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boats.map((boat) => (
                  <div key={boat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                      {/* Placeholder billede / Ikon */}
                      <Ship className="h-24 w-24 text-gray-300" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        {boat.name}
                      </h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        {boat.location || 'Lokation ikke angivet'}
                      </div>
                      <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                        {boat.description || 'Ingen beskrivelse tilgængelig.'}
                      </p>
                      
                      <div className="mt-6">
                        <button 
                          onClick={() => handleOpenCalendar(boat)}
                          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Kalender og Booking
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
              <div className="w-full">
                <button 
                  onClick={() => setActiveBoat(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center mb-3"
                >
                  <LogOut className="h-4 w-4 mr-1 rotate-180" />
                  Tilbage til oversigten
                </button>
                
                {isEditingBoat ? (
                  <form onSubmit={handleUpdateBoat} className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                    <input type="text" value={editBoatData.name} onChange={e => setEditBoatData({...editBoatData, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Bådens navn" required />
                    <input type="text" value={editBoatData.location} onChange={e => setEditBoatData({...editBoatData, location: e.target.value})} className="w-full p-2 border rounded" placeholder="Lokation" />
                    <textarea value={editBoatData.description} onChange={e => setEditBoatData({...editBoatData, description: e.target.value})} className="w-full p-2 border rounded" placeholder="Beskrivelse" rows="3" />
                    <div className="flex gap-2">
                       <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Gem Ændringer</button>
                       <button type="button" onClick={() => setIsEditingBoat(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">Annuller</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-between w-full">
                      <span className="flex items-center gap-3">
                         {activeBoat.name}
                         {activeBoat.boat_members?.[0]?.member_role === 'baadsmand' && (
                           <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
                             Bådsmand Adgang
                           </span>
                         )}
                      </span>
                      <div className="flex items-center gap-2">
                        {activeBoat.boat_members?.[0]?.member_role === 'baadsmand' && (
                          <button onClick={() => setIsEditingBoat(true)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md text-gray-700 transition">
                            Rediger Båd
                          </button>
                        )}
                        <button 
                          onClick={() => setActiveBoat(null)}
                          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                          title="Luk"
                        >
                            <X className="h-5 w-5" />
                        </button>
                      </div>
                    </h2>
                    <div className="flex items-center text-gray-500 mt-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {activeBoat.location}
                    </div>
                    <p className="text-gray-600 mt-4 mb-8 max-w-3xl leading-relaxed">
                      {activeBoat.description}
                    </p>
                  </>
                )}
              </div>
            </div>

            {calendarLoading && bookings.length === 0 ? (
               <div className="py-20 text-center text-gray-400">Henter kalender...</div>
            ) : (
              <div className="flex flex-col xl:flex-row gap-8">
                <div className="flex-1">
                  <BookingCalendar 
                     boatId={activeBoat.id}
                     bookings={bookings}
                     onBook={handleCreateBooking}
                     onDeleteBooking={handleDeleteBooking}
                     userId={user.id}
                     loading={calendarLoading}
                     isBaadsmand={activeBoat.boat_members?.[0]?.member_role === 'baadsmand'}
                  />
                </div>
                <div className="w-full xl:w-[400px]">
                  <BoatLogbook 
                     boatId={activeBoat.id}
                     userId={user.id}
                     isBaadsmand={activeBoat.boat_members?.[0]?.member_role === 'baadsmand'}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
