import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send, Trash2, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'

export default function BoatLogbook({ boatId, userId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLog, setNewLog] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('boat_logs')
      .select(`
        *,
        profiles:user_id (name)
      `)
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Fejl ved hentning af logbog:', error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchLogs()
  }, [boatId])



  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newLog.trim()) return

    const { error } = await supabase
      .from('boat_logs')
      .insert({
        boat_id: boatId,
        user_id: userId,
        content: newLog
      })

    if (error) {
      alert('Fejl ved oprettelse af log: ' + error.message)
    } else {
      setNewLog('')
      fetchLogs()
    }
  }

  const handleDelete = async (logId) => {
    if (!window.confirm('Vil du slette denne besked?')) return
    const { error } = await supabase
      .from('boat_logs')
      .delete()
      .eq('id', logId)

    if (error) {
      alert('Fejl: ' + error.message)
    } else {
      fetchLogs()
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-sm">
      <div className="bg-white p-4 border-b border-gray-200 flex items-center">
        <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-bold text-gray-900">Bådens Logbog</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Indlæser logbog...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8 italic">Ingen beskeder endnu. Skriv den første!</div>
        ) : (
          logs.map(log => (
             <div key={log.id} className={`p-4 rounded-xl shadow-sm border ${log.user_id === userId ? 'bg-blue-50 border-blue-100 ml-12 rounded-tr-none' : 'bg-white border-gray-100 mr-12 rounded-tl-none'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm text-gray-900">{log.profiles?.name || 'Bruger'}</span>
                <div className="flex items-center text-[10px] text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(parseISO(log.created_at), 'd. MMM yy HH:mm', { locale: da })}
                </div>
              </div>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{log.content}</p>
              {log.user_id === userId && (
                <div className="mt-2 text-right">
                  <button onClick={() => handleDelete(log.id)} className="text-xs text-red-500 hover:text-red-700 opacity-0 hover:opacity-100 transition-opacity">
                    Slet
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input 
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            placeholder="Skriv til de andre (fx. om brændstof eller småfejl)..."
            value={newLog}
            onChange={(e) => setNewLog(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!newLog.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
