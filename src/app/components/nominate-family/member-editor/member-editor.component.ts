import { TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { expandCollapse } from '../../../shared/animations';
import {
  ChoiceGroupComponent,
  ChoiceOption,
} from '../../../shared/choice-group.component';
import { scrollBehavior } from '../../../shared/motion';
import { ItemInfoComponent } from '../../item-info/item-info.component';
import { ItemFormComponent } from '../item-form/item-form.component';
import { NominationDraftService } from '../nomination-draft.service';
import {
  Gender,
  Item,
  MAX_AGE,
  MAX_ETHNICITY_LENGTH,
  memberProblems,
} from '../nomination.model';

const ADULT_AGE = 18;

const notBlank = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : null;

const wholeNumber = (control: AbstractControl) =>
  control.value === null || Number.isInteger(control.value)
    ? null
    : { wholeNumber: true };

@Component({
  selector: 'app-member-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ChoiceGroupComponent,
    ItemFormComponent,
    ItemInfoComponent,
  ],
  templateUrl: './member-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [expandCollapse],
})
export class MemberEditorComponent implements OnInit {
  readonly memberId = input.required<string>();
  readonly isNew = input(false);
  readonly saved = output<void>();
  readonly back = output<void>();
  readonly removeRequested = output<void>();

  private readonly drafts = inject(NominationDraftService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly giftForm = viewChild(ItemFormComponent);
  private readonly giftSection =
    viewChild<ElementRef<HTMLElement>>('giftSection');

  readonly member = computed(() => this.drafts.member(this.memberId()));
  readonly items = computed(() => this.member()?.items ?? []);
  readonly title = computed(() => {
    const name = this.member()?.name.trim();
    if (name) return new TitleCasePipe().transform(name);
    return this.isNew() ? 'Add a family member' : 'Family member';
  });

  readonly submitted = signal(false);
  readonly showGiftForm = signal(false);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, notBlank]),
    age: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_AGE),
      wholeNumber,
    ]),
    isChild: this.fb.control<boolean | null>(null, [Validators.required]),
    gender: this.fb.nonNullable.control<Gender>('', [Validators.required]),
    ethnicity: this.fb.nonNullable.control('', [
      Validators.maxLength(MAX_ETHNICITY_LENGTH),
    ]),
  });

  readonly maxEthnicityLength = MAX_ETHNICITY_LENGTH;

  private readonly isChild = signal<boolean | null>(null);

  readonly typeOptions: ChoiceOption<boolean>[] = [
    { label: 'Adult', value: false },
    { label: 'Child', value: true },
  ];

  readonly genderOptions = computed<ChoiceOption<Gender>[]>(() => {
    const isChild = this.isChild();
    return [
      {
        label: isChild === true ? 'Boy' : isChild === false ? 'Man' : 'Male',
        value: 'Male',
      },
      {
        label:
          isChild === true ? 'Girl' : isChild === false ? 'Woman' : 'Female',
        value: 'Female',
      },
    ];
  });

  // Adult/child is suggested from the age until the user picks it themselves
  private typeChosenByUser = false;
  private settingTypeFromAge = false;

  ngOnInit(): void {
    const member = this.member();
    if (!member) return;

    this.form.setValue(
      {
        name: member.name,
        age: member.age,
        isChild: member.isChild,
        gender: member.gender,
        ethnicity: member.ethnicity,
      },
      { emitEvent: false },
    );
    this.isChild.set(member.isChild);
    this.typeChosenByUser = member.isChild !== null;
    this.showGiftForm.set(member.items.length === 0);

    const { age, isChild } = this.form.controls;
    age.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (
          this.typeChosenByUser ||
          value === null ||
          value < 0 ||
          value > MAX_AGE
        )
          return;
        this.settingTypeFromAge = true;
        isChild.setValue(value < ADULT_AGE);
        this.settingTypeFromAge = false;
      });
    isChild.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.isChild.set(value);
        if (!this.settingTypeFromAge) this.typeChosenByUser = true;
      });

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const value = this.form.getRawValue();
        this.drafts.updateMember(this.memberId(), {
          name: value.name,
          age: value.age,
          isChild: value.isChild,
          gender: value.gender,
          ethnicity: value.ethnicity,
        });
      });
  }

  showError(name: 'name' | 'age' | 'isChild' | 'gender'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  readonly giftsMissing = computed(
    () => this.submitted() && this.items().length === 0,
  );

  addItem(item: Item): void {
    this.drafts.addItem(this.memberId(), item);
    this.showGiftForm.set(false);
  }

  removeItem(index: number): void {
    this.drafts.removeItem(this.memberId(), index);
  }

  openGiftForm(): void {
    this.showGiftForm.set(true);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('app-item-form [role="radio"]')
          ?.focus(),
      { injector: this.injector },
    );
  }

  save(): void {
    if (!this.settleGiftForm()) return;

    this.submitted.set(true);
    this.form.markAllAsTouched();
    const member = this.member();
    if (!member) return;

    if (memberProblems(member).length > 0) {
      this.focusFirstProblem();
      return;
    }
    this.saved.emit();
  }

  goBack(): void {
    if (this.settleGiftForm()) this.back.emit();
  }

  /** Adds a finished gift that hasn't been added yet; blocks on a half-filled one. */
  private settleGiftForm(): boolean {
    if (this.giftForm()?.commit() === 'invalid') {
      this.giftSection()?.nativeElement.scrollIntoView({
        block: 'start',
        behavior: scrollBehavior(),
      });
      return false;
    }
    return true;
  }

  private focusFirstProblem(): void {
    afterNextRender(
      () => {
        const target = this.host.nativeElement.querySelector<HTMLElement>(
          '.field-input-invalid, [role="radiogroup"][aria-invalid="true"] [role="radio"], #gifts-missing',
        );
        target?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        if (target && target.id !== 'gifts-missing')
          target.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
