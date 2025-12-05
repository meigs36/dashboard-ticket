// components/SedePicker.jsx
// Dropdown per selezione sede in clienti multi-sede
//
// 🔧 CREATO (4 Dic 2025):
// - Mostra dropdown solo se isMultiSede = true
// - Permette switch tra sedi senza ri-login
// - Mostra città + indirizzo per identificare la sede
// - Badge con numero sedi totali

'use client'

import { useState, useRef, useEffect } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Building2, ChevronDown, MapPin, Check, Building } from 'lucide-react'

export default function SedePicker({ className = '' }) {
  const { sediCollegate, sedeAttiva, cambiaSedeAttiva, isMultiSede } = useCustomerAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Non mostrare nulla se non è multi-sede
  if (!isMultiSede || !sedeAttiva) {
    return null
  }

  const handleSedeChange = (sede) => {
    if (sede.id !== sedeAttiva.id) {
      cambiaSedeAttiva(sede.id)
    }
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-xs text-gray-500 leading-none">Sede</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {sedeAttiva.citta || 'N/D'}
            </p>
          </div>
        </div>
        
        {/* Badge numero sedi */}
        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          {sediCollegate.length}
        </span>
        
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Seleziona Sede ({sediCollegate.length} sedi)
              </span>
            </div>
          </div>

          {/* Lista Sedi */}
          <div className="max-h-64 overflow-y-auto">
            {sediCollegate.map((sede) => {
              const isSelected = sede.id === sedeAttiva.id
              
              return (
                <button
                  key={sede.id}
                  onClick={() => handleSedeChange(sede)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Icona */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Building className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>

                  {/* Info Sede */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {sede.citta || 'N/D'}
                        {sede.isPrincipale && (
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            (principale)
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {sede.indirizzo || sede.ragione_sociale}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cod. {sede.codice_cliente}
                    </p>
                  </div>

                  {/* Check se selezionato */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <Check className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer info */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              💡 Cambia sede per visualizzare macchinari e ticket specifici
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// VARIANTE COMPATTA (per header mobile)
// ============================================================

export function SedePickerCompact({ className = '' }) {
  const { sediCollegate, sedeAttiva, cambiaSedeAttiva, isMultiSede } = useCustomerAuth()
  
  if (!isMultiSede || !sedeAttiva) {
    return null
  }

  return (
    <select
      value={sedeAttiva.id}
      onChange={(e) => cambiaSedeAttiva(e.target.value)}
      className={`px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      {sediCollegate.map((sede) => (
        <option key={sede.id} value={sede.id}>
          📍 {sede.citta} - {sede.codice_cliente}
        </option>
      ))}
    </select>
  )
}

// ============================================================
// BADGE INFO SEDE (per mostrare sede corrente inline)
// ============================================================

export function SedeBadge({ className = '' }) {
  const { sedeAttiva, isMultiSede } = useCustomerAuth()
  
  if (!isMultiSede || !sedeAttiva) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium ${className}`}>
      <MapPin className="w-3 h-3" />
      <span>{sedeAttiva.citta}</span>
    </div>
  )
}
