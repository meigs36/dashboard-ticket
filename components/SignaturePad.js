'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Eraser, PenTool } from 'lucide-react'

export default function SignaturePad({ onSignatureChange, width = '100%', height = 200 }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [canvasWidth, setCanvasWidth] = useState(600)

  // Resize canvas to container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasWidth(rect.width)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    // Set high DPI
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = canvasWidth + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)
    // Style
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, height)
    // Guideline
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(40, height - 40)
    ctx.lineTo(canvasWidth - 40, height - 40)
    ctx.stroke()
    ctx.setLineDash([])
    // Reset stroke style
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
  }, [canvasWidth, height])

  const getPosition = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPosition(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }, [getPosition])

  const draw = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPosition(e)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, getPosition])

  const stopDrawing = useCallback((e) => {
    if (e) e.preventDefault()
    if (isDrawing) {
      setIsDrawing(false)
      setIsEmpty(false)
      // Notifica parent
      if (onSignatureChange) {
        const canvas = canvasRef.current
        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange(dataUrl)
      }
    }
  }, [isDrawing, onSignatureChange])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)
    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, height)
    // Guideline
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(40, height - 40)
    ctx.lineTo(canvasWidth - 40, height - 40)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    setIsEmpty(true)
    if (onSignatureChange) onSignatureChange(null)
  }

  return (
    <div ref={containerRef} style={{ width }} className="relative">
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <PenTool size={14} />
          <span>Firma del Titolare / Responsabile dello Studio</span>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          <Eraser size={14} />
          Cancella
        </button>
      </div>

      {/* Canvas */}
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-lg font-light select-none">
              Firma qui con il dito o il mouse
            </p>
          </div>
        )}
      </div>

      {/* Status */}
      <p className={`text-xs mt-1.5 ${isEmpty ? 'text-amber-500' : 'text-green-600'}`}>
        {isEmpty ? '⚠ Firma obbligatoria' : '✓ Firma acquisita'}
      </p>
    </div>
  )
}
