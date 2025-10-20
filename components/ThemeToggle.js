'use client'

import { useTheme } from '@/app/context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const handleClick = () => {
    console.log('Click sul toggle!') // Debug
    toggleTheme()
  }

  return (
    <button
      onClick={handleClick}
      className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'light' ? (
        <Moon size={24} className="text-blue-600" />
      ) : (
        <Sun size={24} className="text-yellow-500" />
      )}
    </button>
  )
}
