'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  // Mount
  useEffect(() => {
    setMounted(true)
    
    // Carica tema salvato
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.add(savedTheme)
    } else {
      // Usa preferenza sistema
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setTheme(systemTheme)
      document.documentElement.classList.add(systemTheme)
    }
  }, [])

  // Applica tema quando cambia
  useEffect(() => {
    if (!mounted) return
    
    const root = document.documentElement
    
    // Rimuovi entrambe le classi
    root.classList.remove('light', 'dark')
    
    // Aggiungi la classe corrente
    root.classList.add(theme)
    
    // Salva in localStorage
    localStorage.setItem('theme', theme)
    
    console.log('Tema applicato:', theme) // Debug
  }, [theme, mounted])

  const toggleTheme = () => {
    console.log('Toggle theme chiamato, tema attuale:', theme) // Debug
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light'
      console.log('Nuovo tema:', newTheme) // Debug
      return newTheme
    })
  }

  // Evita flash durante hydration
  if (!mounted) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
