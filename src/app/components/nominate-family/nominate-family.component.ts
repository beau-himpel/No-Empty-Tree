import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { NominationSettingsService } from '../../nomination-settings.service';
import { FamilyMemberComponent } from './family-member/family-member.component';
import { Item } from './item-form/item-form.component';
import { FamilyMember } from './member-details/member-details.component';
import { BreakpointService } from '../../breakpoint.service';

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
    FormsModule,
    NgClass,
    CardModule, 
    ButtonModule, 
    InputTextModule, 
    TextareaModule,
    SelectModule,
    FamilyMemberComponent
  ],
  templateUrl: './nominate-family.component.html',
  styleUrls: ['./nominate-family.component.scss']
})
export class NominateFamilyComponent {
  private readonly fb = inject(FormBuilder);
  
  currentStep = signal<'familyInfo' | 'familyMembers'>('familyInfo');
  selectedMemberIndex = signal<number | null>(null);
  showMemberList = signal(true);
  private readonly router = inject(Router);
  private readonly breakpointService = inject(BreakpointService);
  private readonly nominationSettingsService = inject(NominationSettingsService);

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
  readonly isMobile = this.breakpointService.isMobile;

  readonly nominationsEnabled = this.nominationSettingsService.nominationsEnabled;
  readonly loading = this.nominationSettingsService.loading;
  readonly error = this.nominationSettingsService.error;

  readonly isMemberValid = computed(() => {
    const member = this.currentMember();
    return this.isMemberBasicInfoValid() && member.items.length > 0;
  });

  isFamilyValid = computed(() => {
    return this.familyForm.valid && this.familyInfo().members.length > 0;
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

  readonly memberDropdownOptions = computed(() => {
    return this.familyInfo().members.map((member, index) => ({
      label: member.name || `New Member ${index + 1}`,
      value: index
    }));
  });

  readonly familyForm = this.fb.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phone: [''],
    email: [''],
    // email: ['', [Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
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
    this.selectedMemberIndex.set(family.members.length - 1);
    this.currentMember.set(newMember);
    this.showMemberList.set(false);
  }

  editMember(index: number) {
    this.selectedMemberIndex.set(index);
    this.isAddingMember.set(false);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberList.set(false);
  }

  removeMember(index: number) {
    const family = this.familyInfo();
    family.members.splice(index, 1);
    this.familyInfo.set({ ...family });
    
    // If we removed the currently selected member, go back to list view
    if (this.selectedMemberIndex() === index) {
      this.showMemberList.set(true);
      this.selectedMemberIndex.set(null);
    } else if (this.selectedMemberIndex() !== null && this.selectedMemberIndex()! > index) {
      // Adjust selected index if we removed a member before the current one
      this.selectedMemberIndex.set(this.selectedMemberIndex()! - 1);
    }
  }

  selectMemberFromDropdown(index: number) {
    this.selectedMemberIndex.set(index);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberList.set(false);
  }

  finishEditingMember() {
    this.showMemberList.set(true);
    this.selectedMemberIndex.set(null);
    this.isAddingMember.set(false);
  }


  cancelAddMember() {
    this.isAddingMember.set(false);
    this.selectedMemberIndex.set(null);
    this.showMemberList.set(true);
    this.resetCurrentMember();
  }

  addFamilyMembers() {
    this.currentStep.set('familyMembers');
  }

  showFamilyInfo() {
    this.currentStep.set('familyInfo');
  }

  onItemsSaved(items: Item[]) {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family member
    const selectedIndex = this.selectedMemberIndex();
    if (selectedIndex !== null) {
      const family = this.familyInfo();
      family.members[selectedIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onItemsUpdated(items: Item[]) {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family member
    const selectedIndex = this.selectedMemberIndex();
    if (selectedIndex !== null) {
      const family = this.familyInfo();
      family.members[selectedIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onMemberUpdated(member: FamilyMember) {
    this.currentMember.set(member);
    
    // Update the family member
    const selectedIndex = this.selectedMemberIndex();
    if (selectedIndex !== null) {
      const family = this.familyInfo();
      family.members[selectedIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }


  saveFamily() {
    if (this.familyForm.valid && this.familyForm.value) {
      const familyData = this.familyForm.value as Partial<FamilyInfo>;
      const family = { ...this.familyInfo(), ...familyData };
      
      // TODO: Save to backend
      console.log('Saving family:', family);
    }
  }

  private generateMemberId(): string {
    return 'member_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private resetCurrentMember() {
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
  
} 