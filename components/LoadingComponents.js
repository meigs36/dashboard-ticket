'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Loading Spinner con animazione
export function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 
        className={`${sizes[size]} animate-spin text-blue-600 dark:text-blue-400`} 
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

// Loading Skeleton per cards
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
  )
}

// Loading Skeleton per tabella
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div 
              key={j} 
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Loading Dots (stile WhatsApp)
export function LoadingDots() {
  return (
    <div className="flex gap-1 items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )
}

// Loading Progress Bar
export function LoadingBar({ progress = 0 }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

// Loading Overlay per modals/dialogs
export function LoadingOverlay({ text = 'Caricamento...' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-2xl">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </motion.div>
  )
}

// Pulsing Badge (per indicare attività)
export function PulsingBadge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <motion.span
        className={`absolute h-3 w-3 rounded-full ${colors[color]} opacity-75`}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.7, 0, 0.7]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
      <span className={`h-3 w-3 rounded-full ${colors[color]}`} />
      {children}
    </div>
  )
}
