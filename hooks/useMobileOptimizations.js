'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook per gestire touch gestures (swipe, long press, pinch)
 * @param {Object} options - Opzioni per le gesture
 * @returns {Object} - Ref da applicare all'elemento e stato gesture
 */
export function useTouchGestures(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onPinch,
    threshold = 50,
    longPressDelay = 500
  } = options

  const touchStartRef = useRef(null)
  const touchEndRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [gesture, setGesture] = useState(null)

  const handleTouchStart = useCallback((e) => {
    // Salva posizione iniziale
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    // Avvia timer per long press
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
        onLongPress(e)
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay])

  const handleTouchMove = useCallback(() => {
    // Cancella long press se c'è movimento
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      setIsLongPressing(false)
    }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    // Cancella long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      setIsLongPressing(false)
    }

    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x
    const deltaY = touchEndRef.current.y - touchStartRef.current.y
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time

    // Ignora se troppo lento (>300ms)
    if (deltaTime > 300) return

    // Determina direzione swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe orizzontale
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          setGesture('swipe-right')
          onSwipeRight?.(e)
        } else {
          setGesture('swipe-left')
          onSwipeLeft?.(e)
        }
      }
    } else {
      // Swipe verticale
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          setGesture('swipe-down')
          onSwipeDown?.(e)
        } else {
          setGesture('swipe-up')
          onSwipeUp?.(e)
        }
      }
    }

    // Reset
    setTimeout(() => setGesture(null), 100)
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    gesture,
    isLongPressing
  }
}

/**
 * Hook per rilevare device mobile e dimensioni schermo
 */
export function useDeviceDetect() {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 0,
    height: 0,
    orientation: 'landscape'
  })

  useEffect(() => {
    function detectDevice() {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024
      const orientation = width > height ? 'landscape' : 'portrait'

      setDevice({
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        orientation
      })
    }

    detectDevice()
    window.addEventListener('resize', detectDevice)
    window.addEventListener('orientationchange', detectDevice)

    return () => {
      window.removeEventListener('resize', detectDevice)
      window.removeEventListener('orientationchange', detectDevice)
    }
  }, [])

  return device
}

/**
 * Hook per gestire pull-to-refresh
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 80, resistance = 2.5 } = options
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback((e) => {
    // Solo se siamo in cima alla pagina
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY === 0 && startY.current) {
      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current

      if (distance > 0) {
        setIsPulling(true)
        // Applica resistenza per effetto elastico
        setPullDistance(Math.min(distance / resistance, threshold * 1.5))
        
        // Previeni scroll se stiamo facendo pull
        if (distance > 10) {
          e.preventDefault()
        }
      }
    }
  }, [threshold, resistance])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold) {
      // Trigger refresh
      await onRefresh?.()
    }

    setIsPulling(false)
    setPullDistance(0)
    startY.current = 0
    currentY.current = 0
  }, [pullDistance, threshold, onRefresh])

  return {
    pullHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    isPulling,
    pullDistance,
    isRefreshing: isPulling && pullDistance >= threshold
  }
}

/**
 * Hook per vibrazioni tattili (haptic feedback)
 */
export function useHaptic() {
  const vibrate = useCallback((pattern = [10]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  const light = useCallback(() => vibrate([10]), [vibrate])
  const medium = useCallback(() => vibrate([20]), [vibrate])
  const heavy = useCallback(() => vibrate([30]), [vibrate])
  const success = useCallback(() => vibrate([10, 50, 10]), [vibrate])
  const error = useCallback(() => vibrate([50, 100, 50]), [vibrate])
  const warning = useCallback(() => vibrate([30, 50, 30, 50, 30]), [vibrate])

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
    warning
  }
}

/**
 * Hook per safe area (notch iOS)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    function getSafeArea() {
      const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0')
      const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0')
      const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0')
      const left = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0')

      setSafeArea({ top, right, bottom, left })
    }

    getSafeArea()
    window.addEventListener('resize', getSafeArea)

    return () => window.removeEventListener('resize', getSafeArea)
  }, [])

  return safeArea
}

/**
 * Componente wrapper per liste con swipe actions
 */
export function SwipeableListItem({ children, onSwipeLeft, onSwipeRight, leftAction, rightAction }) {
  const [offset, setOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!isSwiping) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current
    setOffset(Math.max(-100, Math.min(100, diff)))
  }

  const handleTouchEnd = () => {
    if (offset < -50 && onSwipeLeft) {
      onSwipeLeft()
    } else if (offset > 50 && onSwipeRight) {
      onSwipeRight()
    }
    
    setOffset(0)
    setIsSwiping(false)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      {leftAction && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 bg-blue-500 text-white">
          {leftAction}
        </div>
      )}
      {rightAction && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center px-4 bg-red-500 text-white">
          {rightAction}
        </div>
      )}
      
      {/* Content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="bg-white dark:bg-gray-800"
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Hook per bottom sheet mobile
 */
export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [height, setHeight] = useState(0)
  const sheetRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e) => {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    
    if (diff > 0) {
      setHeight(Math.max(0, window.innerHeight * 0.6 - diff))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current
    
    if (diff > 100) {
      close()
    } else {
      setHeight(window.innerHeight * 0.6)
    }
  }, [close])

  return {
    isOpen,
    open,
    close,
    toggle,
    sheetHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    sheetRef,
    height
  }
}
