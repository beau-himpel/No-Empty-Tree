import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdoptions } from '../../lib/adoption';
import { cubicBezier, isMobile, PANEL_EASE_POINTS, PANEL_OPEN_MS, prefersReducedMotion } from '../../lib/motion';
import { currentSeason, useNominationSettings } from '../../lib/nomination-settings';
import { getFamiliesWithMembers } from '../../lib/supabase';
import { titleCase } from '../../lib/text';
import type { Family } from '../../lib/types';
import { AnimatedNumber } from '../../shared/AnimatedNumber';
import { FamilyTab } from '../../shared/FamilyTab';
import { useAfterRender } from '../../shared/forms';
import { FamilyDetails } from '../family-details/FamilyDetails';
import { ExpandPanel } from './ExpandPanel';

// Height of the sticky app header; rows stick and scroll-align just below it
const HEADER_OFFSET_PX = 64;
const MAX_STAGGERED_ROWS = 10;
// Same curve and length as the panel opening, so both move as one
const revealEase = cubicBezier(...PANEL_EASE_POINTS);

interface FamilyRow {
  info: Family;
  summary: string;
  totalGifts: number;
  adoptedGifts: number;
  remaining: number;
  progressPct: number;
  fullyAdopted: boolean;
}

function countLabel(count: number, one: string, many: string): string | null {
  return count > 0 ? `${count} ${count === 1 ? one : many}` : null;
}

function toRow(family: Family): FamilyRow {
  const members = family.family_members;
  const children = members.filter((member) => !member.is_parent);
  const summary = [
    countLabel(members.filter((member) => member.is_parent).length, 'adult', 'adults'),
    countLabel(children.filter((member) => member.sex === 'male').length, 'boy', 'boys'),
    countLabel(children.filter((member) => member.sex === 'female').length, 'girl', 'girls'),
    countLabel(
      children.filter((member) => member.sex !== 'male' && member.sex !== 'female').length,
      'child',
      'children'
    ),
  ]
    .filter(Boolean)
    .join(' · ');

  const items = members.flatMap((member) => member.wishlist_items || []);
  const adoptedGifts = items.filter((item) => item.is_adopted).length;
  const totalGifts = items.length;

  return {
    info: family,
    summary,
    totalGifts,
    adoptedGifts,
    remaining: totalGifts - adoptedGifts,
    progressPct: totalGifts === 0 ? 0 : (adoptedGifts / totalGifts) * 100,
    fullyAdopted: totalGifts > 0 && adoptedGifts === totalGifts,
  };
}

function rowElement(familyId: string): HTMLElement | null {
  return document.getElementById(`family-${familyId}`);
}

