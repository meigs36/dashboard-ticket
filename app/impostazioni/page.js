'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Bell, Moon, Sun, Globe, Monitor, Smartphone, 
  Save, AlertCircle, Check, Download, Trash2,
  Mail, MessageSquare, Calendar, Clock
} from 'lucide-react'

export default function ImpostazioniPage() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [salvato, setSalvato] = useState(false)

  const [impostazioni, setImpostazioni] = useState({
    // Notifiche
    notifiche_contratti_scadenza: true,
    notifiche_ore_esaurite: true,
    notifiche_ticket_assegnati: true,
    notifiche_ticket_urgenti: true,
    notifiche_interventi_oggi: true,
    notifiche_email: false,
    
    // Tema
    tema: 'light',
    
    // Display
    densita: 'normale',
    font_size: 'medium',
    
    // Preferenze
    lingua: 'it',
    timezone: 'Europe/Rome'
  })

  useEffect(() => {
    loadImpostazioni()
  }, [userProfile])

  async function loadImpostazioni() {
    if (!userProfile) return

    try {
      // Prova a caricare le impostazioni dal database
      const { data } = await supabase
        .from('utenti_impostazioni')
        .select('*')
        .eq('utente_id', userProfile.id)
        .single()

      if (data) {
        setImpostazioni(prev => ({ ...prev, ...data.impostazioni }))
      }
    } catch (error) {
      // Se non esistono impostazioni, usa i default
      console.log('Usando impostazioni default')
    }
  }

  async function handleSalva() {
    setLoading(true)

    try {
      // Salva le impostazioni nel database
      const { error } = await supabase
        .from('utenti_impostazioni')
        .upsert({
          utente_id: userProfile.id,
          impostazioni: impostazioni,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'utente_id'
        })

      if (error) throw error

      setSalvato(true)
      setTimeout(() => setSalvato(false), 3000)

      // Applica tema se cambiato
      if (impostazioni.tema === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error)
      alert('❌ Errore nel salvataggio delle impostazioni')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(campo, valore) {
    setImpostazioni(prev => ({ ...prev, [campo]: valore }))
  }

  async function handleEsportaDati() {
    if (!confirm('Vuoi esportare tutti i tuoi dati personali?\n\nRiceverai un file JSON con tutte le tue informazioni.')) {
      return
    }

    try {
      // Raccoglie dati utente
      const { data: userData } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', userProfile.id)
        .single()

      // Ticket assegnati
      const { data: ticketData } = await supabase
        .from('ticket')
        .select('*')
        .eq('tecnico_assegnato_id', userProfile.id)

      // Interventi
      const { data: interventiData } = await supabase
        .from('interventi')
        .select('*')
        .eq('tecnico_id', userProfile.id)

      const exportData = {
        utente: userData,
        ticket: ticketData || [],
        interventi: interventiData || [],
        esportato_il: new Date().toISOString()
      }

      // Download JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dati-personali-${userProfile.email}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('✅ Dati esportati con successo!')
    } catch (error) {
      console.error('Errore esportazione dati:', error)
      alert('❌ Errore nell\'esportazione dei dati')
    }
  }

  async function handleEliminaAccount() {
    const conferma1 = prompt('⚠️ ATTENZIONE: Questa azione è IRREVERSIBILE!\n\nSe sei sicuro di voler eliminare il tuo account, scrivi "ELIMINA" (tutto maiuscolo):')
    
    if (conferma1 !== 'ELIMINA') {
      return
    }

    const conferma2 = confirm('Sei ASSOLUTAMENTE sicuro?\n\nTutti i tuoi dati verranno eliminati definitivamente.')
    
    if (!conferma2) {
      return
    }

    try {
      // In produzione, questo dovrebbe essere gestito meglio
      // con una procedura di soft-delete e backup
      alert('⚠️ La funzionalità di eliminazione account deve essere completata da un amministratore per sicurezza.\n\nContatta il tuo amministratore di sistema.')
    } catch (error) {
      console.error('Errore eliminazione account:', error)
      alert('❌ Errore nell\'eliminazione dell\'account')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Impostazioni</h1>
          <p className="text-gray-600">Personalizza la tua esperienza e le preferenze dell'applicazione</p>
        </div>

        {/* Sezione Notifiche */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Bell className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifiche</h2>
              <p className="text-sm text-gray-600">Gestisci quali notifiche vuoi ricevere</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Contratti in scadenza */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Contratti in scadenza</p>
                <p className="text-sm text-gray-600">Ricevi alert quando un contratto sta per scadere</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={impostazioni.notifiche_contratti_scadenza}
                  onChange={(e) => handleChange('notifiche_contratti_scadenza', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Ore esaurite */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Ore quasi esaurite</p>
                <p className="text-sm text-gray-600">Alert quando un contratto ha meno del 10% ore disponibili</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={impostazioni.notifiche_ore_esaurite}
                  onChange={(e) => handleChange('notifiche_ore_esaurite', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Ticket assegnati */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Ticket assegnati</p>
                <p className="text-sm text-gray-600">Notifica quando ti viene assegnato un nuovo ticket</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={impostazioni.notifiche_ticket_assegnati}
                  onChange={(e) => handleChange('notifiche_ticket_assegnati', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Interventi oggi */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Interventi programmati</p>
                <p className="text-sm text-gray-600">Reminder per interventi programmati per oggi</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={impostazioni.notifiche_interventi_oggi}
                  onChange={(e) => handleChange('notifiche_interventi_oggi', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Email notifiche */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Notifiche via Email</p>
                <p className="text-sm text-gray-600">Ricevi anche notifiche per email (in arrivo)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={impostazioni.notifiche_email}
                  onChange={(e) => handleChange('notifiche_email', e.target.checked)}
                  className="sr-only peer"
                  disabled
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full opacity-50 cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sezione Aspetto */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Monitor className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Aspetto</h2>
              <p className="text-sm text-gray-600">Personalizza l'interfaccia</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tema
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleChange('tema', 'light')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    impostazioni.tema === 'light'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sun className={`mx-auto mb-2 ${impostazioni.tema === 'light' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                  <p className="text-sm font-medium text-gray-900">Chiaro</p>
                </button>

                <button
                  onClick={() => handleChange('tema', 'dark')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    impostazioni.tema === 'dark'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Moon className={`mx-auto mb-2 ${impostazioni.tema === 'dark' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                  <p className="text-sm font-medium text-gray-900">Scuro</p>
                </button>

                <button
                  onClick={() => handleChange('tema', 'auto')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    impostazioni.tema === 'auto'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Monitor className={`mx-auto mb-2 ${impostazioni.tema === 'auto' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                  <p className="text-sm font-medium text-gray-900">Auto</p>
                </button>
              </div>
            </div>

            {/* Densità */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Densità interfaccia
              </label>
              <select
                value={impostazioni.densita}
                onChange={(e) => handleChange('densita', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="compatta">Compatta</option>
                <option value="normale">Normale</option>
                <option value="comoda">Comoda</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dimensione testo
              </label>
              <select
                value={impostazioni.font_size}
                onChange={(e) => handleChange('font_size', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Piccolo</option>
                <option value="medium">Medio</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sezione Dati e Privacy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <Download className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dati e Privacy</h2>
              <p className="text-sm text-gray-600">Gestisci i tuoi dati personali</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Esporta dati */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Esporta i tuoi dati</p>
                  <p className="text-sm text-gray-600">Scarica una copia di tutti i tuoi dati in formato JSON</p>
                </div>
              </div>
              <button
                onClick={handleEsportaDati}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} />
                Esporta Dati
              </button>
            </div>

            {/* Elimina account */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-red-900 mb-1">Zona pericolosa</p>
                  <p className="text-sm text-red-700">L'eliminazione dell'account è permanente e irreversibile</p>
                </div>
              </div>
              <button
                onClick={handleEliminaAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 size={16} />
                Elimina Account
              </button>
            </div>
          </div>
        </div>

        {/* Pulsante Salva */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Le modifiche verranno applicate immediatamente
            </p>
            <button
              onClick={handleSalva}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvataggio...
                </>
              ) : salvato ? (
                <>
                  <Check size={18} />
                  Salvato!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salva Impostazioni
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
