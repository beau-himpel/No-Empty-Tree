import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { Item } from './item-form/item-form.component';
import { FamilyMember } from './member-details/member-details.component';
import { FamilyMemberComponent } from './family-member/family-member.component';
import { AccordionModule } from 'primeng/accordion';

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
    TextareaModule,
    SelectModule,
    FamilyMemberComponent,
    AccordionModule
  ],
  templateUrl: './nominate-family.component.html',
  styleUrls: ['./nominate-family.component.scss']
})
export class NominateFamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly familyInfo = signal<FamilyInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    members: []
  });

  readonly currentMember = signal<FamilyMember>({
    id: '',
    name: '',
    age: 0,
    gender: '',
    ethnicity: '',
    isChild: false,
    items: [],
    showItemsView: false
  });

  readonly isAddingMember = signal(false);
  readonly editingMemberIndex = signal<number | null>(null);
  readonly showMemberDetails = signal(false);

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
    return this.isMemberBasicInfoValid() && member.items.length > 0;
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

  readonly familyForm = this.fb.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phone: [''],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
  });

  get familyName() { return this.familyForm.get('name'); }
  get familyAddress() { return this.familyForm.get('address'); }
  get familyPhone() { return this.familyForm.get('phone'); }
  get familyEmail() { return this.familyForm.get('email'); }

  addFamilyMember() {
    const newMember: FamilyMember = {
      id: this.generateMemberId(),
      name: '',
      age: 0,
      gender: '',
      ethnicity: '',
      isChild: false,
      items: [],
      showItemsView: false
    };
    
    // Add directly to family members
    const family = this.familyInfo();
    family.members.push(newMember);
    this.familyInfo.set({ ...family });
    
    // Set up for editing the new member
    this.isAddingMember.set(true);
    this.editingMemberIndex.set(family.members.length - 1);
    this.currentMember.set(newMember);
    this.showMemberDetails.set(false);
  }

  editMember(index: number): void {
    this.editingMemberIndex.set(index);
    this.isAddingMember.set(false);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberDetails.set(false);
  }

  removeMember(index: number): void {
    const family = this.familyInfo();
    family.members.splice(index, 1);
    this.familyInfo.set({ ...family });
  }

  flipCard(): void {
    const member = this.currentMember();
    member.showItemsView = !member.showItemsView;
    this.currentMember.set({ ...member });
    
    // Update the family member
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  cancelAddMember(): void {
    this.isAddingMember.set(false);
    this.editingMemberIndex.set(null);
    this.showMemberDetails.set(false);
    this.resetCurrentMember();
  }


  onItemsSaved(items: Item[]): void {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family member
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onItemsUpdated(items: Item[]): void {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family member
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onMemberUpdated(member: FamilyMember): void {
    this.currentMember.set(member);
    
    // Update the family member
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onFlipCardFromDetails(): void {
    this.flipCard();
  }

  onSaveMemberFromDetails(): void {
    this.saveMember();
  }

  onCancelMemberFromDetails(): void {
    this.cancelAddMember();
  }

  saveMember(): void {
    const member = this.currentMember();
    
    if (this.isMemberValid()) {
      const family = this.familyInfo();
      const editingIndex = this.editingMemberIndex();
      
      if (editingIndex !== null) {
        // Update existing member
        family.members[editingIndex] = { ...member };
        this.familyInfo.set({ ...family });
      }
      
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

  private generateMemberId(): string {
    return 'member_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private resetCurrentMember(): void {
    this.currentMember.set({
      id: '',
      name: '',
      age: 0,
      gender: '',
      ethnicity: '',
      isChild: false,
      items: [],
      showItemsView: false
    });
  }
  
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