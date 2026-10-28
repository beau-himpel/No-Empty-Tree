import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAdoptions } from '../../lib/adoption';
import { useAuth } from '../../lib/auth';
import { currentSeason } from '../../lib/nomination-settings';
import { getFamiliesWithMembers } from '../../lib/supabase';
import { titleCase } from '../../lib/text';
import type { Family } from '../../lib/types';
import { AnimatedNumber } from '../../shared/AnimatedNumber';
import { ExpandCollapse } from '../../shared/animations';
import { FamilyTab } from '../../shared/FamilyTab';
import { MemberDetails } from '../member-details/MemberDetails';
import { adoptedBy, giftCount } from './adopted-by';

export default function MyAdoptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useAdoptions();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);

  const loadAdoptedItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setFamilies(await getFamiliesWithMembers(await currentSeason()));
    } catch (loadError) {
      console.error('Error loading adopted items:', loadError);
      setError("We couldn't load your adoptions. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdoptedItems();
  }, [loadAdoptedItems]);

  // Adoptions mutate items in place; version is what marks the list as stale
  const adoptedFamilies = useMemo(() => adoptedBy(families, user?.id), [families, user, version]);
  const gifts = giftCount(adoptedFamilies);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="type-page-title">My Adoptions</h1>

      {isLoading ? (
        <>
          <div className="mt-6 animate-pulse" aria-hidden="true">
            <div className="h-14 w-20 rounded-lg bg-stone-200 md:h-16" />
            <div className="mt-3 h-4 w-48 rounded bg-stone-100" />
            <div className="mt-12 divide-y divide-stone-100">
              {[1, 2, 3].map((placeholder) => (
                <div key={placeholder} className="flex items-center gap-3 py-4">
                  <div className="h-10 w-10 rounded-full bg-stone-100" />
                  <div className="flex-1">
                    <div className="h-5 w-1/3 rounded bg-stone-200" />
                    <div className="mt-2 h-4 w-1/4 rounded bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <span className="sr-only" role="status">
            Loading your adoptions…
          </span>
        </>
      ) : error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-berry-50 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
          <div className="flex items-center gap-3">
            <i className="pi pi-exclamation-circle text-berry-600" aria-hidden="true" />
            <span className="text-sm font-medium text-berry-800">{error}</span>
          </div>
          <button type="button" className="btn-outline btn-sm self-start sm:self-auto" onClick={loadAdoptedItems}>
            <i className="pi pi-refresh text-xs" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : adoptedFamilies.length > 0 ? (
        <>
          <div className="mt-6 animate-fade-up">
            <p className="type-hero-number">
              <AnimatedNumber value={gifts} />
            </p>
            <p className="mt-2 text-[0.9375rem] text-stone-500">
              {gifts === 1 ? 'gift' : 'gifts'} adopted for {adoptedFamilies.length}{' '}
              {adoptedFamilies.length === 1 ? 'family' : 'families'}. Thank you!
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/my-adoptions/shopping-list" viewTransition className="btn-outline btn-sm">
                <i className="pi pi-list-check text-sm" aria-hidden="true" />
                Shopping list
              </Link>
              <Link to="/my-adoptions/past" viewTransition className="btn-outline btn-sm">
                <i className="pi pi-history text-sm" aria-hidden="true" />
                Past adoptions
              </Link>
            </div>
          </div>

          <div className="mt-12">
            {/* List enter/leave animations apply only to changes after the first render */}
            <AnimatePresence initial={false}>
              {adoptedFamilies.map((family, i) => (
                <ExpandCollapse key={family.id}>
                  <div className="pb-6 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <h2>
                      <FamilyTab>The {titleCase(family.last_name)} Family</FamilyTab>
                    </h2>
                    <div className="divide-y divide-stone-100">
                      <AnimatePresence initial={false}>
                        {family.family_members.map((member) => (
                          <ExpandCollapse key={member.id}>
                            <MemberDetails member={member} showAdoptionStatus={false} animateItems />
                          </ExpandCollapse>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </ExpandCollapse>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-berry-50">
            <i className="pi pi-heart text-2xl text-berry-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-snug text-stone-900">No adoptions yet</p>
            <p className="mt-1 text-sm text-stone-500">Gifts you adopt for a family will show up here.</p>
          </div>
          <button type="button" className="btn-adopt" onClick={() => navigate('/adopt-family', { viewTransition: true })}>
            Browse families
          </button>
          <Link to="/my-adoptions/past" viewTransition className="btn-quiet btn-sm">
            <i className="pi pi-history text-sm" aria-hidden="true" />
            Past adoptions
          </Link>
        </div>
      )}
    </section>
  );
}
