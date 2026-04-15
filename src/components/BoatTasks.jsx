import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Clock, PlayCircle, Plus, Trash2, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'

export default function BoatTasks({ boatId, userId, isBaadsmand }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const [isAdding, setIsAdding] = useState(false)

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('boat_tasks')
      .select(`
        *,
        creator:created_by(name)
      `)
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })
      
    if (error) console.error(error)
    else setTasks(data || [])
    
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchTasks()
  }, [boatId])

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return

    const { error } = await supabase.from('boat_tasks').insert({
      boat_id: boatId,
      created_by: userId,
      title: newTask.title,
      description: newTask.description
    })

    if (error) alert(error.message)
    else {
      setNewTask({ title: '', description: '' })
      setIsAdding(false)
      fetchTasks()
    }
  }

  const handleUpdateStatus = async (taskId, newStatus) => {
    const { error } = await supabase.from('boat_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
      
    if (error) alert(error.message)
    else fetchTasks()
  }

  const handleDelete = async (taskId) => {
    if(!window.confirm('Slet denne opgave permament?')) return
    const { error } = await supabase.from('boat_tasks').delete().eq('id', taskId)
    if (error) alert(error.message)
    else fetchTasks()
  }

  const renderTaskColumn = (status, title, icon, colorClass, nextStatusLabel, nextStatusAction) => {
    const columnTasks = tasks.filter(t => t.status === status)
    
    return (
      <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 min-h-[400px]">
        <h3 className={`font-bold flex items-center mb-4 ${colorClass}`}>
          {icon} <span className="ml-2">{title}</span> <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 border">{columnTasks.length}</span>
        </h3>
        
        <div className="space-y-3">
          {columnTasks.map(task => (
             <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors group">
               <div className="flex justify-between items-start">
                 <h4 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h4>
                 {(task.created_by === userId || isBaadsmand) && (
                   <button onClick={() => handleDelete(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                   </button>
                 )}
               </div>
               {task.description && <p className="text-xs text-gray-600 line-clamp-3 mb-3">{task.description}</p>}
               
               <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-50">
                 <div className="text-[10px] text-gray-400 flex flex-col">
                   <span>Oprettet be {task.creator?.name || 'Bruger'}</span>
                   <span>{format(parseISO(task.created_at), 'd. MMM yyyy', { locale: da })}</span>
                 </div>
                 
                 {nextStatusAction && (
                   <button 
                     onClick={() => handleUpdateStatus(task.id, nextStatusAction)}
                     className="text-xs bg-white text-gray-700 border hover:bg-gray-50 px-2 py-1 rounded shadow-sm transition-colors"
                   >
                     {nextStatusLabel}
                   </button>
                 )}
               </div>
             </div>
          ))}
          {columnTasks.length === 0 && <p className="text-xs text-center text-gray-400 italic py-4">Ingen opgaver</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h3 className="text-lg font-bold text-gray-900">Drift & Opgaver</h3>
           <p className="text-sm text-gray-500">Hold styr på forårsklargøring og mangler.</p>
        </div>
        <button 
           onClick={() => setIsAdding(!isAdding)}
           className="bg-blue-600 text-white px-4 py-2 flex items-center rounded hover:bg-blue-700 text-sm"
        >
          {isAdding ? 'Annuller' : <><Plus className="w-4 h-4 mr-1"/> Opret Opgave</>}
        </button>
      </div>

      {isAdding && (
         <form onSubmit={handleCreateTask} className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
           <input required type="text" placeholder="Opgavens Titel (fx. Polering af skrog)" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full p-2 border rounded" />
           <textarea placeholder="Beskrivelse (valgfrit)" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full p-2 border rounded" rows="2" />
           <button disabled={loading} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Gem Opgave</button>
         </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Indlæser opgaver...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderTaskColumn('pending', 'To-Do', <Clock className="w-5 h-5"/>, 'text-gray-700', 'Start', 'in_progress')}
          {renderTaskColumn('in_progress', 'I gang', <PlayCircle className="w-5 h-5"/>, 'text-blue-600', 'Færdiggør', 'completed')}
          {renderTaskColumn('completed', 'Færdig', <CheckCircle2 className="w-5 h-5"/>, 'text-green-600', null, null)}
        </div>
      )}
    </div>
  )
}
