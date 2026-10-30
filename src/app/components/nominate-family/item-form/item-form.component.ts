import {
  Component,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ChoiceGroupComponent,
  ChoiceOption,
} from '../../../shared/choice-group.component';
import { Item, normalizeLink } from '../nomination.model';

export type { Item } from '../nomination.model';

let nextId = 0;

const notBlank = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : null;

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, ChoiceGroupComponent],
  templateUrl: './item-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./item-form.component.scss'],
})
export class ItemFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly canCancel = input(true);
  readonly added = output<Item>();
  readonly cancelled = output<void>();

  readonly uid = `gift-${nextId++}`;
  readonly submitted = signal(false);

  readonly categoryOptions: ChoiceOption<string>[] = [
    'Toy',
    'Clothing',
    'Book',
    'Electronics',
    'Other',
  ].map((value) => ({ label: value, value }));

  readonly form = this.fb.nonNullable.group({
    category: ['', [Validators.required]],
    description: ['', [Validators.required, notBlank]],
    color: [''],
    size: [''],
    link: [''],
    details: [''],
  });

  hasInput(): boolean {
    return Object.values(this.form.getRawValue()).some(
      (value) => value.trim() !== '',
    );
  }

  /**
   * Adds the gift if it is complete. A partially filled gift is never dropped:
   * it reports 'invalid' and shows what's missing so the caller can stay put.
   */
  commit(): 'empty' | 'added' | 'invalid' {
    if (!this.hasInput()) return 'empty';
    if (this.form.invalid) {
      this.submitted.set(true);
      return 'invalid';
    }

    const value = this.form.getRawValue();
    this.added.emit({
      category: value.category,
      description: value.description.trim(),
      color: value.color.trim() || undefined,
      size: value.size.trim() || undefined,
      link: normalizeLink(value.link),
      details: value.details.trim() || undefined,
    });
    this.form.reset();
    this.submitted.set(false);
    return 'added';
  }

  submit(): void {
    if (!this.hasInput()) {
      this.submitted.set(true);
      return;
    }
    this.commit();
  }

  cancel(): void {
    this.form.reset();
    this.submitted.set(false);
    this.cancelled.emit();
  }

  showError(name: 'category' | 'description'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }
}
