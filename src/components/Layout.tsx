import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  to: string;
  label: string;
  matchPrefix?: boolean;
};

const primaryNavItems: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'Introduction' },
  { to: '/leadership-messages', label: 'Leadership' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
];

const publicUpdateItems: NavItem[] = [
  { to: '/notices', label: 'Public Notices' },
  { to: '/news', label: 'News / Updates' },
  { to: '/downloads', label: 'Downloads / Forms' },
];

const citizenServiceItems: NavItem[] = [
  { to: '/citizen/dashboard', label: 'Citizen Login / Profile', matchPrefix: true },
  { to: '/submit', label: 'Submit Complaint' },
  { to: '/track', label: 'Track Complaint' },
  { to: '/certificates/apply', label: 'Apply Certificate' },
  { to: '/certificates/track', label: 'Track Certificate' },
];

const staffAccessItems: NavItem[] = [
  { to: '/admin', label: 'Admin Dashboard', matchPrefix: true },
  { to: '/councilor/certificates', label: 'Councilor Dashboard', matchPrefix: true },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.to === '/') {
    return pathname === '/';
  }

  return item.matchPrefix ? pathname.startsWith(item.to) : pathname === item.to;
}

function navLinkClass(isActive: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  }`;
}

function dropdownLinkClass(isActive: boolean) {
  return `block rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  }`;
}

function DesktopDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const location = useLocation();
  const active = items.some((item) => isItemActive(location.pathname, item));

  return (
    <div className="group relative">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
          active ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        }`}
      >
        {label}
        <ChevronDown className="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>

      <div className="invisible absolute right-0 top-full z-40 w-64 translate-y-2 rounded-2xl border border-slate-100 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() => dropdownLinkClass(isItemActive(location.pathname, item))}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function MobileSection({ title, items, closeMenu }: { title: string; items: NavItem[]; closeMenu: () => void }) {
  const location = useLocation();

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
      <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-civic-700">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMenu}
            className={() => dropdownLinkClass(isItemActive(location.pathname, item))}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex flex-none items-center gap-3" aria-label="Kunri Citizens Portal home">
            <img
              src="/logo.png"
              alt="Town Committee Kunri logo"
              className="h-11 w-11 rounded-2xl object-contain shadow-sm sm:h-12 sm:w-12"
              width={48}
              height={48}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-civic-700 sm:text-xs">
                Town Committee
              </p>
              <h1 className="truncate text-base font-bold leading-tight text-slate-950 sm:text-lg">
                Kunri Citizens Portal
              </h1>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center rounded-xl border border-slate-200 p-2 text-slate-700 xl:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav className="hidden items-center justify-end gap-1 xl:flex" aria-label="Main navigation">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navLinkClass(isActive)}
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            ))}

            <DesktopDropdown label="Public Updates" items={publicUpdateItems} />
            <DesktopDropdown label="Citizen Services" items={citizenServiceItems} />
            <DesktopDropdown label="Staff Login" items={staffAccessItems} />
          </nav>
        </div>

        {open ? (
          <nav className="max-h-[78vh] overflow-y-auto border-t border-slate-100 bg-white px-4 py-3 xl:hidden" aria-label="Mobile navigation">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <MobileSection title="Main" items={primaryNavItems} closeMenu={() => setOpen(false)} />
              <MobileSection title="Public Updates" items={publicUpdateItems} closeMenu={() => setOpen(false)} />
              <MobileSection title="Citizen Services" items={citizenServiceItems} closeMenu={() => setOpen(false)} />
              <MobileSection title="Staff Login" items={staffAccessItems} closeMenu={() => setOpen(false)} />
            </div>
          </nav>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p>© {new Date().getFullYear()} Town Committee Kunri. Citizen service and complaint management portal.</p>
            <p className="mt-2 text-xs text-slate-500">
              Official contact details, notices, forms and downloads should be updated after written approval.
            </p>
          </div>
          <p className="font-medium text-civic-800">For official use after written approval.</p>
        </div>
      </footer>
    </div>
  );
}
