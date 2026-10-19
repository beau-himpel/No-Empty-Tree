import { effect, inject, Injectable, signal } from '@angular/core';
import { ToastService } from '../../shared/toast/toast.service';
import {
  DraftMember,
  emptyDraft,
  FamilyDetails,
  hasContent,
  Item,
  newMember,
  NominationDraft,
  parseStoredDraft,
  ResumableStep,
} from './nomination.model';

const STORAGE_KEY = 'nominateFamilyInfo';

/**
 * The in-progress nomination, autosaved to localStorage so a nominator can leave and
 * come back. Provided by the nominate page, so it lives exactly as long as the flow.
 */
@Injectable()
export class NominationDraftService {
  private readonly toast = inject(ToastService);

  readonly draft = signal<NominationDraft>(emptyDraft());
  /** True when the page opened with a draft from an earlier visit. */
  readonly restored = signal(false);

  constructor() {
    try {
      const stored = parseStoredDraft(localStorage.getItem(STORAGE_KEY));
      if (stored && hasContent(stored)) {
        this.draft.set(stored);
        this.restored.set(true);
      }
    } catch (error) {
      console.warn('Discarding unreadable nomination draft:', error);
      this.clearStorage();
    }

    effect(() => {
      const draft = this.draft();
      try {
        if (hasContent(draft)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Failed to save nomination draft:', error);
      }
    });
  }

  member(id: string): DraftMember | undefined {
    return this.draft().members.find((member) => member.id === id);
  }

  setStep(step: ResumableStep): void {
    this.draft.update((draft) => ({ ...draft, step }));
  }

  updateFamily(family: FamilyDetails): void {
    this.draft.update((draft) => ({ ...draft, family }));
  }

  addMember(): DraftMember {
    const member = newMember();
    this.draft.update((draft) => ({ ...draft, members: [...draft.members, member] }));
    return member;
  }

  updateMember(id: string, changes: Partial<Omit<DraftMember, 'id'>>): void {
    this.draft.update((draft) => ({
      ...draft,
      members: draft.members.map((member) =>
        member.id === id ? { ...member, ...changes } : member
      ),
    }));
  }

  removeMember(id: string, options: { undoable: boolean }): void {
    const members = this.draft().members;
    const index = members.findIndex((member) => member.id === id);
    if (index < 0) return;
    const removed = members[index];

    this.draft.update((draft) => ({
      ...draft,
      members: draft.members.filter((member) => member.id !== id),
    }));

    if (options.undoable) {
      this.toast.show(`${removed.name.trim() || 'Family member'} removed`, {
        action: {
          label: 'Undo',
          run: () =>
            this.draft.update((draft) => {
              const restored = [...draft.members];
              restored.splice(Math.min(index, restored.length), 0, removed);
              return { ...draft, members: restored };
            }),
        },
      });
    }
  }

  addItem(memberId: string, item: Item): void {
    const member = this.member(memberId);
    if (member) this.updateMember(memberId, { items: [...member.items, item] });
  }

  removeItem(memberId: string, index: number): void {
    const member = this.member(memberId);
    const removed = member?.items[index];
    if (!member || !removed) return;

    this.updateMember(memberId, { items: member.items.filter((_, i) => i !== index) });
    this.toast.show('Gift removed', {
      action: {
        label: 'Undo',
        run: () => {
          const current = this.member(memberId);
          if (!current) return;
          const items = [...current.items];
          items.splice(Math.min(index, items.length), 0, removed);
          this.updateMember(memberId, { items });
        },
      },
    });
  }

  reset(): void {
    this.draft.set(emptyDraft());
    this.restored.set(false);
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode); nothing to clear
    }
  }
}
