'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  MessageSquare, 
  Send,
  History,
  Briefcase,
  Edit3,
  FileText,
  Mail,
  Lock,
  Users,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react'
import InterventiTab from './InterventiTab'

export default function TicketActionsModal({ ticket, onClose, onUpdate }) {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('azioni')
  const [loading, setLoading] = useState(false)

  // Stati per modifiche ticket
  const [nuovoStato, setNuovoStato] = useState(ticket.stato)
  const [nuovaPriorita, setNuovaPriorita] = useState(ticket.priorita)
  const [tecnicoAssegnato, setTecnicoAssegnato] = useState(ticket.id_tecnico_assegnato || '')
  const [oggetto, setOggetto] = useState(ticket.oggetto || '')
  const [descrizione, setDescrizione] = useState(ticket.descrizione || '')

  // Stati per note
  const [note, setNote] = useState([])
  const [nuovaNota, setNuovaNota] = useState('')
  const [tipoNota, setTipoNota] = useState('nota_interna')
  const [loadingNote, setLoadingNote] = useState(false)
  const [notaInModifica, setNotaInModifica] = useState(null)
  const [testoModifica, setTestoModifica] = useState('')

  // Stati per selezione email
  const [emailDisponibili, setEmailDisponibili] = useState([])
  const [emailSelezionate, setEmailSelezionate] = useState([])
  const [inviaEmail, setInviaEmail] = useState(true)
  const [dropdownEmailOpen, setDropdownEmailOpen] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)

  // Stati per storico
  const [storico, setStorico] = useState([])
  const [loadingStorico, setLoadingStorico] = useState(false)

  // Stati per tecnici
  const [tecnici, setTecnici] = useState([])
  
  // Stato per cliente
  const [cliente, setCliente] = useState(null)

  useEffect(() => {
    loadTecnici()
    loadCliente()
    if (activeTab === 'note') {
      loadNote()
    }
    if (activeTab === 'storico') {
      loadStorico()
    }
  }, [activeTab])

  // Carica email quando si seleziona "commento_cliente"
  useEffect(() => {
    if (tipoNota === 'commento_cliente' && ticket.id_cliente) {
      loadEmailDisponibili()
    }
  }, [tipoNota, ticket.id_cliente])

  // Carica dati cliente
  async function loadCliente() {
    if (!ticket.id_cliente) return
    
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id, ragione_sociale, email_principale, email_pec, email_amministrazione')
        .eq('id', ticket.id_cliente)
        .single()
      
      if (!error && data) {
        setCliente(data)
      }
    } catch (err) {
      console.error('Errore caricamento cliente:', err)
    }
  }

  // Carica email disponibili
  async function loadEmailDisponibili() {
    setLoadingEmail(true)
    try {
      const emails = []
      
      const { data: clienteData } = await supabase
        .from('clienti')
        .select('ragione_sociale, email_principale, email_pec, email_amministrazione, email_riparazioni, email_referente, contatto_referente_nome')
        .eq('id', ticket.id_cliente)
        .single()
      
      if (clienteData) {
        if (clienteData.email_principale) {
          emails.push({
            email: clienteData.email_principale,
            nome: clienteData.ragione_sociale,
            tipo: 'principale',
            label: `${clienteData.ragione_sociale} (Principale)`
          })
        }
        if (clienteData.email_pec) {
          emails.push({
            email: clienteData.email_pec,
            nome: clienteData.ragione_sociale,
            tipo: 'pec',
            label: `${clienteData.ragione_sociale} (PEC)`
          })
        }
        if (clienteData.email_amministrazione) {
          emails.push({
            email: clienteData.email_amministrazione,
            nome: clienteData.ragione_sociale,
            tipo: 'amministrazione',
            label: `Amministrazione`
          })
        }
        if (clienteData.email_riparazioni) {
          emails.push({
            email: clienteData.email_riparazioni,
            nome: clienteData.ragione_sociale,
            tipo: 'riparazioni',
            label: `Riparazioni`
          })
        }
        if (clienteData.email_referente && clienteData.contatto_referente_nome) {
          emails.push({
            email: clienteData.email_referente,
            nome: clienteData.contatto_referente_nome,
            tipo: 'referente',
            label: `${clienteData.contatto_referente_nome} (Referente)`
          })
        }
      }
      
      // Prova a caricare referenti se esistono
      try {
        const { data: referentiData } = await supabase
          .from('customer_referenti')
          .select('nome, cognome, email, ruolo, riceve_notifiche_tecniche')
          .eq('cliente_id', ticket.id_cliente)
          .eq('attivo', true)
          .not('email', 'is', null)
        
        referentiData?.forEach(ref => {
          if (ref.email && !emails.find(e => e.email === ref.email)) {
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
      } catch (e) {
        // Tabella non esiste, ignora
      }
      
      setEmailDisponibili(emails)
      
      // Pre-seleziona email principale
      const preselezionate = emails
        .filter(e => e.tipo === 'principale' || e.riceve_notifiche)
        .map(e => e.email)
      setEmailSelezionate(preselezionate)
      
    } catch (err) {
      console.error('Errore caricamento email:', err)
    } finally {
      setLoadingEmail(false)
    }
  }

  function toggleEmail(email) {
    setEmailSelezionate(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email)
      } else {
        return [...prev, email]
      }
    })
  }

  async function loadTecnici() {
    try {
      const { data, error } = await supabase
        .from('utenti')
        .select('id, nome, cognome, email')
        .eq('ruolo', 'tecnico')
        .eq('attivo', true)
        .order('nome')

      if (error) throw error
      setTecnici(data || [])
    } catch (error) {
      console.error('Errore caricamento tecnici:', error)
    }
  }

  async function loadNote() {
    setLoadingNote(true)
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_note')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (noteError) throw noteError
      
      if (!noteData || noteData.length === 0) {
        setNote([])
        return
      }
      
      const noteConUtenti = await Promise.all(
        noteData.map(async (nota) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome, email')
              .eq('id', nota.id_utente)
              .maybeSingle()
            
            return {
              ...nota,
              autore: utente,
              utente_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Utente Sconosciuto',
              utente_email: utente?.email || null
            }
          } catch (err) {
            return {
              ...nota,
              autore: null,
              utente_nome: 'Utente Sconosciuto',
              utente_email: null
            }
          }
        })
      )
      
      setNote(noteConUtenti)
    } catch (error) {
      console.error('Errore caricamento note:', error)
      setNote([])
    } finally {
      setLoadingNote(false)
    }
  }

  // STORICO CON DECODIFICA TECNICO
  async function loadStorico() {
    setLoadingStorico(true)
    try {
      const { data: storicoData, error: storicoError } = await supabase
        .from('ticket_storico')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (storicoError) throw storicoError
      
      if (!storicoData || storicoData.length === 0) {
        setStorico([])
        return
      }
      
      // Carica tutti i tecnici per decodificare gli ID
      const { data: tuttiTecnici } = await supabase
        .from('utenti')
        .select('id, nome, cognome')
      
      const tecnicoMap = {}
      tuttiTecnici?.forEach(t => {
        tecnicoMap[t.id] = `${t.nome} ${t.cognome}`
      })
      
      const storicoConUtenti = await Promise.all(
        storicoData.map(async (item) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome, email')
              .eq('id', item.id_utente)
              .maybeSingle()
            
            // Decodifica valore_nuovo se è un'assegnazione tecnico
            let valoreNuovoDecodificato = item.valore_nuovo
            let valorePrecedenteDecodificato = item.valore_precedente
            
            if (item.azione === 'assegnazione' && item.campo_modificato?.includes('tecnico')) {
              // Decodifica UUID tecnico in nome
              if (item.valore_nuovo && tecnicoMap[item.valore_nuovo]) {
                valoreNuovoDecodificato = tecnicoMap[item.valore_nuovo]
              }
              if (item.valore_precedente && tecnicoMap[item.valore_precedente]) {
                valorePrecedenteDecodificato = tecnicoMap[item.valore_precedente]
              }
            }
            
            return {
              ...item,
              utente,
              utente_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Sistema',
              utente_email: utente?.email || null,
              valore_nuovo_display: valoreNuovoDecodificato,
              valore_precedente_display: valorePrecedenteDecodificato
            }
          } catch (err) {
            return {
              ...item,
              utente: null,
              utente_nome: 'Sistema',
              utente_email: null,
              valore_nuovo_display: item.valore_nuovo,
              valore_precedente_display: item.valore_precedente
            }
          }
        })
      )
      
      setStorico(storicoConUtenti)
    } catch (error) {
      console.error('Errore caricamento storico:', error)
      setStorico([])
    } finally {
      setLoadingStorico(false)
    }
  }

  async function handleAggiornaInfoTicket() {
    if (!oggetto.trim() || !descrizione.trim()) {
      alert('⚠️ Oggetto e Descrizione sono obbligatori')
      return
    }

    if (oggetto.trim() === ticket.oggetto && descrizione.trim() === ticket.descrizione) {
      alert('ℹ️ Nessuna modifica da salvare')
      return
    }

    setLoading(true)
    try {
      const updates = {}
      const cambiamenti = []

      if (oggetto.trim() !== ticket.oggetto) {
        updates.oggetto = oggetto.trim()
        cambiamenti.push(`Oggetto modificato`)
      }

      if (descrizione.trim() !== ticket.descrizione) {
        updates.descrizione = descrizione.trim()
        cambiamenti.push(`Descrizione modificata`)
      }

      const { error: updateError } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (updateError) throw updateError

      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'modifica_info',
          campo_modificato: cambiamenti.join(', ')
        })

      alert('✅ Informazioni ticket aggiornate!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore aggiornamento info:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaStato() {
    if (nuovoStato === ticket.stato) {
      alert('ℹ️ Lo stato non è cambiato')
      return
    }

    setLoading(true)
    try {
      const updates = { stato: nuovoStato }
      
      if ((nuovoStato === 'chiuso' || nuovoStato === 'risolto') && !ticket.data_chiusura) {
        updates.data_chiusura = new Date().toISOString()
      }
      
      if (nuovoStato === 'in_lavorazione' && !ticket.data_presa_in_carico) {
        updates.data_presa_in_carico = new Date().toISOString()
      }

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'cambio_stato',
          campo_modificato: 'stato',
          valore_precedente: ticket.stato,
          valore_nuovo: nuovoStato
        })

      alert('✅ Stato aggiornato!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore cambio stato:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaPriorita() {
    if (nuovaPriorita === ticket.priorita) {
      alert('ℹ️ La priorità non è cambiata')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket')
        .update({ priorita: nuovaPriorita })
        .eq('id', ticket.id)

      if (error) throw error

      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'cambio_priorita',
          campo_modificato: 'priorita',
          valore_precedente: ticket.priorita,
          valore_nuovo: nuovaPriorita
        })

      alert('✅ Priorità aggiornata!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore cambio priorità:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssegnaTecnico() {
    if (!tecnicoAssegnato) {
      alert('⚠️ Seleziona un tecnico')
      return
    }

    if (tecnicoAssegnato === ticket.id_tecnico_assegnato) {
      alert('ℹ️ Questo tecnico è già assegnato')
      return
    }

    setLoading(true)
    try {
      const updates = { 
        id_tecnico_assegnato: tecnicoAssegnato
      }
      
      if (!ticket.id_tecnico_assegnato) {
        updates.data_assegnazione = new Date().toISOString()
        if (ticket.stato === 'aperto') {
          updates.stato = 'assegnato'
        }
      }

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      const tecnico = tecnici.find(t => t.id === tecnicoAssegnato)
      const tecnicoPrecedente = tecnici.find(t => t.id === ticket.id_tecnico_assegnato)
      
      // Salva il NOME nel valore_nuovo, non l'ID
      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'assegnazione',
          campo_modificato: 'tecnico_assegnato',
          valore_precedente: tecnicoPrecedente ? `${tecnicoPrecedente.nome} ${tecnicoPrecedente.cognome}` : 'Non assegnato',
          valore_nuovo: `${tecnico?.nome} ${tecnico?.cognome}`
        })

      alert(`✅ Ticket assegnato a ${tecnico?.nome} ${tecnico?.cognome}!`)
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore assegnazione:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAggiungiNota() {
    if (!nuovaNota.trim()) return

    setLoading(true)
    try {
      const destinatariEmail = tipoNota === 'commento_cliente' && inviaEmail
        ? emailSelezionate.map(email => {
            const info = emailDisponibili.find(e => e.email === email)
            return { email, nome: info?.nome || email }
          })
        : []

      const notaData = {
        id_ticket: ticket.id,
        id_utente: userProfile.id,
        tipo: tipoNota,
        contenuto: nuovaNota.trim(),
        visibile_portale: tipoNota === 'commento_cliente',
        destinatari_email: destinatariEmail,
        metadata: {
          creato_da: {
            nome: userProfile.nome,
            cognome: userProfile.cognome,
            ruolo: userProfile.ruolo
          }
        }
      }

      const { data: insertedNota, error } = await supabase
        .from('ticket_note')
        .insert(notaData)
        .select()
        .single()

      if (error) throw error

      if (tipoNota === 'commento_cliente' && inviaEmail && emailSelezionate.length > 0) {
        await triggerEmailWebhook(insertedNota, destinatariEmail)
      }

      setNuovaNota('')
      setEmailSelezionate([])
      await loadNote()
      
      if (onUpdate) onUpdate()
      alert('✅ Nota aggiunta!' + (destinatariEmail.length > 0 ? ' Email in invio...' : ''))
    } catch (error) {
      console.error('Errore aggiunta nota:', error)
      alert('❌ Errore nell\'aggiunta della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function triggerEmailWebhook(nota, destinatari) {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_NOTA_CLIENTE
    
    if (!webhookUrl) {
      console.warn('⚠️ Webhook URL non configurato')
      return
    }

    // Prepara payload
    const payload = {
      tipo: 'nota_cliente',
      nota_id: nota.id,
      ticket_id: ticket.id,
      numero_ticket: ticket.numero_ticket,
      oggetto_ticket: ticket.oggetto,
      cliente: cliente?.ragione_sociale,
      contenuto: nota.contenuto,
      destinatari: destinatari,
      mittente: {
        nome: userProfile?.nome || 'Team',
        cognome: userProfile?.cognome || 'OdontoService'
      },
      timestamp: new Date().toISOString()
    }

    try {
      // Prova il webhook con timeout di 10 secondi
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // ✅ Webhook ha risposto OK
        console.log('✅ Email inviata tramite webhook')
        await supabase
          .from('ticket_note')
          .update({ 
            email_inviata: true, 
            email_inviata_il: new Date().toISOString() 
          })
          .eq('id', nota.id)
      } else {
        throw new Error(`Webhook status ${response.status}`)
      }

    } catch (err) {
      // ❌ Webhook fallito - Salva per retry automatico (silenzioso)
      console.warn('⚠️ Webhook fallito, salvo per retry:', err.message)
      
      try {
        await supabase.from('email_retry_queue').insert({
          nota_id: nota.id,
          payload: payload,
          stato: 'pending',
          tentativi: 0,
          prossimo_tentativo: new Date().toISOString()
        })
        console.log('📋 Email salvata in coda retry - sarà inviata a breve')
      } catch (queueError) {
        console.error('❌ Errore salvataggio in coda retry:', queueError)
      }
    }
  }

  async function handleModificaNota(notaId, nuovoTesto) {
    if (!nuovoTesto.trim()) {
      alert('Il testo della nota non può essere vuoto')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .update({ contenuto: nuovoTesto.trim() })
        .eq('id', notaId)

      if (error) throw error

      setNotaInModifica(null)
      setTestoModifica('')
      await loadNote()
      if (onUpdate) onUpdate()
      alert('✅ Nota modificata!')
    } catch (error) {
      console.error('Errore modifica nota:', error)
      alert('❌ Errore nella modifica della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminaNota(notaId) {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .delete()
        .eq('id', notaId)

      if (error) throw error

      await loadNote()
      if (onUpdate) onUpdate()
      alert('✅ Nota eliminata!')
    } catch (error) {
      console.error('Errore eliminazione nota:', error)
      alert('❌ Errore nell\'eliminazione della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function getTipoNotaStyle(tipo) {
    switch (tipo) {
      case 'nota_interna':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-200 text-amber-800',
          icon: Lock
        }
      case 'commento_cliente':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-200 text-blue-800',
          icon: Users
        }
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-700/50',
          border: 'border-gray-200 dark:border-gray-600',
          badge: 'bg-gray-200 text-gray-800',
          icon: MessageSquare
        }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs sm:text-sm font-semibold">
                #{ticket.numero_ticket}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                ticket.stato === 'aperto' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                ticket.stato === 'in_lavorazione' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                ticket.stato === 'chiuso' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {ticket.stato.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">
              {ticket.cliente?.ragione_sociale || ticket.clienti?.ragione_sociale || cliente?.ragione_sociale || 'Cliente'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {ticket.oggetto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
            <div className="flex min-w-min">
              <button
                onClick={() => setActiveTab('azioni')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'azioni'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <CheckCircle size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Azioni</span>
              </button>

              <button
                onClick={() => setActiveTab('interventi')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'interventi'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Briefcase size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Interventi</span>
              </button>

              <button
                onClick={() => setActiveTab('note')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'note'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <MessageSquare size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Note</span>
                {note.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{note.length}</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('storico')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'storico'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <History size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Storico</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenuto Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB AZIONI - LAYOUT ORIGINALE CON SELECT */}
          {activeTab === 'azioni' && (
            <div className="space-y-6">
              {/* Informazioni Ticket Editabili */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Informazioni Ticket</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Oggetto *
                    </label>
                    <input
                      type="text"
                      value={oggetto}
                      onChange={(e) => setOggetto(e.target.value)}
                      placeholder="Breve descrizione del problema"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Descrizione *
                    </label>
                    <textarea
                      value={descrizione}
                      onChange={(e) => setDescrizione(e.target.value)}
                      placeholder="Descrizione dettagliata del problema..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    />
                  </div>

                  {(oggetto !== ticket.oggetto || descrizione !== ticket.descrizione) && (
                    <button
                      onClick={handleAggiornaInfoTicket}
                      disabled={loading || !oggetto.trim() || !descrizione.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} />
                      {loading ? 'Salvataggio...' : 'Aggiorna Informazioni'}
                    </button>
                  )}
                </div>
              </div>

              {/* Cambia Stato - SELECT ORIGINALE */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-green-600 dark:text-green-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Stato</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={nuovoStato}
                    onChange={(e) => setNuovoStato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="aperto">🟢 Aperto</option>
                    <option value="assegnato">🔵 Assegnato</option>
                    <option value="in_lavorazione">🟡 In Lavorazione</option>
                    <option value="in_attesa_cliente">⏸️ In Attesa Cliente</option>
                    <option value="in_attesa_parti">📦 In Attesa Parti</option>
                    <option value="risolto">✅ Risolto</option>
                    <option value="chiuso">⚫ Chiuso</option>
                    <option value="annullato">❌ Annullato</option>
                  </select>
                  <button
                    onClick={handleCambiaStato}
                    disabled={loading || nuovoStato === ticket.stato}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Aggiorna Stato'}
                  </button>
                </div>
              </div>

              {/* Cambio Priorità - SELECT ORIGINALE */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-orange-600 dark:text-orange-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Priorità</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={nuovaPriorita}
                    onChange={(e) => setNuovaPriorita(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bassa">🟢 Bassa</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="critica">🚨 Critica</option>
                  </select>
                  <button
                    onClick={handleCambiaPriorita}
                    disabled={loading || nuovaPriorita === ticket.priorita}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Aggiorna Priorità'}
                  </button>
                </div>
              </div>

              {/* Assegnazione Tecnico */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-purple-600 dark:text-purple-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assegna Tecnico</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={tecnicoAssegnato}
                    onChange={(e) => setTecnicoAssegnato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Non assegnato</option>
                    {tecnici.map(tecnico => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome} {tecnico.cognome}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssegnaTecnico}
                    disabled={loading || !tecnicoAssegnato || tecnicoAssegnato === ticket.id_tecnico_assegnato}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Assegna'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB INTERVENTI */}
          {activeTab === 'interventi' && (
            <InterventiTab ticket={ticket} onUpdate={onUpdate} />
          )}

          {/* TAB NOTE */}
          {activeTab === 'note' && (
            <div className="space-y-6">
              {/* Form Aggiungi Nota */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={18} />
                  Aggiungi Nota
                </h3>
                
                {/* Tipo Nota Toggle */}
                <div className="flex gap-2 mb-4">
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
                <div className={`text-sm p-3 rounded-lg mb-4 ${
                  tipoNota === 'nota_interna' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {tipoNota === 'nota_interna' ? (
                    <p className="flex items-start gap-2">
                      <Lock size={14} className="mt-0.5 flex-shrink-0" />
                      <span>Visibile solo al team interno. Genera notifica per i colleghi.</span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2">
                      <Users size={14} className="mt-0.5 flex-shrink-0" />
                      <span>Visibile nel portale clienti. Puoi inviare email ai contatti.</span>
                    </p>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  value={nuovaNota}
                  onChange={(e) => setNuovaNota(e.target.value)}
                  placeholder={tipoNota === 'nota_interna' ? "Nota per il team..." : "Messaggio per il cliente..."}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-24 mb-4"
                />

                {/* Sezione Email (solo per commento_cliente) */}
                {tipoNota === 'commento_cliente' && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviaEmail}
                          onChange={(e) => setInviaEmail(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Mail size={16} />
                          Invia notifica email
                        </span>
                      </label>
                      
                      {inviaEmail && emailSelezionate.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {emailSelezionate.length} destinatari
                        </span>
                      )}
                    </div>

                    {inviaEmail && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDropdownEmailOpen(!dropdownEmailOpen)}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            {loadingEmail ? (
                              <span className="text-gray-400">Caricamento...</span>
                            ) : emailSelezionate.length === 0 ? (
                              <span className="text-gray-400">Seleziona destinatari...</span>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300">
                                {emailSelezionate.length} destinatari selezionati
                              </span>
                            )}
                          </div>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownEmailOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownEmailOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">DESTINATARI</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEmailSelezionate(emailDisponibili.map(e => e.email))}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Tutte
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setEmailSelezionate([])}
                                  className="text-xs text-gray-500 hover:underline"
                                >
                                  Nessuna
                                </button>
                              </div>
                            </div>

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
                                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    emailSelezionate.includes(item.email) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    emailSelezionate.includes(item.email)
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {emailSelezionate.includes(item.email) && (
                                      <Check size={12} className="text-white" />
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.email}</p>
                                  </div>

                                  {item.tipo === 'principale' && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Principale</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {emailSelezionate.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {emailSelezionate.map(email => {
                              const info = emailDisponibili.find(e => e.email === email)
                              return (
                                <span 
                                  key={email}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  <span className="max-w-[120px] truncate">{info?.nome || email}</span>
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

                {/* Button Submit */}
                <button
                  onClick={handleAggiungiNota}
                  disabled={loading || !nuovaNota.trim()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    loading || !nuovaNota.trim()
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
              </div>

              {dropdownEmailOpen && (
                <div className="fixed inset-0 z-0" onClick={() => setDropdownEmailOpen(false)} />
              )}

              {/* Lista Note Esistenti */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Note Precedenti</h3>
                
                {loadingNote ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : note.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {note.map((nota) => {
                      const style = getTipoNotaStyle(nota.tipo)
                      const IconTipo = style.icon
                      
                      return (
                        <div 
                          key={nota.id} 
                          className={`p-4 rounded-lg border ${style.bg} ${style.border}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${style.badge}`}>
                                <IconTipo size={12} />
                                {nota.tipo === 'nota_interna' ? 'Interna' : 'Cliente'}
                              </span>
                              <span className="text-xs text-gray-500">{nota.utente_nome}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(nota.created_at).toLocaleString('it-IT')}
                              </span>
                              
                              {nota.email_inviata && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Mail size={12} />
                                  Email inviata
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setNotaInModifica(nota.id)
                                  setTestoModifica(nota.contenuto)
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleEliminaNota(nota.id)}
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                          
                          {notaInModifica === nota.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={testoModifica}
                                onChange={(e) => setTestoModifica(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                rows="3"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleModificaNota(nota.id, testoModifica)}
                                  disabled={loading}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                                >
                                  💾 Salva
                                </button>
                                <button
                                  onClick={() => { setNotaInModifica(null); setTestoModifica('') }}
                                  className="px-3 py-1.5 border text-gray-700 rounded text-sm"
                                >
                                  ❌ Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                              {nota.contenuto}
                            </p>
                          )}

                          {nota.destinatari_email && nota.destinatari_email.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500">
                                📧 Inviata a: {nota.destinatari_email.map(d => d.nome || d.email).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <MessageSquare className="mx-auto text-gray-300 mb-2" size={40} />
                    <p className="text-gray-500">Nessuna nota ancora</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB STORICO - CON DECODIFICA TECNICO */}
          {activeTab === 'storico' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cronologia Modifiche</h3>
              {loadingStorico ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
              ) : storico.length > 0 ? (
                <div className="space-y-3">
                  {storico.map((entry) => (
                    <div key={entry.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <History size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {entry.utente_nome}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString('it-IT')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>{entry.azione}</strong>
                            {entry.campo_modificato && `: ${entry.campo_modificato}`}
                          </p>
                          {/* USA valore_*_display per mostrare i nomi decodificati */}
                          {(entry.valore_precedente_display || entry.valore_nuovo_display) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {entry.valore_precedente_display || entry.valore_precedente} → {entry.valore_nuovo_display || entry.valore_nuovo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <History className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={40} />
                  <p className="text-gray-500 dark:text-gray-400">Nessuna modifica registrata</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
