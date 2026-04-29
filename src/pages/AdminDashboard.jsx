import React, { useState, useEffect } from 'react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Settings, Users, Ship, Anchor, LogOut, Plus, Trash2, Mail, LayoutGrid, Copy, Edit2, Download, Share, Calendar as CalendarIcon, X } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../contexts/AuthContext'
import BookingCalendar from '../components/BookingCalendar'
function TabBoats() {
  const [boats, setBoats] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  // Form state
  const [newBoat, setNewBoat] = useState({ name: '', description: '', location: '' })
  
  // Edit state
  const [editingBoat, setEditingBoat] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Calendar state
  const [activeCalendarBoat, setActiveCalendarBoat] = useState(null)
  const [calendarBookings, setCalendarBookings] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  
  async function fetchData() {
    setLoading(true)
    // Hent både
    const { data: bData, error: bError } = await supabase.from('boats').select(`
      *,
      boat_members (
         user_id,
         member_role,
         profiles ( name )
      )
    `)
    
    if (bError) {
      console.error("Fejl ved hentning af både:", bError)
      alert("Fejl ved hentning af både: " + bError.message)
    }

    // Hent brugere (til dropdown)
    const { data: uData, error: uError } = await supabase.from('profiles').select('*')
    if (uError) {
      console.error("Fejl ved hentning af brugere:", uError)
    }
    
    if (bData) setBoats(bData)
    if (uData) setAllUsers(uData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  console.log("Current boats state:", boats)

  const handleCreateBoat = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('boats').insert(newBoat)
      if (!error) {
        setNewBoat({ name: '', description: '', location: '' })
        await fetchData()
      } else {
        console.error("Supabase insert error:", error)
        alert('Kunne ikke gemme båd: ' + error.message)
        setLoading(false)
      }
    } catch (err) {
      console.error("JS exception during insert:", err)
      alert('Systemfejl: ' + err.message)
      setLoading(false)
    }
  }

  const handleDeleteBoat = async (id) => {
    if(!window.confirm('Slet båden permanent?')) return
    await supabase.from('boats').delete().eq('id', id)
    fetchData()
  }

  const handleAddMember = async (boatId, userId, role) => {
    if (!userId) return
    const { error } = await supabase.from('boat_members').insert({ boat_id: boatId, user_id: userId, member_role: role })
    if (error) alert(error.message)
    fetchData()
  }

  const handleRemoveMember = async (boatId, userId) => {
    await supabase.from('boat_members').delete().match({ boat_id: boatId, user_id: userId })
    fetchData()
  }

  const handleUpdateBoat = async (e) => {
    e.preventDefault()
    if (!editingBoat) return
    setLoading(true)
    
    const { error } = await supabase.from('boats').update({
      name: editingBoat.name,
      location: editingBoat.location,
      description: editingBoat.description
    }).eq('id', editingBoat.id)
    
    if (!error) {
      setEditingBoat(null)
      fetchData()
    } else {
      alert("Fejl ved opdatering: " + error.message)
      setLoading(false)
    }
  }

  const handleBoatImageUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploadingImage(true)
    
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${editingBoat.id}-${Date.now()}.${fileExt}`
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('boat_images')
        .upload(fileName, file)
        
      if (uploadError) throw uploadError
      
      const { data: publicUrlData } = supabase.storage
        .from('boat_images')
        .getPublicUrl(fileName)
        
      const imageUrl = publicUrlData.publicUrl
      
      const { error: updateError } = await supabase
        .from('boats')
        .update({ image_url: imageUrl })
        .eq('id', editingBoat.id)
        
      if (updateError) throw updateError
      
      setEditingBoat({ ...editingBoat, image_url: imageUrl })
      setBoats(prev => prev.map(b => b.id === editingBoat.id ? { ...b, image_url: imageUrl } : b))
    } catch (err) {
      alert("Kunne ikke uploade billede: " + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // Kalender logik for Admin
  const fetchBoatBookings = async (boatId) => {
    setCalendarLoading(true)
    const { data, error } = await supabase.from('bookings').select('*').eq('boat_id', boatId)
    if (!error && data) {
      setCalendarBookings(data)
    }
    setCalendarLoading(false)
  }

  const handleOpenCalendar = (boat) => {
    setActiveCalendarBoat(boat)
    fetchBoatBookings(boat.id)
  }

  const handleCreateAdminBooking = async (bookingData) => {
    setCalendarLoading(true)
    // Opretter en booking med adminens user_id
    const { error } = await supabase.from('bookings').insert({
        boat_id: activeCalendarBoat.id,
        user_id: user.id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date
    })
    
    if (error) {
        alert("Fejl ved oprettelse af booking: " + error.message)
    } else {
        fetchBoatBookings(activeCalendarBoat.id)
    }
    setCalendarLoading(false)
  }

  const handleDeleteAdminBooking = async (bookingId) => {
    if(!window.confirm('Slet denne booking permanent?')) return
    setCalendarLoading(true)
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
    if (error) {
        alert("Fejl ved sletning af booking: " + error.message)
    } else {
        fetchBoatBookings(activeCalendarBoat.id)
    }
    setCalendarLoading(false)
  }

  return (
    <div className="space-y-8 fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Plus className="mr-2 h-5 w-5 text-blue-600" /> Opret Båd
        </h3>
        <form onSubmit={handleCreateBoat} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required type="text" placeholder="Bådens Navn" value={newBoat.name} onChange={e => setNewBoat({...newBoat, name: e.target.value})} className="p-2 border rounded-md" />
          <input type="text" placeholder="Lokation" value={newBoat.location} onChange={e => setNewBoat({...newBoat, location: e.target.value})} className="p-2 border rounded-md" />
          <input type="text" placeholder="Kort beskrivelse" value={newBoat.description} onChange={e => setNewBoat({...newBoat, description: e.target.value})} className="p-2 border rounded-md" />
          <button disabled={loading} type="submit" className="md:col-span-3 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition">Gem Båd</button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Eksisterende Både</h3>
        {loading ? <div className="text-gray-500">Indlæser...</div> : boats.map(boat => (
          <div key={boat.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
            <div className="p-6 md:w-1/2 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100">
                <div>
                 {boat.image_url && (
                   <div className="mb-4 rounded-lg overflow-hidden border border-gray-100 max-w-sm">
                     <img src={boat.image_url} alt={boat.name} className="w-full h-48 object-cover" />
                   </div>
                 )}
                 <h4 className="font-bold text-xl">{boat.name}</h4>
                 <p className="text-sm text-gray-500 my-1">{boat.location}</p>
                 <p className="text-gray-600 text-sm">{boat.description}</p>
               </div>
               <div className="mt-4 flex items-center space-x-4">
                 <button onClick={() => handleOpenCalendar(boat)} className="flex items-center text-green-600 text-sm hover:underline">
                   <CalendarIcon className="h-4 w-4 mr-1" /> Kalender
                 </button>
                 <button onClick={() => setEditingBoat(boat)} className="flex items-center text-blue-600 text-sm hover:underline">
                   <Edit2 className="h-4 w-4 mr-1" /> Rediger
                 </button>
                 <button onClick={() => handleDeleteBoat(boat.id)} className="flex items-center text-red-600 text-sm hover:underline">
                   <Trash2 className="h-4 w-4 mr-1" /> Slet båd
                 </button>
               </div>
            </div>
            
            <div className="p-6 md:w-1/2 bg-gray-50">
               <h5 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wide">Medlemmer med adgang</h5>
               <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                 {boat.boat_members?.length === 0 && <span className="text-xs text-gray-400">Ingen tilknyttet</span>}
                 {boat.boat_members?.map(member => (
                   <li key={member.user_id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100">
                     <span>
                       {member.profiles?.name || 'Ukendt Bruger'}
                       <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${member.member_role === 'baadsmand' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                         {member.member_role === 'baadsmand' ? 'Bådsmand' : 'Sejler'}
                       </span>
                     </span>
                     <button onClick={() => handleRemoveMember(boat.id, member.user_id)} className="text-red-500 hover:text-red-700 p-1">
                       <Trash2 className="h-3 w-3" />
                     </button>
                   </li>
                 ))}
               </ul>
               
               <div className="flex gap-2">
                 <select id={`select-${boat.id}`} className="flex-1 p-2 text-sm border rounded" defaultValue="">
                   <option value="" disabled>-- Vælg bruger --</option>
                   {allUsers.filter(u => !boat.boat_members?.find(bm => bm.user_id === u.id)).map(u => (
                     <option key={u.id} value={u.id}>{u.name || 'Ukendt'} ({u.id.substring(0,6)}...)</option>
                   ))}
                 </select>
                 <select id={`role-${boat.id}`} className="w-28 p-2 text-sm border rounded">
                   <option value="sejler">Sejler</option>
                   <option value="baadsmand">Bådsmand</option>
                 </select>
                 <button 
                   onClick={() => {
                     const val = document.getElementById(`select-${boat.id}`).value;
                     const role = document.getElementById(`role-${boat.id}`).value;
                     if(val) handleAddMember(boat.id, val, role);
                   }} 
                   className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                 >
                   Tilføj
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rediger Båd Modal */}
      {editingBoat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 sm:p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
               <Ship className="mr-2 h-5 w-5 text-blue-600" /> Rediger Båd
            </h3>
            
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bådens Billede</label>
              {editingBoat.image_url && (
                <img src={editingBoat.image_url} alt="Båd" className="w-full h-40 object-cover rounded mb-3 border border-gray-200" />
              )}
              <div className="flex items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBoatImageUpload} 
                  disabled={uploadingImage}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
                {uploadingImage && <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full ml-3"></div>}
              </div>
            </div>

            <form onSubmit={handleUpdateBoat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                <input 
                  required 
                  type="text" 
                  value={editingBoat.name} 
                  onChange={e => setEditingBoat({...editingBoat, name: e.target.value})} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokation</label>
                <input 
                  type="text" 
                  value={editingBoat.location || ''} 
                  onChange={e => setEditingBoat({...editingBoat, location: e.target.value})} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                <textarea 
                  rows="3"
                  value={editingBoat.description || ''} 
                  onChange={e => setEditingBoat({...editingBoat, description: e.target.value})} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingBoat(null)} 
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                >
                  Annuller
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Gem oplysninger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KALENDER MODAL */}
      {activeCalendarBoat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-2 text-green-600" />
                Kalender: {activeCalendarBoat.name}
              </h2>
              <button onClick={() => setActiveCalendarBoat(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-2 sm:p-6">
              <BookingCalendar 
                 bookings={calendarBookings}
                 onBook={handleCreateAdminBooking}
                 onDeleteBooking={handleDeleteAdminBooking}
                 userId={user?.id}
                 loading={calendarLoading}
                 isBaadsmand={true} // Giver fuld adgang til at se/slette andres reservationer
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabUsers() {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ name: '', email: '' })
  const [isCreating, setIsCreating] = useState(false)
  
  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if(data) setUsers(data)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleChangeRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      // Opret midlertidig forbindelse der ikke ændrer adminens session
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      })

      const tempPassword = 'Delebaad2026!'
      
      const { data, error } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: tempPassword,
        options: {
          data: {
            full_name: newUser.name
          }
        }
      })

      if (error) {
        throw error
      }

      alert(`Brugeren ${newUser.name} blev oprettet!\n\nEmail: ${newUser.email}\nMidlertidig kode: ${tempPassword}\n\nHusk at bede brugeren ændre sin kode når de logger ind. (Hvis Confirm Email er slået til i Supabase, skal de dog først bekræfte deres email via det link de lige har modtaget).`)
      setNewUser({ name: '', email: '' })
      
      // Vent lidt for at lade triggers køre i databasen
      setTimeout(fetchUsers, 1000)
    } catch (err) {
      alert("Fejl ved oprettelse af bruger: " + err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-8 fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Users className="mr-2 h-5 w-5 text-blue-600" /> Opret Ny Bruger
        </h3>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required type="text" placeholder="Fulde Navn" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="p-2 border rounded-md" />
          <input required type="email" placeholder="Email-adresse" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="p-2 border rounded-md" />
          <button disabled={isCreating} type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition flex justify-center items-center">
            {isCreating ? 'Opretter...' : 'Opret Bruger & Generer Kode'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Eksisterende Brugere</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Navn</th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Rolle</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map(u => (
            <tr key={u.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{u.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <select 
                  value={u.role} 
                  onChange={(e) => handleChangeRole(u.id, e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
    </div>
  )
}

function TabSettings() {
  const [settings, setSettings] = useState({ platform_name: '', maintenance_mode: false })
  const [loading, setLoading] = useState(true)

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if(data) setSettings(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const saveSettings = async () => {
    await supabase.from('settings').update({
      platform_name: settings.platform_name,
      maintenance_mode: settings.maintenance_mode
    }).eq('id', settings.id)
    alert('Gemt!')
  }

  if(loading) return null

  return (
    <div className="bg-white p-6 md:p-10 rounded-xl shadow-sm border max-w-2xl">
      <div className="mb-6 border-b pb-4">
         <h3 className="text-xl font-bold text-gray-900">Platform Indstillinger</h3>
         <p className="text-gray-500 text-sm">Disse indstillinger påvirker hele netværket.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platformsnavn</label>
          <input 
             type="text" 
             value={settings.platform_name || ''} 
             onChange={e => setSettings({...settings, platform_name: e.target.value})}
             className="w-full border-gray-300 rounded-md shadow-sm p-3 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div className="flex items-center">
          <input 
             type="checkbox" 
             id="maintenance" 
             checked={settings.maintenance_mode} 
             onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})}
             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
          />
          <label htmlFor="maintenance" className="ml-2 block text-sm text-gray-900">
            Aktivér Vedligeholdelsestilstand
          </label>
        </div>

        <button onClick={saveSettings} className="bg-blue-600 text-white font-medium py-2 px-6 rounded-md hover:bg-blue-700 transition">
          Gem ændringer
        </button>
      </div>
    </div>
  )
}

function TabKanban() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingImageFor, setUploadingImageFor] = useState(null)
  const [editingTicket, setEditingTicket] = useState(null)
  const [newTicket, setNewTicket] = useState({ title: '', description: '' })
  
  const columns = ['Ideas&bugs', 'Tickets', 'Done']

  async function fetchTickets() {
    setLoading(true)
    const { data } = await supabase.from('admin_tickets').select('*').order('created_at', { ascending: false })
    if (data) setTickets(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!newTicket.title) return
    const { error } = await supabase.from('admin_tickets').insert({
      title: newTicket.title,
      description: newTicket.description,
      status: 'Ideas&bugs'
    })
    if (!error) {
      setNewTicket({ title: '', description: '' })
      fetchTickets()
    } else {
      alert("Fejl ved oprettelse: " + error.message)
    }
  }

  const handleDeleteTicket = async (id) => {
    if(!window.confirm('Slet opgave permanent?')) return
    await supabase.from('admin_tickets').delete().eq('id', id)
    fetchTickets()
  }

  const handleTicketPaste = async (e, ticketId) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (!imageFile) return;

    e.preventDefault();
    setUploadingImageFor(ticketId);

    const fileExt = imageFile.name.split('.').pop() || 'png';
    const fileName = `${ticketId}-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('kanban_images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('kanban_images')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('admin_tickets')
        .update({ image_url: imageUrl })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, image_url: imageUrl } : t));
    } catch (err) {
      alert("Fejl ved upload af billede: " + err.message);
    } finally {
      setUploadingImageFor(null);
    }
  }

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('ticketId', ticketId)
  }

  const handleUpdateTicket = async (e) => {
    e.preventDefault()
    if (!editingTicket || !editingTicket.title) return
    
    const { error } = await supabase.from('admin_tickets').update({
      title: editingTicket.title,
      description: editingTicket.description
    }).eq('id', editingTicket.id)
    
    if (!error) {
      setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, title: editingTicket.title, description: editingTicket.description } : t))
      setEditingTicket(null)
    } else {
      alert("Fejl ved opdatering: " + error.message)
    }
  }

  const handleCopyTicket = (ticket) => {
    const textToCopy = `Titel: ${ticket.title}\nBeskrivelse: ${ticket.description || 'Ingen beskrivelse'}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Optional: kunnne vise en kort besked, men systemets standard er ofte fint
    }).catch(err => {
      console.error("Kunne ikke kopiere:", err);
    });
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    const ticketId = e.dataTransfer.getData('ticketId')
    if (!ticketId) return
    
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: targetStatus } : t))
    
    const { error } = await supabase.from('admin_tickets').update({ status: targetStatus }).eq('id', ticketId)
    if (error) {
       alert("Kunne ikke flytte opgave: " + error.message)
       fetchTickets()
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-6 fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Plus className="mr-2 h-5 w-5 text-blue-600" /> Opret Opgave
        </h3>
        <form onSubmit={handleCreateTicket} className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-3">
             <input required type="text" placeholder="Opgave titel" value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})} className="w-full p-2 border rounded-md" />
             <input type="text" placeholder="Kort beskrivelse (valgfri)" value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full p-2 border rounded-md text-sm text-gray-600" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Tilføj Opgave</button>
        </form>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[600px]">
        {columns.map(col => (
          <div 
            key={col} 
            className="flex-shrink-0 w-72 bg-gray-100 rounded-lg p-4 flex flex-col min-h-full border border-gray-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <h4 className="font-bold text-gray-700 mb-3 border-b border-gray-300 pb-2">{col}</h4>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
               {tickets.filter(t => t.status === col).map(ticket => (
                 <div 
                   key={ticket.id}
                   draggable
                   tabIndex={0}
                   onClick={() => setEditingTicket(ticket)}
                   onDragStart={(e) => handleDragStart(e, ticket.id)}
                   onPaste={(e) => handleTicketPaste(e, ticket.id)}
                   className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition group relative"
                 >
                   <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-sm text-gray-900 pr-2">{ticket.title}</h5>
                      <div className="flex space-x-2 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleCopyTicket(ticket); }} title="Kopiér til Antigravity" className="text-gray-400 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }} title="Slet opgave" className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                      </div>
                   </div>
                   {ticket.description && <p className="text-xs text-gray-600 mb-2">{ticket.description}</p>}
                   
                   {ticket.image_url && (
                     <div className="mt-2 rounded overflow-hidden border border-gray-100">
                       <img src={ticket.image_url} alt="Vedhæftet" className="w-full h-auto object-cover" />
                     </div>
                   )}
                   
                   {uploadingImageFor === ticket.id && (
                     <div className="mt-2 text-xs text-blue-500 flex items-center">
                        <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                        Uploader billede...
                     </div>
                   )}
                 </div>
               ))}
               {tickets.filter(t => t.status === col).length === 0 && !loading && (
                 <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded">Træk hertil</div>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Rediger Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 sm:p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rediger Opgave</h3>
            <form onSubmit={handleUpdateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input 
                  required 
                  type="text" 
                  value={editingTicket.title} 
                  onChange={e => setEditingTicket({...editingTicket, title: e.target.value})} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                <textarea 
                  rows="4"
                  value={editingTicket.description || ''} 
                  onChange={e => setEditingTicket({...editingTicket, description: e.target.value})} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Tilføj en længere beskrivelse..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingTicket(null)} 
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                >
                  Annuller
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Gem ændringer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('boats')
  const { isInstallable, promptInstall, isIOS } = useInstallPrompt()
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="flex items-center justify-center py-8 border-b border-gray-100">
          <Anchor className="h-8 w-8 text-blue-600 mr-2" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">Admin<span className="text-blue-600">Panel</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-3">
          <button onClick={() => setActiveTab('boats')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'boats' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Ship className="h-5 w-5 mr-3 flex-shrink-0" /> Både & Tilknytning
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Users className="h-5 w-5 mr-3 flex-shrink-0" /> Brugere
          </button>
          <button onClick={() => setActiveTab('kanban')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'kanban' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <LayoutGrid className="h-5 w-5 mr-3 flex-shrink-0" /> Opgaver / Kanban
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Settings className="h-5 w-5 mr-3 flex-shrink-0" /> Indstillinger
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-100 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 mb-2 font-mono uppercase tracking-widest">Platform v1.0.1</span>
          
          {(isInstallable || isIOS) && (
            <button 
              onClick={() => isIOS ? setShowIOSPrompt(true) : promptInstall()} 
              className="flex items-center w-full px-4 py-3 mb-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Download className="h-5 w-5 mr-3 flex-shrink-0" /> Installer App
            </button>
          )}

          <div className="text-xs text-gray-400 text-center mb-2">Version 1.2.0</div>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" /> Log ud
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center md:block">
             <div className="flex items-center mb-2 md:mb-0">
                {activeTab === 'boats' && <Ship className="h-6 w-6 text-blue-600 mr-2" />}
                {activeTab === 'users' && <Users className="h-6 w-6 text-blue-600 mr-2" />}
                {activeTab === 'kanban' && <LayoutGrid className="h-6 w-6 text-blue-600 mr-2" />}
                {activeTab === 'settings' && <Settings className="h-6 w-6 text-blue-600 mr-2" />}
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {activeTab === 'boats' ? 'Både og tilknytninger' : activeTab === 'users' ? 'Brugere' : activeTab === 'kanban' ? 'Opgaver / Kanban' : 'Indstillinger'}
                </h1>
             </div>
             
             {/* Simpelt mobile menu alternativ */}
             <div className="md:hidden mt-4">
                 <div className="flex overflow-x-auto space-x-2 border-b pb-2 no-scrollbar">
                   {['boats','users','kanban','settings'].map(t => (
                     <button key={t} onClick={() => setActiveTab(t)} className={`flex-shrink-0 px-3 py-1.5 text-sm rounded capitalize ${activeTab === t ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}>{t === 'boats' ? 'Både' : t === 'users' ? 'Brugere' : t}</button>
                   ))}
                 </div>
                 <div className="mt-3 flex justify-between items-center px-1">
                   <div className="text-xs text-gray-500">Logget ind som admin</div>
                   <button onClick={handleLogout} className="flex items-center text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">
                     <LogOut className="h-3.5 w-3.5 mr-1" /> Log ud
                   </button>
                 </div>
             </div>
          </header>
          
          <div className="mt-6">
            {activeTab === 'boats' && <TabBoats />}
            {activeTab === 'users' && <TabUsers />}
            {activeTab === 'kanban' && <TabKanban />}
            {activeTab === 'settings' && <TabSettings />}
          </div>
        </div>
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
              Føj platformen til din hjemmeskærm for den bedste oplevelse.
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
