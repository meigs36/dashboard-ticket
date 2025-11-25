'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, X, Building2, MapPin, Loader2 } from 'lucide-react'

export default function ClienteSearchSelect({ 
  value, 
  onChange, 
  placeholder = "Cerca cliente per nome, codice o città...",
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [risultati, setRisultati] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState(null)
  
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Carica cliente selezionato se value è già presente
  useEffect(() => {
    if (value && !selectedCliente) {
      loadClienteById(value)
    }
  }, [value])

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setRisultati([])
      return
    }

    const timer = setTimeout(() => {
      searchClienti()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchTerm])

  async function loadClienteById(id) {
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id, ragione_sociale, codice_cliente, citta, provincia')
        .eq('id', id)
        .single()

      if (data) {
        setSelectedCliente(data)
      }
    } catch (error) {
      console.error('Errore caricamento cliente:', error)
    }
  }

  async function searchClienti() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id, ragione_sociale, codice_cliente, citta, provincia, telefono_principale')
        .eq('attivo', true)
        .or(`ragione_sociale.ilike.%${searchTerm}%,codice_cliente.ilike.%${searchTerm}%,citta.ilike.%${searchTerm}%`)
        .order('ragione_sociale')
        .limit(20)

      if (error) throw error
      setRisultati(data || [])
    } catch (error) {
      console.error('Errore ricerca clienti:', error)
      setRisultati([])
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(cliente) {
    setSelectedCliente(cliente)
    setSearchTerm('')
    setIsOpen(false)
    setRisultati([])
    onChange(cliente.id)
  }

  function handleClear() {
    setSelectedCliente(null)
    setSearchTerm('')
    setRisultati([])
    onChange('')
    inputRef.current?.focus()
  }

  function handleInputFocus() {
    setIsOpen(true)
    if (searchTerm.length >= 2) {
      searchClienti()
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Cliente Selezionato */}
      {selectedCliente ? (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedCliente.ragione_sociale}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCliente.codice_cliente}
                {selectedCliente.citta && ` • ${selectedCliente.citta}`}
                {selectedCliente.provincia && ` (${selectedCliente.provincia})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
            title="Cambia cliente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Campo di Ricerca */
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500" size={20} />
          {loading && (
            <Loader2 className="absolute right-3 top-3.5 text-blue-500 animate-spin" size={20} />
          )}
        </div>
      )}

      {/* Dropdown Risultati */}
      {isOpen && !selectedCliente && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {searchTerm.length < 2 ? (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>Digita almeno 2 caratteri per cercare</p>
            </div>
          ) : loading ? (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
              <p>Ricerca in corso...</p>
            </div>
          ) : risultati.length > 0 ? (
            <ul className="py-2">
              {risultati.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cliente)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {cliente.ragione_sociale}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cliente.codice_cliente}</span>
                        {cliente.citta && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {cliente.citta} {cliente.provincia && `(${cliente.provincia})`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>Nessun cliente trovato per "{searchTerm}"</p>
              <p className="text-sm mt-1">Prova con un altro termine</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
