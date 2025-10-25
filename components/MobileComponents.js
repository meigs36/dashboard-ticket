'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Clock, User, AlertCircle, CheckCircle, 
  ChevronRight, Trash2, Edit, Eye 
} from 'lucide-react'
import { useTouchGestures, useHaptic } from '@/hooks/useMobileOptimizations'
import toast from 'react-hot-toast'

export default function MobileTicketCard({ ticket, onDelete, onEdit }) {
  const router = useRouter()
  const haptic = useHaptic()
  const [showActions, setShowActions] = useState(false)

  const { touchHandlers } = useTouchGestures({
    onSwipeLeft: () => {
      setShowActions(true)
      haptic.light()
    },
    onSwipeRight: () => {
      setShowActions(false)
      haptic.light()
    },
    threshold: 80
  })

  function getStatoColor(stato) {
    const colors = {
      aperto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      assegnato: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      in_lavorazione: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      risolto: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      chiuso: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
    return colors[stato] || 'bg-gray-100 text-gray-800'
  }

  function getPrioritaColor(priorita) {
    const colors = {
      bassa: 'text-gray-400',
      media: 'text-yellow-500',
      alta: 'text-orange-500',
      critica: 'text-red-600'
    }
    return colors[priorita] || 'text-gray-400'
  }

  function handleCardClick() {
    haptic.light()
    router.push(`/ticket/${ticket.id}`)
  }

  function handleDelete() {
    haptic.warning()
    if (confirm('Sei sicuro di voler eliminare questo ticket?')) {
      onDelete?.(ticket.id)
      toast.success('Ticket eliminato')
    }
    setShowActions(false)
  }

  function handleEdit() {
    haptic.light()
    onEdit?.(ticket)
    setShowActions(false)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action Buttons (visibili con swipe) */}
      <div 
        className={`absolute right-0 top-0 bottom-0 flex items-stretch transition-transform duration-300 ${
          showActions ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          onClick={handleEdit}
          className="flex items-center justify-center w-20 bg-blue-600 text-white active:bg-blue-700"
        >
          <Edit size={20} />
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-20 bg-red-600 text-white active:bg-red-700"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Main Card */}
      <div
        {...touchHandlers}
        onClick={handleCardClick}
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-transform duration-300 active:scale-98 ${
          showActions ? '-translate-x-40' : 'translate-x-0'
        }`}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {ticket.numero_ticket}
              </span>
              <AlertCircle 
                className={getPrioritaColor(ticket.priorita)} 
                size={14}
                fill="currentColor"
              />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {ticket.oggetto}
            </h3>
          </div>
          
          <ChevronRight className="text-gray-400 flex-shrink-0 ml-2" size={20} />
        </div>

        {/* Cliente */}
        {ticket.clienti && (
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {ticket.clienti.ragione_sociale}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatoColor(ticket.stato)}`}>
            {ticket.stato.replace(/_/g, ' ')}
          </span>
          
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={12} />
            <span>
              {new Date(ticket.data_apertura).toLocaleDateString('it-IT', { 
                day: '2-digit', 
                month: 'short' 
              })}
            </span>
          </div>
        </div>

        {/* Indicator swipe */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20">
          <div className="flex gap-1">
            <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente Pull-to-Refresh per liste mobile
 */
export function MobilePullToRefresh({ onRefresh, children }) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const haptic = useHaptic()

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && startY.current) {
      const currentY = e.touches[0].clientY
      const distance = currentY - startY.current

      if (distance > 0) {
        setIsPulling(true)
        setPullDistance(Math.min(distance / 2, 80))
        
        if (distance > 10) {
          e.preventDefault()
        }

        if (distance > 120 && !isPulling) {
          haptic.medium()
        }
      }
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= 60) {
      haptic.success()
      await onRefresh?.()
    }

    setIsPulling(false)
    setPullDistance(0)
    startY.current = 0
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        style={{
          height: pullDistance,
          opacity: pullDistance / 60,
          transition: isPulling ? 'none' : 'all 0.3s ease'
        }}
        className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 overflow-hidden"
      >
        <div className={`${pullDistance >= 60 ? 'animate-spin' : ''}`}>
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {children}
    </div>
  )
}

/**
 * Bottom Sheet mobile component
 */
export function MobileBottomSheet({ isOpen, onClose, title, children }) {
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    const distance = currentY - startY
    
    if (distance > 100) {
      onClose()
    }
    
    setIsDragging(false)
    setStartY(0)
    setCurrentY(0)
  }

  if (!isOpen) return null

  const translateY = isDragging && currentY > startY ? currentY - startY : 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
      />

      {/* Sheet */}
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl z-50 max-h-[85vh] animate-slide-up"
      >
        {/* Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="py-3 flex justify-center touch-none"
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {children}
        </div>
      </div>
    </>
  )
}
