import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../lib/auth';
import { currentSeason } from '../../lib/nomination-settings';
import { getFamiliesBeforeSeason } from '../../lib/supabase';
import { titleCase } from '../../lib/text';
import type { Family } from '../../lib/types';
import { ChoiceGroup, type ChoiceOption } from '../../shared/ChoiceGroup';
import { FamilyTab } from '../../shared/FamilyTab';
import { ItemInfo } from '../item-info/ItemInfo';
import { adoptedBy, giftCount, memberLine } from '../my-adoptions/adopted-by';

interface PastSeason {
  season: number;
  families: Family[];
  gifts: number;
}

/** What the signed-in donor adopted in earlier seasons, by year, then family, then person. */
export default function PastAdoptions() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  /** null shows every year. */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setFamilies(await getFamiliesBeforeSeason(await currentSeason()));
    } catch {
      setError("We couldn't load your past adoptions. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Newest season first; families arrive A–Z within each season. */
  const seasons = useMemo<PastSeason[]>(() => {
    const bySeason = new Map<number, Family[]>();
    for (const family of adoptedBy(families, user?.id)) {
      bySeason.set(family.season, [...(bySeason.get(family.season) ?? []), family]);
    }
    return [...bySeason.entries()]
      .sort(([a], [b]) => b - a)
      .map(([season, seasonFamilies]) => ({ season, families: seasonFamilies, gifts: giftCount(seasonFamilies) }));
  }, [families, user]);

  const yearOptions: ChoiceOption<number | null>[] = [
    { label: 'All years', value: null },
    ...seasons.map((s) => ({ label: String(s.season), value: s.season })),
  ];
  const visibleSeasons = selectedYear === null ? seasons : seasons.filter((s) => s.season === selectedYear);
  const totalGifts = seasons.reduce((sum, s) => sum + s.gifts, 0);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <Link
        to="/my-adoptions"
        viewTransition
        className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 active:scale-95"
      >
        <i className="pi pi-chevron-left text-xs" aria-hidden="true" />
        My Adoptions
      </Link>

      <h1 className="type-page-title mt-3">Past adoptions</h1>
      {!isLoading && !error && totalGifts > 0 && (
        <p className="mt-2 text-[0.9375rem] text-stone-500 tabular-nums">
          {totalGifts} {totalGifts === 1 ? 'gift' : 'gifts'} across {seasons.length}{' '}
          {seasons.length === 1 ? 'season' : 'seasons'}. Thank you!
        </p>
      )}

      {isLoading ? (
        <>
          <div className="mt-10 animate-pulse space-y-4" aria-hidden="true">
            {[1, 2, 3].map((placeholder) => (
              <div key={placeholder} className="space-y-4">
                <div className="h-8 w-40 rounded-lg bg-stone-100" />
                <div className="h-4 w-2/3 rounded bg-stone-100" />
              </div>
            ))}
          </div>
          <span className="sr-only" role="status">
            Loading your past adoptions…
          </span>
        </>
      ) : error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-berry-50 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
          <div className="flex items-center gap-3">
            <i className="pi pi-exclamation-circle text-berry-600" aria-hidden="true" />
            <span className="text-sm font-medium text-berry-800">{error}</span>
          </div>
          <button type="button" className="btn-outline btn-sm self-start sm:self-auto" onClick={load}>
            <i className="pi pi-refresh text-xs" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : totalGifts === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50">
            <i className="pi pi-history text-2xl text-pine-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-snug text-stone-900">No past adoptions yet</p>
            <p className="mt-1 text-sm text-stone-500">Gifts you adopted in earlier seasons will show up here.</p>
          </div>
        </div>
      ) : (
        <>
          {seasons.length > 1 && (
            <div className="mt-6 animate-fade-up">
              <span className="sr-only" id="past-year-label">
                Show year
              </span>
              <ChoiceGroup
                options={yearOptions}
                value={selectedYear}
                onChange={setSelectedYear}
                variant="chips"
                labelledBy="past-year-label"
              />
            </div>
          )}

          <div className="mt-10 space-y-14">
            {visibleSeasons.map((season) => (
              <section
                key={season.season}
                className="animate-fade-up"
                aria-labelledby={`past-season-${season.season}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2
                    id={`past-season-${season.season}`}
                    className="text-[1.75rem] font-semibold leading-none tracking-title tabular-nums text-stone-900"
                  >
                    {season.season}
                  </h2>
                  <span className="text-sm text-stone-500 tabular-nums">
                    {season.gifts} {season.gifts === 1 ? 'gift' : 'gifts'}
                  </span>
                </div>

                <div className="mt-6 space-y-8">
                  {season.families.map((family) => (
                    <div key={family.id}>
                      <h3>
                        <FamilyTab>The {titleCase(family.last_name)} Family</FamilyTab>
                      </h3>

                      {family.family_members.map((member) => (
                        <div key={member.id} className="pt-5">
                          <h4 className="flex items-baseline gap-2">
                            <span className="text-[1.0625rem] font-semibold tracking-snug text-stone-900">
                              {titleCase(member.first_name)}
                            </span>
                            <span className="text-sm text-stone-500">{memberLine(member)}</span>
                          </h4>
                          <ul className="mt-1 divide-y divide-stone-100">
                            {(member.wishlist_items || []).map((item) => (
                              <li key={item.id} className="py-3">
                                <ItemInfo item={item} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
