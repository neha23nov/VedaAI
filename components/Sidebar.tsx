'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Library,
  Settings,
  Zap,
} from 'lucide-react'

const navItems = [
  { label: 'Home', icon: Home, href: '#' },
  { label: 'My Classroom', icon: BookOpen, href: '#' },
  { label: 'Assignments', icon: ClipboardList, href: '#' },
  { label: 'Exams', icon: GraduationCap, href: '/' },
  { label: 'My Library', icon: Library, href: '#' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 flex-shrink-0 bg-[#111827] flex flex-col h-full border-r border-gray-800">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          {/* simple "V" shield logo */}
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z"
              fill="#F97316" opacity="0.9"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-white font-bold text-base tracking-tight">VedaAI</span>
      </div>

      {/* AI Teacher's Toolkit button */}
      <div className="px-3 mb-3">
        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          AI Teacher&apos;s Toolkit
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href !== '#' && pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }
              `}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="px-2 mb-1">
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 text-sm w-full transition-colors">
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </button>
      </div>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-gray-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          SP
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">SMRITI PUBLIC</p>
          <p className="text-gray-500 text-xs truncate">Admin User</p>
        </div>
      </div>
    </aside>
  )
}
