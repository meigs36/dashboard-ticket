'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageSquare, User, Calendar, Loader2 } from 'lucide-react'

/**
 * Componente per visualizzare le note visibili al cliente nel portale
 * Da inserire nella pagina dettaglio ticket del portale clienti
 */
export default function CustomerTicketNotes({ ticketId }) {
  const [note, setNote] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ticketId) {
      loadNote()
    }
  }, [ticketId])

  async function loadNote() {
    setLoading(true)
    try {
      // Carica solo le note visibili al cliente (commento_cliente)
      const { data: noteData, error } = await supabase
        .from('ticket_note')
        .select('*')
        .eq('id_ticket', ticketId)
        .eq('visibile_portale', true)  // Solo note visibili al cliente
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento note:', error)
        return
      }

      if (!noteData || noteData.length === 0) {
        setNote([])
        return
      }

      // Arricchisci con info autore
      const noteConAutore = await Promise.all(
        noteData.map(async (nota) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome')
              .eq('id', nota.id_utente)
              .maybeSingle()
            
            return {
              ...nota,
              autore_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Team OdontoService'
            }
          } catch (err) {
            return {
              ...nota,
              autore_nome: 'Team OdontoService'
            }
          }
        })
      )

      setNote(noteConAutore)
    } catch (err) {
      console.error('Errore:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
        <span className="ml-2 text-gray-500">Caricamento comunicazioni...</span>
      </div>
    )
  }

  if (note.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Nessuna comunicazione
        </h3>
        <p className="text-gray-500 text-sm">
          Non ci sono ancora messaggi da parte del team tecnico.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="text-blue-600" size={20} />
        <h3 className="font-semibold text-gray-900">
          Comunicazioni ({note.length})
        </h3>
      </div>

      <div className="space-y-4">
        {note.map((nota) => (
          <div 
            key={nota.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header nota */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={18} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {nota.autore_nome}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(nota.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Badge "Nuovo" per note recenti (ultimi 2 giorni) */}
              {isRecente(nota.created_at) && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Nuovo
                </span>
              )}
            </div>

            {/* Contenuto nota */}
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {nota.contenuto}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Funzione helper per verificare se una nota è recente (ultimi 2 giorni)
function isRecente(dataCreazione) {
  const now = new Date()
  const created = new Date(dataCreazione)
  const diffInHours = (now - created) / (1000 * 60 * 60)
  return diffInHours < 48
}
