import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

interface FamilyMember {
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  isChild: boolean;
  wishList: WishItem[];
}

interface WishItem {
  category: string;
  description: string;
  color?: string;
  size?: string;
}

interface FamilyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  members: FamilyMember[];
}

@Component({
  selector: 'app-nominate-family',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule, 
    ButtonModule, 
    InputTextModule, 
    InputTextarea, 
    DropdownModule
  ],
  templateUrl: './nominate-family.component.html',
  styleUrls: ['./nominate-family.component.scss']
})
export class NominateFamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Signals for reactive state management
  readonly familyInfo = signal<FamilyInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    members: []
  });

  readonly currentMember = signal<FamilyMember>({
    name: '',
    age: 0,
    gender: '',
    ethnicity: '',
    isChild: false,
    wishList: []
  });

  readonly newWish = signal<WishItem>({
    category: '',
    description: '',
    color: '',
    size: ''
  });

  readonly isAddingMember = signal(false);
  readonly editingMemberIndex = signal<number | null>(null);
  readonly showMemberDetails = signal(false);

  // Computed values
  readonly isFamilyValid = computed(() => {
    const family = this.familyInfo();
    const email = this.familyForm.get('email')?.value;
    return !!(
      family.name.trim() &&
      family.address.trim() &&
      email && 
      this.familyForm.get('email')?.valid &&
      family.members.length > 0
    );
  });

  readonly isMemberValid = computed(() => {
    const member = this.currentMember();
    return this.isMemberBasicInfoValid() && member.wishList.length > 0;
  });

  readonly isWishValid = computed(() => {
    const wish = this.newWish();
    return !!(wish.category && wish.description.trim());
  });

  readonly isMemberBasicInfoValid = computed(() => {
    const member = this.currentMember();
    return !!(
      member.name.trim() &&
      member.age > 0 &&
      member.gender &&
      member.isChild !== undefined
    );
  });

  // Form groups
  readonly familyForm = this.fb.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phone: [''],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
  });

  readonly memberForm = this.fb.group({
    name: ['', [Validators.required]],
    age: [0, [Validators.required, Validators.min(1)]],
    gender: ['', [Validators.required]],
    ethnicity: [''],
    isChild: [false, [Validators.required]]
  });

  readonly wishForm = this.fb.group({
    category: ['', [Validators.required]],
    description: ['', [Validators.required]],
    color: [''],
    size: ['']
  });

  // Dropdown options
  readonly genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
  ];

  readonly memberTypeOptions = [
    { label: 'Child', value: true },
    { label: 'Adult', value: false }
  ];

  readonly wishCategoryOptions = [
    { label: 'Toy', value: 'Toy' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Book', value: 'Book' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Other', value: 'Other' }
  ];

  addFamilyMember(): void {
    this.isAddingMember.set(true);
    this.editingMemberIndex.set(null);
    this.resetCurrentMember();
    this.showMemberDetails.set(false);
  }

  editMember(index: number): void {
    this.editingMemberIndex.set(index);
    this.isAddingMember.set(false);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.memberForm.patchValue(member);
    this.showMemberDetails.set(false);
  }

  removeMember(index: number): void {
    const family = this.familyInfo();
    family.members.splice(index, 1);
    this.familyInfo.set({ ...family });
  }

  flipCard(): void {
    this.showMemberDetails.update(show => !show);
  }

  cancelAddMember(): void {
    this.isAddingMember.set(false);
    this.editingMemberIndex.set(null);
    this.showMemberDetails.set(false);
    this.resetCurrentMember();
  }

  addWish(): void {
    if (this.wishForm.valid) {
      const wish = this.wishForm.value as WishItem;
      const member = this.currentMember();
      member.wishList.push(wish);
      this.currentMember.set({ ...member });
      this.resetNewWish();
    }
  }

  removeWish(index: number): void {
    const member = this.currentMember();
    member.wishList.splice(index, 1);
    this.currentMember.set({ ...member });
  }

  saveMember(): void {
    if (this.memberForm.valid && this.isMemberValid()) {
      const memberData = this.memberForm.value as FamilyMember;
      const member = { ...memberData, wishList: this.currentMember().wishList };
      
      const family = this.familyInfo();
      const editingIndex = this.editingMemberIndex();
      
      if (editingIndex !== null) {
        family.members[editingIndex] = member;
      } else {
        family.members.push(member);
      }
      
      this.familyInfo.set({ ...family });
      this.cancelAddMember();
    }
  }

  saveFamily(): void {
    if (this.familyForm.valid && this.isFamilyValid()) {
      const familyData = this.familyForm.value as Partial<FamilyInfo>;
      const family = { ...this.familyInfo(), ...familyData };
      
      // TODO: Save to backend
      console.log('Saving family:', family);
      this.router.navigate(['/adopt-family']);
    }
  }

  private resetCurrentMember(): void {
    this.currentMember.set({
      name: '',
      age: 0,
      gender: '',
      ethnicity: '',
      isChild: false,
      wishList: []
    });
    this.memberForm.reset();
  }

  private resetNewWish(): void {
    this.newWish.set({
      category: '',
      description: '',
      color: '',
      size: ''
    });
    this.wishForm.reset();
  }

  // Form getters for template
  get familyName() { return this.familyForm.get('name'); }
  get familyAddress() { return this.familyForm.get('address'); }
  get familyPhone() { return this.familyForm.get('phone'); }
  get familyEmail() { return this.familyForm.get('email'); }
  
  get memberName() { return this.memberForm.get('name'); }
  get memberAge() { return this.memberForm.get('age'); }
  get memberGender() { return this.memberForm.get('gender'); }
  get memberEthnicity() { return this.memberForm.get('ethnicity'); }
  get memberType() { return this.memberForm.get('isChild'); }
  
  get wishCategory() { return this.wishForm.get('category'); }
  get wishDescription() { return this.wishForm.get('description'); }
  get wishColor() { return this.wishForm.get('color'); }
  get wishSize() { return this.wishForm.get('size'); }

  // Helper method for email validation errors
  getEmailErrorMessage(): string {
    const emailControl = this.familyForm.get('email');
    if (!emailControl?.errors || !emailControl.touched) return '';
    
    if (emailControl.errors['required']) {
      return 'Email is required';
    } else if (emailControl.errors['email'] || emailControl.errors['pattern']) {
      return 'Please enter a valid email address';
    }
    return '';
  }
} 