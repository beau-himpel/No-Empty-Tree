import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  isChild: boolean;
  items: any[];
  showItemsView?: boolean;
}

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule
  ],
  templateUrl: './member-details.component.html',
  styleUrls: ['./member-details.component.scss']
})
export class MemberDetailsComponent {
  private readonly fb = inject(FormBuilder);

  @Input() member: FamilyMember = {
    id: '',
    name: '',
    age: 0,
    gender: '',
    ethnicity: '',
    isChild: false,
    items: [],
    showItemsView: false
  };
  @Output() memberUpdated = new EventEmitter<FamilyMember>();

  readonly memberForm = this.fb.group({
    name: ['', [Validators.required]],
    age: [0, [Validators.required, Validators.min(1)]],
    gender: ['', [Validators.required]],
    ethnicity: [''],
    isChild: [false, [Validators.required]]
  });

  readonly genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
  ];

  readonly memberTypeOptions = [
    { label: 'Child', value: true },
    { label: 'Adult', value: false }
  ];

  readonly isMemberBasicInfoValid = computed(() => {
    const member = this.member;
    return !!(
      member.name.trim() &&
      member.age > 0 &&
      member.gender &&
      member.isChild !== undefined
    );
  });

  ngOnInit() {
    this.memberForm.patchValue(this.member);
    
    // Subscribe to form changes
    this.memberForm.valueChanges.subscribe(formValue => {
      const updatedMember = {
        ...this.member,
        id: this.member.id, // Preserve the ID
        name: formValue.name || '',
        age: formValue.age || 0,
        gender: formValue.gender || '',
        ethnicity: formValue.ethnicity || '',
        isChild: formValue.isChild || false
      };
      this.memberUpdated.emit(updatedMember);
    });
  }

  // Form getters for template
  get memberName() { return this.memberForm.get('name'); }
  get memberAge() { return this.memberForm.get('age'); }
  get memberGender() { return this.memberForm.get('gender'); }
  get memberEthnicity() { return this.memberForm.get('ethnicity'); }
  get memberType() { return this.memberForm.get('isChild'); }
}
