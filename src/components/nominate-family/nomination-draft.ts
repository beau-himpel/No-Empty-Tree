import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../lib/toast';
import {
  type DraftMember,
  emptyDraft,
  type FamilyDetails,
  hasContent,
  type Item,
  newMember,
  type NominationDraft,
  parseStoredDraft,
  type ResumableStep,
} from './nomination.model';

const STORAGE_KEY = 'nominateFamilyInfo';

function loadStoredDraft(): NominationDraft | null {
  try {
    const stored = parseStoredDraft(localStorage.getItem(STORAGE_KEY));
    return stored && hasContent(stored) ? stored : null;
  } catch (error) {
    console.warn('Discarding unreadable nomination draft:', error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode); nothing to clear
    }
    return null;
  }
}

/**
 * The in-progress nomination, autosaved to localStorage so a nominator can leave and
 * come back. Owned by the nominate page, so it lives exactly as long as the flow.
 */
export function useNominationDraftState() {
  const [initial] = useState(loadStoredDraft);
  const [draft, setDraftState] = useState<NominationDraft>(() => initial ?? emptyDraft());
  /** True when the page opened with a draft from an earlier visit. */
  const [restored, setRestored] = useState(initial !== null);

  // Mirrors the latest draft so actions (and their Undo callbacks) never read a stale render
  const latest = useRef(draft);
  const update = (change: (draft: NominationDraft) => NominationDraft) => {
    latest.current = change(latest.current);
    setDraftState(latest.current);
  };

  useEffect(() => {
    try {
      if (hasContent(draft)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save nomination draft:', error);
    }
  }, [draft]);

  const actions = useMemo(() => {
    const member = (id: string): DraftMember | undefined =>
      latest.current.members.find((candidate) => candidate.id === id);

    const updateMember = (id: string, changes: Partial<Omit<DraftMember, 'id'>>) =>
      update((current) => ({
        ...current,
        members: current.members.map((candidate) =>
          candidate.id === id ? { ...candidate, ...changes } : candidate
        ),
      }));

    return {
      member,
      updateMember,

      setStep: (step: ResumableStep) => update((current) => ({ ...current, step })),

      updateFamily: (family: FamilyDetails) => update((current) => ({ ...current, family })),

      addMember: (): DraftMember => {
        const added = newMember();
        update((current) => ({ ...current, members: [...current.members, added] }));
        return added;
      },

      removeMember: (id: string, options: { undoable: boolean }) => {
        const members = latest.current.members;
        const index = members.findIndex((candidate) => candidate.id === id);
        if (index < 0) return;
        const removed = members[index];

        update((current) => ({
          ...current,
          members: current.members.filter((candidate) => candidate.id !== id),
        }));

        if (options.undoable) {
          toast.show(`${removed.name.trim() || 'Family member'} removed`, {
            action: {
              label: 'Undo',
              run: () =>
                update((current) => {
                  const restoredMembers = [...current.members];
                  restoredMembers.splice(Math.min(index, restoredMembers.length), 0, removed);
                  return { ...current, members: restoredMembers };
                }),
            },
          });
        }
      },

      addItem: (memberId: string, item: Item) => {
        const current = member(memberId);
        if (current) updateMember(memberId, { items: [...current.items, item] });
      },

      removeItem: (memberId: string, index: number) => {
        const current = member(memberId);
        const removed = current?.items[index];
        if (!current || !removed) return;

        updateMember(memberId, { items: current.items.filter((_, i) => i !== index) });
        toast.show('Gift removed', {
          action: {
            label: 'Undo',
            run: () => {
              const now = member(memberId);
              if (!now) return;
              const items = [...now.items];
              items.splice(Math.min(index, items.length), 0, removed);
              updateMember(memberId, { items });
            },
          },
        });
      },

      reset: () => {
        update(() => emptyDraft());
        setRestored(false);
      },
    };
  }, []);

  return { draft, restored, ...actions };
}

export type NominationDrafts = ReturnType<typeof useNominationDraftState>;

export const NominationDraftContext = createContext<NominationDrafts | null>(null);

export function useNominationDraft(): NominationDrafts {
  const drafts = useContext(NominationDraftContext);
  if (!drafts) throw new Error('useNominationDraft must be used inside the nominate page');
  return drafts;
}
