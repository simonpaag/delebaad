import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Settings, Users, Ship, Anchor, LogOut, Plus, Trash2, Mail, LayoutGrid } from 'lucide-react'
function TabBoats() {
  const [boats, setBoats] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [newBoat, setNewBoat] = useState({ name: '', description: '', location: '' })
  
  async function fetchData() {
    setLoading(true)
    // Hent både
    const { data: bData } = await supabase.from('boats').select(`
      *,
      boat_members (
         user_id,
         member_role,
         profiles ( name )
      )
    `)
    // Hent brugere (til dropdown)
    const { data: uData } = await supabase.from('profiles').select('*')
    
    if (bData) setBoats(bData)
    if (uData) setAllUsers(uData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

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
                 <h4 className="font-bold text-xl">{boat.name}</h4>
                 <p className="text-sm text-gray-500 my-1">{boat.location}</p>
                 <p className="text-gray-600 text-sm">{boat.description}</p>
               </div>
               <button onClick={() => handleDeleteBoat(boat.id)} className="mt-4 flex items-center text-red-600 text-sm hover:underline">
                 <Trash2 className="h-4 w-4 mr-1" /> Slet båd
               </button>
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
    </div>
  )
}

function TabUsers() {
  const [users, setUsers] = useState([])
  
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

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Navn</th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Rolle</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map(u => (
            <tr key={u.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name || '-'}</td>
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
  const [newTicket, setNewTicket] = useState({ title: '', description: '' })
  
  const columns = ['Ideas&bugs', 'Tickets', 'In production', 'Testing', 'Done']

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

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('ticketId', ticketId)
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
        <form onSubmit={handleCreateTicket} className="flex gap-4 items-start">
          <div className="flex-1 space-y-3">
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
                   onDragStart={(e) => handleDragStart(e, ticket.id)}
                   className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-400 transition"
                 >
                   <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">{ticket.title}</h5>
                      <button onClick={() => handleDeleteTicket(ticket.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                   </div>
                   {ticket.description && <p className="text-xs text-gray-600">{ticket.description}</p>}
                 </div>
               ))}
               {tickets.filter(t => t.status === col).length === 0 && !loading && (
                 <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded">Træk hertil</div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('boats')
  
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
        
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" /> Log ud
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center md:block">
             <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                 {activeTab === 'boats' ? 'Både & Tilknytninger' : activeTab === 'users' ? 'Brugere' : activeTab === 'kanban' ? 'Opgaver / Kanban' : 'Indstillinger'}
               </h1>
             </div>
             
             {/* Simpelt mobile menu alternativ (Logout via link istedet) */}
             <div className="md:hidden flex space-x-2 border-b w-full mt-4 pb-2">
                 {['boats','users','kanban','settings'].map(t => (
                   <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 text-sm rounded capitalize ${activeTab === t ? 'bg-blue-100 text-blue-800' : 'text-gray-500'}`}>{t}</button>
                 ))}
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
    </div>
  )
}
