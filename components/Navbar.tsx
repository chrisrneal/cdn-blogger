'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Correct hook for App Router
import { useAuth } from './AuthContext';
import { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, Settings, UserX, Menu } from 'lucide-react'; // Import icons
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Refresh to update server components if any
  };

  const getUserInitials = () => {
    if (!user || !user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-2xl">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          CDN Blogger
        </Link>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {/* My Posts, My Comments & New Post Links */}
              <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
                {user && (
                  <>
                    <Link
                      href="/my-posts"
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      My Posts
                    </Link>
                    <Link
                      href="/my-comments"
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      My Comments
                    </Link>
                  </>
                )}
                <Link
                  href="/editor"
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  New Post
                </Link>
              </div>

              {/* Profile Menu Trigger */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  aria-label="User menu"
                >
                  {user ? (
                     user.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="User Avatar"
                            className="w-full h-full rounded-full object-cover"
                        />
                     ) : (
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {getUserInitials()}
                        </span>
                     )
                  ) : (
                    <UserX size={18} className="text-slate-500" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">

                    {/* Mobile Only Links (Show if screen is small) */}
                    <div className="sm:hidden border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
                        {user && (
                            <>
                                <Link
                                    href="/my-posts"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <span>My Posts</span>
                                </Link>
                                <Link
                                    href="/my-comments"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <span>My Comments</span>
                                </Link>
                            </>
                        )}
                        <Link
                            href="/editor"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <span>New Post</span>
                        </Link>
                    </div>

                    {user ? (
                      <>
                        <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 truncate">
                          {user.email}
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Settings size={16} />
                          <span>Settings</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                        >
                          <LogOut size={16} />
                          <span>Log Out</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <LogIn size={16} />
                        <span>Log In</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
