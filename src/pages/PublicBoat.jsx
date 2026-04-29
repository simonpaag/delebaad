import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BookingCalendar from '../components/BookingCalendar'
import { Ship, MapPin, Anchor, Loader2 } from 'lucide-react'

export default function PublicBoat() {
  const { id } = useParams()
  const [boat, setBoat] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true)
      try {
        // Hent båd detaljer (kræver public læse-rettighed)
        const { data: boatData, error: boatError } = await supabase
          .from('boats')
          .select('*')
          .eq('id', id)
          .single()

        if (boatError) throw boatError
        setBoat(boatData)

        // Hent bookinger for båden (kræver public læse-rettighed)
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('boat_id', id)

        if (bookingsError) throw bookingsError
        setBookings(bookingsData)
      } catch (err) {
        console.error("Fejl ved hentning af offentlig båd:", err)
        setError("Kunne ikke finde båden. Den er muligvis fjernet eller du mangler rettigheder.")
      } finally {
        setLoading(false)
      }
    }

    fetchPublicData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-medium text-gray-700">Henter bådens data...</h2>
      </div>
    )
  }

  if (error || !boat) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Anchor className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Båden blev ikke fundet</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                Gå til login
            </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Billede */}
            <div className="w-full md:w-1/3 h-48 md:h-64 bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center flex-shrink-0 relative">
              {boat.image_url ? (
                <img src={boat.image_url} alt={boat.name} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <Ship className="h-20 w-20 text-gray-300" />
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                Delebåd
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                {boat.name}
              </h1>
              <div className="flex items-center text-gray-600 font-medium text-lg mb-6">
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                {boat.location || 'Ukendt lokation'}
              </div>
              <p className="text-gray-600 text-base leading-relaxed max-w-2xl">
                {boat.description || 'Der er endnu ikke tilføjet en beskrivelse til denne båd.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    Kalender og Tilgængelighed
                </h2>
                <p className="text-gray-500 mb-8 max-w-3xl">
                    Se kalenderen nedenfor for at finde ud af, hvornår båden er ledig. Du skal være medlem og logget ind for at kunne foretage en booking.
                </p>
                
                <BookingCalendar 
                  bookings={bookings} 
                  userId={null} // Public brugere har ikke et userId
                  onBook={null} // Null gør kalenderen read-only
                  loading={loading}
                  isBaadsmand={false}
                />
            </div>
            
            {/* Call to action */}
            <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Vil du med ud at sejle?</h3>
                    <p className="text-sm text-gray-600 mt-1">Log ind for at reservere tidspunkter på båden.</p>
                </div>
                <Link 
                    to="/login"
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors text-center"
                >
                    Log ind for at booke
                </Link>
            </div>
        </div>
      </div>
    </div>
  )
}
