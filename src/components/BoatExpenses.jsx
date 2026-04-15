import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, Landmark, Plus, Trash2, Receipt } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'

export default function BoatExpenses({ boatId, userId, isBaadsmand }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' })
  
  // Calculate balances
  const [balances, setBalances] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)

  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('boat_expenses')
      .select(`
        *,
        payer:paid_by_user_id(name)
      `)
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error(error)
    } else {
      setExpenses(data || [])
      calculateBalances(data || [])
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchExpenses()
  }, [boatId])

  const calculateBalances = (data) => {
    let total = 0
    const userTotals = {}
    
    data.forEach(exp => {
      const amt = Number(exp.amount) || 0
      total += amt
      
      const userName = exp.payer?.name || 'Ukendt'
      if (!userTotals[userName]) userTotals[userName] = 0
      userTotals[userName] += amt
    })
    
    setTotalSpent(total)
    
    // Konvertér til array for nem rendering
    const balanceArr = Object.keys(userTotals).map(name => ({
      name,
      amount: userTotals[name]
    })).sort((a,b) => b.amount - a.amount)
    
    setBalances(balanceArr)
  }

  const handleCreateExpense = async (e) => {
    e.preventDefault()
    if (!newExpense.amount || !newExpense.description.trim()) return

    const { error } = await supabase.from('boat_expenses').insert({
      boat_id: boatId,
      paid_by_user_id: userId,
      amount: Number(newExpense.amount),
      description: newExpense.description
    })

    if (error) alert(error.message)
    else {
      setNewExpense({ amount: '', description: '' })
      setIsAdding(false)
      fetchExpenses()
    }
  }

  const handleDelete = async (expId) => {
    if(!window.confirm('Slet denne udgift? Det vil ændre regnskabet for alle.')) return
    const { error } = await supabase.from('boat_expenses').delete().eq('id', expId)
    if (error) alert(error.message)
    else fetchExpenses()
  }

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
           <h3 className="text-xl font-bold text-gray-900">Bådens Økonomi</h3>
           <p className="text-sm text-gray-500">Hold styr på udlæg til vedligehold, bådplads og reparationer.</p>
        </div>
        <button 
           onClick={() => setIsAdding(!isAdding)}
           className="bg-green-600 text-white px-4 py-2 flex items-center rounded hover:bg-green-700 text-sm font-medium shadow-sm transition"
        >
          {isAdding ? 'Annuller' : <><Plus className="w-5 h-5 mr-1"/> Nyt Udlæg</>}
        </button>
      </div>

      {isAdding && (
         <form onSubmit={handleCreateExpense} className="mb-8 p-6 bg-green-50 border border-green-100 rounded-xl flex gap-4 items-end shadow-sm">
           <div className="flex-1">
             <label className="block text-xs font-semibold text-green-800 mb-1">Hvad er der købt?</label>
             <input required type="text" placeholder="Fx. Bundmaling eller Havneleje..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full p-2.5 border border-green-200 rounded-lg focus:ring-green-500" />
           </div>
           <div className="w-32">
             <label className="block text-xs font-semibold text-green-800 mb-1">Beløb (kr)</label>
             <input required type="number" min="1" step="1" placeholder="450" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full p-2.5 border border-green-200 rounded-lg focus:ring-green-500" />
           </div>
           <button disabled={loading} type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-medium">Tilføj</button>
         </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Indlæser udgifter...</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Venstre: Kvitteringsliste */}
          <div className="flex-1 order-2 md:order-1">
            <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-gray-500" /> Historik over udlæg
            </h4>
            
            {expenses.length === 0 ? (
              <div className="text-center bg-gray-50 py-10 rounded-xl border border-dashed border-gray-200 text-gray-500 italic">
                 Der er endnu ikke tilføjet nogle udlæg.
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(exp => (
                   <div key={exp.id} className="bg-white border hover:border-gray-300 rounded-lg p-4 flex justify-between items-center group transition shadow-sm">
                     <div className="flex items-center">
                       <div className="bg-gray-100 p-2 rounded-full mr-4">
                         <DollarSign className="w-5 h-5 text-gray-600" />
                       </div>
                       <div>
                         <p className="font-semibold text-gray-900">{exp.description}</p>
                         <p className="text-xs text-gray-500 mt-1">
                            Lagt ud af <span className="font-medium">{exp.payer?.name || 'Bruger'}</span> den {format(parseISO(exp.created_at), 'd. MMM yyyy', { locale: da })}
                         </p>
                       </div>
                     </div>
                     <div className="flex flex-col items-end">
                       <span className="font-bold text-gray-900 text-lg">{Number(exp.amount).toLocaleString('da-DK')} kr.</span>
                       {(exp.paid_by_user_id === userId || isBaadsmand) && (
                         <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition mt-1">Slet række</button>
                       )}
                     </div>
                   </div>
                ))}
              </div>
            )}
          </div>

          {/* Højre: Opsamling / Balance */}
          <div className="w-full md:w-80 order-1 md:order-2">
            <div className="bg-gray-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
               <Landmark className="absolute top-[-20px] right-[-20px] w-32 h-32 opacity-10" />
               <h4 className="font-semibold text-blue-300 mb-1 uppercase tracking-wider text-xs">Total for båden</h4>
               <p className="text-4xl font-light mb-8">{totalSpent.toLocaleString('da-DK')} <span className="text-xl">kr.</span></p>
               
               <h4 className="font-medium text-gray-300 mb-3 border-b border-gray-700 pb-2 text-sm">Hvem har lagt ud?</h4>
               <ul className="space-y-2">
                 {balances.map(b => (
                   <li key={b.name} className="flex justify-between items-center text-sm">
                     <span className="text-gray-300">{b.name}</span>
                     <span className="font-medium bg-gray-800 px-2 py-1 rounded text-gray-200">{b.amount.toLocaleString('da-DK')} kr</span>
                   </li>
                 ))}
                 {balances.length === 0 && <li className="text-gray-500 text-xs italic">Ingen udlæg</li>}
               </ul>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">Beløbene viser det totale udlæg foretaget af hver person.</p>
          </div>
          
        </div>
      )}
    </div>
  )
}
