import { TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { expandCollapse } from '../../shared/animations';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { PersonBadgeComponent, personTone } from '../../shared/person-badge.component';
import { PhoneMaskDirective } from '../../shared/phone-mask.directive';
import { scrollBehavior } from '../../shared/motion';
import { ToastService } from '../../shared/toast/toast.service';
import { SupabaseService } from '../../supabase.service';
import { MemberEditorComponent } from './member-editor/member-editor.component';
import { NominationDraftService } from './nomination-draft.service';
import {
  DraftMember,
  genderLabel,
  isBlankMember,
  Item,
  joinWithAnd,
  memberProblems,
  normalizeLink,
  ResumableStep,
} from './nomination.model';

type Step = ResumableStep | 'member' | 'done';

const STEP_NUMBER: Record<Step, number> = { family: 1, members: 2, member: 2, review: 3, done: 3 };

const notBlank = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

const phoneNumber = (control: AbstractControl) => {
  const digits = String(control.value ?? '').replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10 ? null : { phone: true };
};

@Component({
  selector: 'app-nominate-family',
  standalone: true,
  imports: [ReactiveFormsModule, PhoneMaskDirective, MemberEditorComponent, TitleCasePipe, PersonBadgeComponent],
  providers: [NominationDraftService],
  templateUrl: './nominate-family.component.html',
  styleUrls: ['./nominate-family.component.scss'],
  animations: [expandCollapse],
})
export class NominateFamilyComponent implements OnInit {
  readonly drafts = inject(NominationDraftService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly nominationSettingsService = inject(NominationSettingsService);

  readonly nominationsEnabled = this.nominationSettingsService.nominationsEnabled;
  readonly settingsLoading = computed(
    () => this.nominationSettingsService.loading() || this.nominationsEnabled() === null
  );

  readonly step = signal<Step>('family');
  readonly stepNumber = computed(() => STEP_NUMBER[this.step()]);
  readonly editingMemberId = signal<string | null>(null);
  readonly editingIsNew = signal(false);

  readonly familySubmitted = signal(false);
  readonly membersSubmitted = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal<{ familyName: string; gifts: number } | null>(null);

  readonly familyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank]],
    address: ['', [Validators.required, notBlank]],
    phone: ['', [phoneNumber]],
    email: ['', [Validators.email]],
  });

  readonly family = computed(() => this.drafts.draft().family);
  readonly familyName = computed(() => {
    const name = this.family().name.trim();
    return name ? new TitleCasePipe().transform(name) : '';
  });

  readonly memberRows = computed(() =>
    this.drafts.draft().members.map((member) => ({
      member,
      problems: memberProblems(member),
      summary: this.memberSummary(member),
      tone: personTone(member.isChild === null ? null : !member.isChild, member.gender),
    }))
  );
  readonly incompleteCount = computed(
    () => this.memberRows().filter((row) => row.problems.length > 0).length
  );
  readonly giftCount = computed(() =>
    this.drafts.draft().members.reduce((sum, member) => sum + member.items.length, 0)
  );

  readonly joinWithAnd = joinWithAnd;

  ngOnInit(): void {
    const draft = this.drafts.draft();
    this.familyForm.setValue(draft.family, { emitEvent: false });
    if (draft.step !== 'family') this.familySubmitted.set(true);
    this.step.set(draft.step);

    this.familyForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.drafts.updateFamily(this.familyForm.getRawValue()));
  }

  showFamilyError(name: 'name' | 'address' | 'phone' | 'email'): boolean {
    const control = this.familyForm.controls[name];
    return control.invalid && (control.touched || this.familySubmitted());
  }

  goTo(step: Step): void {
    this.step.set(step);
    if (step === 'family' || step === 'members' || step === 'review') {
      this.drafts.setStep(step);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  continueFromFamily(): void {
    this.familySubmitted.set(true);
    this.familyForm.markAllAsTouched();
    if (this.familyForm.invalid) {
      this.focusFirstInvalid();
      return;
    }
    this.goTo('members');
  }

  addMember(): void {
    const member = this.drafts.addMember();
    this.openEditor(member.id, true);
  }

  editMember(id: string): void {
    this.openEditor(id, false);
  }

  closeEditor(): void {
    const id = this.editingMemberId();
    const member = id ? this.drafts.member(id) : undefined;
    // A member opened via "Add" and left untouched shouldn't linger as a blank row
    if (id && member && isBlankMember(member)) {
      this.drafts.removeMember(id, { undoable: false });
    }
    this.editingMemberId.set(null);
    this.goTo('members');
  }

  removeEditingMember(): void {
    const id = this.editingMemberId();
    if (!id) return;
    const member = this.drafts.member(id);
    this.drafts.removeMember(id, { undoable: !!member && !isBlankMember(member) });
    this.editingMemberId.set(null);
    this.goTo('members');
  }

  continueFromMembers(): void {
    this.membersSubmitted.set(true);
    if (this.memberRows().length === 0 || this.incompleteCount() > 0) return;
    this.goTo('review');
  }

  async startOver(): Promise<void> {
    const confirmed = await this.confirmService.open({
      tone: 'dark',
      icon: 'pi-refresh',
      title: 'Start over?',
      message: "This clears the family details and members you've entered so far.",
      confirmLabel: 'Start over',
    });
    if (!confirmed) return;
    this.resetFlow();
    this.goTo('family');
  }

  nominateAnother(): void {
    this.submitted.set(null);
    this.goTo('family');
  }

  viewOnAdoptFamilies(): void {
    this.router.navigate(['/adopt-family']);
  }

  async submit(): Promise<void> {
    if (this.isSaving()) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.saveError.set('Your session has ended. Please sign in again to submit.');
      return;
    }

    const draft = this.drafts.draft();
    if (this.familyForm.invalid || draft.members.length === 0 || this.incompleteCount() > 0) {
      this.saveError.set('Some details are missing. Check the family and members above.');
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const familyRecord = await this.supabaseService.createFamily({
        last_name: draft.family.name.trim(),
        address: draft.family.address.trim(),
        phone: draft.family.phone || undefined,
        email: draft.family.email.trim() || undefined,
        nominated_by: user.id,
        season: await this.nominationSettingsService.currentSeason(),
      });

      try {
        for (const member of draft.members) {
          const memberRecord = await this.supabaseService.addFamilyMember({
            family_id: familyRecord.id,
            first_name: member.name.trim(),
            age: member.age ?? 0,
            sex: member.gender === 'Female' ? 'female' : 'male',
            is_parent: member.isChild === false,
            // Omitted when blank, so saving works even before the column migration runs
            ethnicity: member.ethnicity.trim() || undefined,
          });

          for (const item of member.items) {
            await this.supabaseService.addWishlistItem({
              family_member_id: memberRecord.id,
              category: item.category,
              description: item.description,
              color: item.color || undefined,
              size: item.size || undefined,
              link: normalizeLink(item.link),
              details: item.details || undefined,
            });
          }
        }
      } catch (memberError) {
        // Don't leave a half-saved family on the adopt list
        await this.supabaseService.deleteFamily(familyRecord.id).catch(() => undefined);
        throw memberError;
      }

      this.submitted.set({ familyName: this.familyName(), gifts: this.giftCount() });
      this.resetFlow();
      this.step.set('done');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      console.error('Error saving nomination:', error);
      this.saveError.set(
        "We couldn't submit this nomination. Your draft is saved, so please try again."
      );
      this.toast.error("Couldn't submit the nomination");
    } finally {
      this.isSaving.set(false);
    }
  }

  itemVariant(item: Item): string {
    return [item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ');
  }

  private openEditor(id: string, isNew: boolean): void {
    this.editingMemberId.set(id);
    this.editingIsNew.set(isNew);
    this.goTo('member');
  }

  private resetFlow(): void {
    // A pending "Undo" would otherwise write into the fresh, empty draft
    this.toast.clear();
    this.drafts.reset();
    this.familyForm.reset({ name: '', address: '', phone: '', email: '' }, { emitEvent: false });
    this.familySubmitted.set(false);
    this.membersSubmitted.set(false);
    this.saveError.set(null);
  }

  private memberSummary(member: DraftMember): string {
    const who = genderLabel(member.gender, member.isChild) ||
      (member.isChild === true ? 'Child' : member.isChild === false ? 'Adult' : '');
    const parts = [[who, member.age ?? ''].filter((part) => part !== '').join(', ')];
    parts.push(`${member.items.length} ${member.items.length === 1 ? 'gift' : 'gifts'}`);
    return parts.filter(Boolean).join(' · ');
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        const target = this.host.nativeElement.querySelector<HTMLElement>('.field-input-invalid');
        target?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        target?.focus({ preventScroll: true });
      },
      { injector: this.injector }
    );
  }
}
