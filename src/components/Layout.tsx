import { Link, NavLink } from 'react-router-dom';
import { Building2, Menu } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'Introduction' },
  { to: '/leadership-messages', label: 'Leadership' },
  { to: '/services', label: 'Services' },
  { to: '/notices', label: 'Notices' },
  { to: '/news', label: 'News' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/contact', label: 'Contact' },
  { to: '/certificates/apply', label: 'Apply Certificate' },
  { to: '/certificates/track', label: 'Track Certificate' },
  { to: '/submit', label: 'Submit Complaint' },
  { to: '/track', label: 'Track' },
  { to: '/admin', label: 'Admin' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex flex-none items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-700 text-white shadow-sm">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-700">Town Committee</p>
              <h1 className="text-lg font-bold leading-tight text-slate-950 sm:text-xl">Kunri Citizens Portal</h1>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center rounded-xl border border-slate-200 p-2 text-slate-700 xl:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="hidden flex-wrap items-center justify-end gap-1 xl:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {open ? (
          <nav className="max-h-[75vh] overflow-y-auto border-t border-slate-100 bg-white px-4 py-3 xl:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p>© {new Date().getFullYear()} Town Committee Kunri. Citizen service and complaint management portal.</p>
            <p className="mt-2 text-xs text-slate-500">Official contact details, notices, forms and downloads should be updated after written approval.</p>
          </div>
          <p className="font-medium text-civic-800">For official use after written approval.</p>
        </div>
      </footer>
    </div>
  );
}