export default function AdoptFamily() {
  const navigate = useNavigate();
  const { version } = useAdoptions();
  const { nominationsEnabled } = useNominationSettings();
  const afterRender = useAfterRender();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  /** Grouping is decided once per load so rows never move while someone is adopting. */
  const [groupOrder, setGroupOrder] = useState<{ needs: string[]; done: string[] }>({ needs: [], done: [] });
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  /** A family whose panel is animating closed. */
  const [closingFamilyId, setClosingFamilyId] = useState<string | null>(null);

  const loadFamilies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFamiliesWithMembers(await currentSeason());
      setFamilies(data);
      const rows = data.map(toRow);
      setGroupOrder({
        needs: rows.filter((row) => !row.fullyAdopted).map((row) => row.info.id),
        done: rows.filter((row) => row.fullyAdopted).map((row) => row.info.id),
      });
    } catch {
      setError("We couldn't load families. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  // Adoptions mutate items in place; version is what marks the rows as stale
  const rowsById = useMemo(() => new Map(families.map((family) => [family.id, toRow(family)])), [families, version]);

  const rowsFor = (ids: string[]) => ids.map((id) => rowsById.get(id)).filter((row): row is FamilyRow => !!row);
  const needsRows = rowsFor(groupOrder.needs);
  const doneRows = rowsFor(groupOrder.done);

  const totals = useMemo(() => {
    const rows = [...rowsById.values()];
    const totalGifts = rows.reduce((sum, row) => sum + row.totalGifts, 0);
    const adoptedGifts = rows.reduce((sum, row) => sum + row.adoptedGifts, 0);
    return {
      families: rows.length,
      totalGifts,
      adoptedGifts,
      remaining: totalGifts - adoptedGifts,
      progressPct: totalGifts === 0 ? 0 : (adoptedGifts / totalGifts) * 100,
    };
  }, [rowsById]);

  // Scrolling in step with a panel opening; any user scroll takes over immediately
  const glideFrame = useRef(0);
  const stopGlide = useCallback(() => {
    cancelAnimationFrame(glideFrame.current);
    window.removeEventListener('wheel', stopGlide);
    window.removeEventListener('touchstart', stopGlide);
  }, []);
  useEffect(() => stopGlide, [stopGlide]);

  /**
   * Scrolls in step with the panel opening, as one motion. The page isn't tall
   * enough for the target until the panel has grown, so each frame aims as far
   * as the page currently allows.
   */
  const glideScrollTo = (target: number) => {
    stopGlide();
    if (prefersReducedMotion()) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }

    const start = window.scrollY;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / PANEL_OPEN_MS);
      const eased = revealEase(progress);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.min(start + (target - start) * eased, maxScroll), behavior: 'instant' });
      if (progress < 1) {
        glideFrame.current = requestAnimationFrame(step);
      } else {
        stopGlide();
      }
    };
    window.addEventListener('wheel', stopGlide, { passive: true });
    window.addEventListener('touchstart', stopGlide, { passive: true });
    glideFrame.current = requestAnimationFrame(step);
  };

  /** Brings a newly opened row to the top when its details would otherwise be off screen. */
  const revealRow = (familyId: string) => {
    const row = rowElement(familyId);
    if (!row) return;
    const top = row.getBoundingClientRect().top;
    const isWellPlaced = Math.abs(top - HEADER_OFFSET_PX) < 4;
    const isLowOnScreen = top > window.innerHeight * 0.45;
    // Mobile keeps the original behavior of always bringing the selection into view
    if (!isWellPlaced && (isMobile() || isLowOnScreen)) {
      glideScrollTo(window.scrollY + top - HEADER_OFFSET_PX);
    }
  };

  const viewFamilyDetails = (family: Family) => {
    const row = rowElement(family.id);

    if (selectedFamilyId === family.id) {
      // If the header is stuck to the top, return the row to its natural position
      // first; it then sits exactly where the stuck header was, so nothing jumps.
      if (row && row.getBoundingClientRect().top < HEADER_OFFSET_PX) {
        row.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      setSelectedFamilyId(null);
      setClosingFamilyId(family.id);
      return;
    }

    if (!selectedFamilyId) {
      setSelectedFamilyId(family.id);
      if (closingFamilyId === family.id) setClosingFamilyId(null);
      afterRender(() => revealRow(family.id));
      return;
    }

    // Switching families: close the open one instantly and offset the scroll by the
    // height it gave up, so the tapped row stays exactly under the user's finger.
    const topBefore = row?.getBoundingClientRect().top ?? 0;
    setClosingFamilyId(null);
    setSelectedFamilyId(family.id);
    afterRender(() => {
      const topAfter = rowElement(family.id)?.getBoundingClientRect().top ?? topBefore;
      window.scrollBy({ top: topAfter - topBefore, behavior: 'instant' });
      revealRow(family.id);
    });
  };

  /** Celebrate a family finished while this page was open; ones already done just show it. */
  const completedThisVisit = (row: FamilyRow) => row.fullyAdopted && !groupOrder.done.includes(row.info.id);

  const renderRow = (row: FamilyRow, index: number) => {
    const id = row.info.id;
    const isOpen = selectedFamilyId === id;
    return (
      <div
        key={id}
        id={`family-${id}`}
        className="scroll-mt-16 animate-fade-up"
        style={{ animationDelay: `${Math.min(index, MAX_STAGGERED_ROWS) * 40}ms` }}
      >
        <button
          type="button"
          className={`group sticky top-16 z-10 block w-full bg-white pb-3.5 pt-4 text-left transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pine-600 ${
            isOpen ? 'shadow-[0_1px_0_#f5f5f4]' : ''
          }`}
          onClick={() => viewFamilyDetails(row.info)}
          aria-expanded={isOpen}
          aria-controls={`family-panel-${id}`}
        >
          <FamilyTab>The {titleCase(row.info.last_name)} Family</FamilyTab>

          <span className="mt-2.5 flex items-center gap-3 sm:gap-4">
            <span className="min-w-0 flex-1 truncate text-sm text-stone-500">{row.summary}</span>

            {row.fullyAdopted ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-pine-700 px-3 py-1.5 text-[0.8125rem] font-semibold text-white ${
                  completedThisVisit(row) ? 'animate-pop' : ''
                }`}
              >
                <i className="pi pi-check text-[0.6875rem]" aria-hidden="true" />
                All adopted
              </span>
            ) : row.totalGifts > 0 ? (
              <>
                <span
                  className="hidden h-1 w-14 shrink-0 overflow-hidden rounded-full bg-stone-100 min-[380px]:block sm:w-24"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-pine-600 transition-[width] duration-700 ease-out"
                    style={{ width: `${row.progressPct}%` }}
                  />
                </span>
                <span className="w-[4.75rem] shrink-0 text-right">
                  <span className="block text-[0.9375rem] font-semibold tabular-nums text-stone-900">
                    {row.remaining} left
                  </span>
                  <span className="block text-xs tabular-nums text-stone-500">of {row.totalGifts} gifts</span>
                </span>
              </>
            ) : null}

            <i
              className={`pi pi-chevron-down shrink-0 text-sm text-stone-400 transition-transform duration-500 ease-in-out ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {(isOpen || closingFamilyId === id) && (
          <ExpandPanel
            id={`family-panel-${id}`}
            open={isOpen}
            onClosed={() => setClosingFamilyId((current) => (current === id ? null : current))}
          >
            <FamilyDetails family={row.info} />
          </ExpandPanel>
        )}
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="type-page-title">Adopt a Family</h1>

      {error && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-berry-50 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
          <div className="flex items-center gap-3">
            <i className="pi pi-exclamation-circle text-berry-600" aria-hidden="true" />
            <span className="text-sm font-medium text-berry-800">{error}</span>
          </div>
          <button type="button" className="btn-outline btn-sm self-start sm:self-auto" onClick={loadFamilies}>
            <i className="pi pi-refresh text-xs" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <>
          <div className="mt-6 animate-pulse" aria-hidden="true">
            <div className="flex items-end gap-3">
              <div className="h-14 w-20 rounded-lg bg-stone-200 md:h-16" />
              <div className="mb-1 h-4 w-56 max-w-[55%] rounded bg-stone-100" />
            </div>
            <div className="mt-6 h-1 w-full rounded-full bg-stone-100" />
            <div className="mt-12 divide-y divide-stone-100">
              {[1, 2, 3, 4, 5].map((placeholder) => (
                <div key={placeholder} className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="h-5 w-2/5 rounded bg-stone-200" />
                    <div className="mt-2 h-4 w-1/4 rounded bg-stone-100" />
                  </div>
                  <div className="h-8 w-14 rounded bg-stone-100" />
                </div>
              ))}
            </div>
          </div>
          <span className="sr-only" role="status">
            Loading families…
          </span>
        </>
      ) : (
        totals.families > 0 && (
          /* Hero: the one number that matters */
          <div className="mt-6 animate-fade-up">
            <div className="flex items-baseline gap-3">
              <p className={`type-hero-number shrink-0 ${totals.remaining === 0 ? 'text-pine-700' : ''}`}>
                <AnimatedNumber value={totals.remaining} />
              </p>
              <p className="min-w-0 text-[0.9375rem] text-stone-500">
                {totals.remaining === 0
                  ? 'Every gift has been adopted. Thank you!'
                  : `${totals.remaining === 1 ? 'gift still needs' : 'gifts still need'} a home this season`}
              </p>
            </div>
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-pine-600 transition-[width] duration-700 ease-out"
                style={{ width: `${totals.progressPct}%` }}
              />
            </div>
            <p className="mt-2.5 flex justify-between text-sm font-medium tabular-nums">
              <span className="text-pine-700">
                <AnimatedNumber value={totals.adoptedGifts} /> of {totals.totalGifts.toLocaleString()} adopted
              </span>
              <span className="text-stone-500">
                {totals.families} {totals.families === 1 ? 'family' : 'families'}
              </span>
            </p>
          </div>
        )
      )}

      {!isLoading && !error && (
        <div className="mt-12">
          {needsRows.length > 0 && (
            <>
              <h2 className="type-section-label border-b border-stone-200 pb-2">Need gifts</h2>
              {needsRows.map((row, i) => renderRow(row, i))}
            </>
          )}

          {doneRows.length > 0 && (
            <>
              <h2 className={`type-section-label border-b border-stone-200 pb-2 ${needsRows.length > 0 ? 'mt-12' : ''}`}>
                Fully adopted
              </h2>
              {doneRows.map((row, i) => renderRow(row, needsRows.length + i))}
            </>
          )}

          {needsRows.length === 0 && doneRows.length === 0 && (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-up">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50">
                <i className="pi pi-gift text-2xl text-pine-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-snug text-stone-900">No families yet</p>
                <p className="mt-1 text-sm text-stone-500">
                  There are no families available for adoption right now. Please check back soon.
                </p>
              </div>
              {nominationsEnabled && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/nominate-family', { viewTransition: true })}
                >
                  <i className="pi pi-plus text-xs" aria-hidden="true" />
                  Nominate a family
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
