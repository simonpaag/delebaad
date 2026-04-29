import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Ship, Calendar as CalendarIcon, MapPin, LogOut, X, Download, Share, Settings } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import BookingCalendar from '../components/BookingCalendar'
import BoatLogbook from '../components/BoatLogbook'
import BoatTasks from '../components/BoatTasks'
import BoatExpenses from '../components/BoatExpenses'
export default function UserDashboard() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { isInstallable, promptInstall, isIOS } = useInstallPrompt()
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  
  // Kalender state
  const [activeBoat, setActiveBoat] = useState(null)
  const [bookings, setBookings] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('booking')

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
  const handleOpenTab = async (boat, tabName) => {
    setActiveBoat(boat)
    setEditBoatData(boat)
    setActiveTab(tabName)
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
              {(isInstallable || isIOS) && (
                <button 
                  onClick={() => isIOS ? setShowIOSPrompt(true) : promptInstall()}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Installer App</span>
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="flex items-center text-gray-700 hover:text-gray-900 font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Gå til Admin Panel"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-gray-400 font-medium leading-none mb-1 mr-1">v1.2.0</div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors leading-none"
                >
                  Log ud
                  <LogOut className="h-4 w-4 ml-2" />
                </button>
              </div>
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
                      {boat.image_url ? (
                        <img src={boat.image_url} alt={boat.name} className="w-full h-full object-cover" />
                      ) : (
                        <Ship className="h-24 w-24 text-gray-300" />
                      )}
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
                      
                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleOpenTab(boat, 'booking')}
                          className="w-full flex items-center justify-center px-2 py-2 border border-blue-100 rounded-md shadow-sm text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none transition-colors"
                        >
                          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                          Kalender
                        </button>
                        <button 
                          onClick={() => handleOpenTab(boat, 'logbook')}
                          className="w-full flex items-center justify-center px-2 py-2 border border-green-100 rounded-md shadow-sm text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Logbog
                        </button>
                        <button 
                          onClick={() => handleOpenTab(boat, 'tasks')}
                          className="w-full flex items-center justify-center px-2 py-2 border border-purple-100 rounded-md shadow-sm text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Drift & Opgaver
                        </button>
                        <button 
                          onClick={() => handleOpenTab(boat, 'expenses')}
                          className="w-full flex items-center justify-center px-2 py-2 border border-orange-100 rounded-md shadow-sm text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Fællesøkonomi
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
              <div>
                {/* TABS */}
                <div className="flex flex-wrap space-x-1 border-b border-gray-200 mb-6 bg-gray-50/80 p-1 rounded-t-lg">
                  <button onClick={() => setActiveTab('booking')} className={`px-4 py-2.5 text-sm font-medium rounded-md transition ${activeTab === 'booking' ? 'bg-white shadow-sm text-blue-600 border border-gray-100' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>Kalender</button>
                  <button onClick={() => setActiveTab('logbook')} className={`px-4 py-2.5 text-sm font-medium rounded-md transition ${activeTab === 'logbook' ? 'bg-white shadow-sm text-blue-600 border border-gray-100' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>Logbog</button>
                  <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2.5 text-sm font-medium rounded-md transition ${activeTab === 'tasks' ? 'bg-white shadow-sm text-blue-600 border border-gray-100' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>Drift & Opgaver</button>
                  <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2.5 text-sm font-medium rounded-md transition ${activeTab === 'expenses' ? 'bg-white shadow-sm text-blue-600 border border-gray-100' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>Fællesøkonomi</button>
                </div>
                
                {/* INDHOLD AFHÆNGIG AF TAB */}
                {activeTab === 'booking' && (
                  <div>
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
                )}

                {activeTab === 'logbook' && (
                  <div>
                    <BoatLogbook 
                       boatId={activeBoat.id}
                       userId={user.id}
                       isBaadsmand={activeBoat.boat_members?.[0]?.member_role === 'baadsmand'}
                    />
                  </div>
                )}
                
                {activeTab === 'tasks' && (
                  <BoatTasks 
                    boatId={activeBoat.id}
                    userId={user.id}
                    isBaadsmand={activeBoat.boat_members?.[0]?.member_role === 'baadsmand'}
                  />
                )}
                
                {activeTab === 'expenses' && (
                  <BoatExpenses 
                    boatId={activeBoat.id}
                    userId={user.id}
                    isBaadsmand={activeBoat.boat_members?.[0]?.member_role === 'baadsmand'}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* iOS Install Prompt Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 pb-12 sm:items-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in relative">
            <button onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              ✕
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Installer på iPhone</h3>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Føj appen til din hjemmeskærm for den bedste oplevelse.
            </p>
            <ol className="space-y-4 text-sm text-gray-700 mb-6 bg-gray-50 p-4 rounded-xl">
              <li className="flex items-center">
                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 shrink-0">1</span>
                <span>Tryk på Del-ikonet (<Share className="inline w-4 h-4 mx-1" />) i bunden af Safari.</span>
              </li>
              <li className="flex items-center">
                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 shrink-0">2</span>
                <span>Scroll ned og vælg <strong>"Føj til hjemmeskærm"</strong>.</span>
              </li>
            </ol>
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition"
            >
              Forstået
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
