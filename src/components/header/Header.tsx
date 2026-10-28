import { Link, NavLink } from 'react-router';
import { signOut } from '../../lib/auth';
import { useNominationSettings } from '../../lib/nomination-settings';
import { TreeMark } from '../../shared/TreeMark';
import './Header.css';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;
const tabClass = ({ isActive }: { isActive: boolean }) => `tab ${isActive ? 'tab-active' : ''}`;

export function Header() {
  const { nominationsEnabled } = useNominationSettings();

  return (
    <>
      {/* Top bar */}
      <header className="app-chrome sticky top-0 z-40 border-b border-stone-200/80 bg-white [view-transition-name:app-header]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <Link
            to="/adopt-family"
            viewTransition
            className="flex items-center gap-2 no-underline transition-opacity active:opacity-70"
            aria-label="No Empty Tree home"
          >
            <TreeMark className="h-7 w-7 text-pine-700" />
            <span className="whitespace-nowrap text-[1.0625rem] font-semibold tracking-title text-stone-900">
              No Empty Tree
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavLink to="/adopt-family" viewTransition className={navLinkClass}>
              Adopt Families
            </NavLink>
            {nominationsEnabled && (
              <NavLink to="/nominate-family" viewTransition className={navLinkClass}>
                Nominate Family
              </NavLink>
            )}
            <NavLink to="/my-adoptions" viewTransition className={navLinkClass}>
              My Adoptions
            </NavLink>
            <button type="button" className="nav-link ml-3" onClick={signOut}>
              Log out
            </button>
          </nav>

          {/* Mobile: log out lives in the top bar; navigation is the bottom tab bar */}
          <button
            type="button"
            className="-mr-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 active:scale-95 md:hidden"
            onClick={signOut}
          >
            <i className="pi pi-sign-out text-[0.9375rem]" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white md:hidden [view-transition-name:app-tabbar]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="grid auto-cols-fr grid-flow-col">
          <NavLink to="/adopt-family" viewTransition className={tabClass}>
            <i className="pi pi-gift tab-icon" aria-hidden="true" />
            <span>Families</span>
          </NavLink>
          {nominationsEnabled && (
            <NavLink to="/nominate-family" viewTransition className={tabClass}>
              <i className="pi pi-plus-circle tab-icon" aria-hidden="true" />
              <span>Nominate</span>
            </NavLink>
          )}
          <NavLink to="/my-adoptions" viewTransition className={tabClass}>
            {({ isActive }) => (
              <>
                <i className={`pi tab-icon ${isActive ? 'pi-heart-fill' : 'pi-heart'}`} aria-hidden="true" />
                <span>My Adoptions</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </>
  );
}
