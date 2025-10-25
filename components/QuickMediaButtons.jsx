'use client'

import { useState } from 'react'
import { Camera, Mic } from 'lucide-react'
import InterventoMediaCapture from './InterventoMediaCapture'

export default function QuickMediaButtons({ interventoId }) {
  const [showMedia, setShowMedia] = useState(false)

  if (!interventoId) {
    return (
      <div className="text-xs text-gray-400 italic">
        Salva l'intervento per aggiungere foto/audio
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Pulsante Toggle */}
      <button
        onClick={() => setShowMedia(!showMedia)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <Camera size={16} />
        <Mic size={16} />
        <span>{showMedia ? 'Nascondi' : 'Mostra'} Foto e Audio</span>
      </button>

      {/* Componente Media */}
      {showMedia && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <InterventoMediaCapture interventoId={interventoId} />
        </div>
      )}
    </div>
  )
}
