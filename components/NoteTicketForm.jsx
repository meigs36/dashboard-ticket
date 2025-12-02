'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  MessageSquare, 
  Lock, 
  Send, 
  Mail, 
  Users, 
  X, 
  Check,
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react'

/**
 * Componente per aggiungere note al ticket
 * 
 * Tipi di nota:
 * - nota_interna: Visibile solo al team (admin/tecnici), genera notifica permanente
 * - commento_cliente: Visibile nel portale clienti, può inviare email
 * 
 * @param {string} ticketId - ID del ticket
 * @param {string} clienteId - ID del cliente (per caricare referenti)
 * @param {function} onNotaAggiunta - Callback dopo inserimento nota
 * @param {object} utente - Utente corrente { id, nome, cognome, ruolo }
 */
export default function NoteTicketForm({ 
  ticketId, 
  clienteId, 
  onNotaAggiunta,
  utente 
}) {
  // Stati form
  const [tipoNota, setTipoNota] = useState('nota_interna')
  const [contenuto, setContenuto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  // Stati per email (solo per commento_cliente)
  const [emailDisponibili, setEmailDisponibili] = useState([])
  const [emailSelezionate, setEmailSelezionate] = useState([])
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [inviaEmail, setInviaEmail] = useState(true)
  
  // Carica email disponibili quando tipo = commento_cliente
  useEffect(() => {
    if (tipoNota === 'commento_cliente' && clienteId) {
      loadEmailDisponibili()
    }
  }, [tipoNota, clienteId])
  
  // Carica email dal cliente e dai referenti
  async function loadEmailDisponibili() {
    setLoadingEmail(true)
    try {
      const emails = []
      
      // 1. Email principale del cliente
      const { data: clienteData } = await supabase
        .from('clienti')
        .select('email, email_pec, ragione_sociale')
        .eq('id', clienteId)
        .single()
      
      if (clienteData?.email) {
        emails.push({
          email: clienteData.email,
          nome: clienteData.ragione_sociale,
          tipo: 'principale',
          label: `${clienteData.ragione_sociale} (Principale)`
        })
      }
      
      if (clienteData?.email_pec) {
        emails.push({
          email: clienteData.email_pec,
          nome: clienteData.ragione_sociale,
          tipo: 'pec',
          label: `${clienteData.ragione_sociale} (PEC)`
        })
      }
      
      // 2. Email dai referenti (customer_referenti)
      const { data: referentiData } = await supabase
        .from('customer_referenti')
        .select('nome, cognome, email, ruolo, riceve_notifiche_tecniche')
        .eq('cliente_id', clienteId)
        .eq('attivo', true)
        .not('email', 'is', null)
      
      referentiData?.forEach(ref => {
        if (ref.email) {
          emails.push({
            email: ref.email,
            nome: `${ref.nome} ${ref.cognome}`,
            tipo: 'referente',
            ruolo: ref.ruolo,
            riceve_notifiche: ref.riceve_notifiche_tecniche,
            label: `${ref.nome} ${ref.cognome}${ref.ruolo ? ` (${ref.ruolo})` : ''}`
          })
        }
      })
      
      // 3. Prova anche dalla tabella referenti legacy se esiste
      try {
        const { data: referentiLegacy } = await supabase
          .from('referenti')
          .select('nome, cognome, email, ruolo')
          .eq('id_cliente', clienteId)
          .eq('attivo', true)
          .not('email', 'is', null)
        
        referentiLegacy?.forEach(ref => {
          // Evita duplicati
          if (ref.email && !emails.find(e => e.email === ref.email)) {
            emails.push({
              email: ref.email,
              nome: `${ref.nome} ${ref.cognome}`,
              tipo: 'referente',
              ruolo: ref.ruolo,
              label: `${ref.nome} ${ref.cognome}${ref.ruolo ? ` (${ref.ruolo})` : ''}`
            })
          }
        })
      } catch (e) {
        // Tabella referenti legacy potrebbe non esistere
      }
      
      setEmailDisponibili(emails)
      
      // Pre-seleziona email dei referenti che ricevono notifiche tecniche
      const preselezionate = emails
        .filter(e => e.riceve_notifiche || e.tipo === 'principale')
        .map(e => e.email)
      setEmailSelezionate(preselezionate)
      
    } catch (err) {
      console.error('Errore caricamento email:', err)
    } finally {
      setLoadingEmail(false)
    }
  }
  
  // Toggle selezione email
  function toggleEmail(email) {
    setEmailSelezionate(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email)
      } else {
        return [...prev, email]
      }
    })
  }
  
  // Seleziona tutte le email
  function selezionaTutte() {
    setEmailSelezionate(emailDisponibili.map(e => e.email))
  }
  
  // Deseleziona tutte
  function deselezionaTutte() {
    setEmailSelezionate([])
  }
  
  // Invia nota
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!contenuto.trim()) {
      setError('Inserisci il contenuto della nota')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Prepara destinatari email (solo per commento_cliente)
      const destinatariEmail = tipoNota === 'commento_cliente' && inviaEmail
        ? emailSelezionate.map(email => {
            const info = emailDisponibili.find(e => e.email === email)
            return { email, nome: info?.nome || email }
          })
        : []
      
      // 1. Inserisci nota nel database
      const { data: notaData, error: notaError } = await supabase
        .from('ticket_note')
        .insert({
          id_ticket: ticketId,
          id_utente: utente.id,
          tipo: tipoNota,
          contenuto: contenuto.trim(),
          visibile_portale: tipoNota === 'commento_cliente',
          destinatari_email: destinatariEmail,
          metadata: {
            creato_da: {
              nome: utente.nome,
              cognome: utente.cognome,
              ruolo: utente.ruolo
            }
          }
        })
        .select()
        .single()
      
      if (notaError) throw notaError
      
      // 2. Se è commento_cliente con email, triggera webhook n8n
      if (tipoNota === 'commento_cliente' && inviaEmail && emailSelezionate.length > 0) {
        await triggerEmailWebhook(notaData, destinatariEmail)
      }
      
      // 3. Successo
      setSuccess(true)
      setContenuto('')
      setEmailSelezionate([])
      
      // Callback
      if (onNotaAggiunta) {
        onNotaAggiunta(notaData)
      }
      
      // Reset success dopo 3 secondi
      setTimeout(() => setSuccess(false), 3000)
      
    } catch (err) {
      console.error('Errore inserimento nota:', err)
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }
  
  // Triggera webhook n8n per invio email
  async function triggerEmailWebhook(nota, destinatari) {
    try {
      // Recupera info ticket per il template email
      const { data: ticketData } = await supabase
        .from('ticket')
        .select(`
          numero_ticket,
          oggetto,
          cliente:clienti!ticket_id_cliente_fkey(ragione_sociale)
        `)
        .eq('id', ticketId)
        .single()
      
      // Chiamata al webhook n8n
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_NOTA_CLIENTE
      
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'nota_cliente',
            nota_id: nota.id,
            ticket_id: ticketId,
            numero_ticket: ticketData?.numero_ticket,
            oggetto_ticket: ticketData?.oggetto,
            cliente: ticketData?.cliente?.ragione_sociale,
            contenuto: nota.contenuto,
            destinatari: destinatari,
            mittente: {
              nome: utente.nome,
              cognome: utente.cognome
            },
            timestamp: new Date().toISOString()
          })
        })
        
        // Aggiorna flag email inviata
        await supabase
          .from('ticket_note')
          .update({ 
            email_inviata: true, 
            email_inviata_il: new Date().toISOString() 
          })
          .eq('id', nota.id)
          
      } else {
        console.warn('⚠️ Webhook URL non configurato per invio email')
      }
      
    } catch (err) {
      console.error('Errore trigger webhook email:', err)
      // Non bloccare il flusso principale
    }
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare size={18} />
        Aggiungi Nota
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo Nota */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipoNota('nota_interna')}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              tipoNota === 'nota_interna'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Lock size={16} />
            <span className="font-medium">Nota Interna</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTipoNota('commento_cliente')}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              tipoNota === 'commento_cliente'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Users size={16} />
            <span className="font-medium">Nota al Cliente</span>
          </button>
        </div>
        
        {/* Info tipo nota */}
        <div className={`text-sm p-3 rounded-lg ${
          tipoNota === 'nota_interna' 
            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {tipoNota === 'nota_interna' ? (
            <p className="flex items-start gap-2">
              <Lock size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Visibile solo al team interno. Verrà creata una notifica 
                permanente per tutti i colleghi.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <Users size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Visibile nel portale clienti. Puoi inviare una notifica 
                email ai contatti selezionati.
              </span>
            </p>
          )}
        </div>
        
        {/* Contenuto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tipoNota === 'nota_interna' ? 'Nota per il team' : 'Messaggio al cliente'}
          </label>
          <textarea
            value={contenuto}
            onChange={(e) => setContenuto(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={
              tipoNota === 'nota_interna' 
                ? "Scrivi qui la nota interna per il team..." 
                : "Scrivi qui il messaggio per il cliente..."
            }
          />
        </div>
        
        {/* Sezione Email (solo per commento_cliente) */}
        {tipoNota === 'commento_cliente' && (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            {/* Toggle invio email */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviaEmail}
                  onChange={(e) => setInviaEmail(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail size={16} />
                  Invia notifica email
                </span>
              </label>
              
              {inviaEmail && emailSelezionate.length > 0 && (
                <span className="text-xs text-gray-500">
                  {emailSelezionate.length} destinatari selezionati
                </span>
              )}
            </div>
            
            {/* Dropdown selezione email */}
            {inviaEmail && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    {loadingEmail ? (
                      <span className="text-gray-400">Caricamento...</span>
                    ) : emailSelezionate.length === 0 ? (
                      <span className="text-gray-400">Seleziona destinatari...</span>
                    ) : (
                      <span className="text-gray-700">
                        {emailSelezionate.length} destinatar{emailSelezionate.length === 1 ? 'io' : 'i'}
                      </span>
                    )}
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {/* Azioni rapide */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-500">
                        DESTINATARI DISPONIBILI
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selezionaTutte}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Tutte
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={deselezionaTutte}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Nessuna
                        </button>
                      </div>
                    </div>
                    
                    {/* Lista email */}
                    {loadingEmail ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                      </div>
                    ) : emailDisponibili.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        Nessun contatto email disponibile
                      </div>
                    ) : (
                      emailDisponibili.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleEmail(item.email)}
                          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                            emailSelezionate.includes(item.email) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            emailSelezionate.includes(item.email)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {emailSelezionate.includes(item.email) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.email}
                            </p>
                          </div>
                          
                          {item.riceve_notifiche && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Notifiche attive
                            </span>
                          )}
                          
                          {item.tipo === 'principale' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Principale
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Email selezionate (chips) */}
                {emailSelezionate.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emailSelezionate.map(email => {
                      const info = emailDisponibili.find(e => e.email === email)
                      return (
                        <span 
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          <span className="max-w-[150px] truncate">
                            {info?.nome || email}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleEmail(email)}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Messaggi errore/successo */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
            <Check size={16} />
            <span className="text-sm">
              Nota salvata con successo
              {tipoNota === 'commento_cliente' && inviaEmail && emailSelezionate.length > 0 && 
                ' - Email in invio'
              }
            </span>
          </div>
        )}
        
        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !contenuto.trim()}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            loading || !contenuto.trim()
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : tipoNota === 'nota_interna'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Send size={18} />
              {tipoNota === 'nota_interna' ? 'Salva Nota Interna' : 'Invia al Cliente'}
            </>
          )}
        </button>
      </form>
      
      {/* Click fuori chiude dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  )
}
