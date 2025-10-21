import { Component, computed, inject, signal, ViewChild, ElementRef, QueryList } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
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
    NgClass,
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
  
  currentStep = signal<'familyInfo' | 'familyMembers' | 'wishItems'>('familyInfo');
  openAccordionIndex = signal<number | null>(null);
  
  @ViewChild('familyMembersContainer', { static: false }) familyMembersContainer!: ElementRef;
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
  readonly editingMemberIndex = signal<number | null>(null);
  readonly showMemberDetails = signal(false);
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
    this.editingMemberIndex.set(family.members.length - 1);
    this.currentMember.set(newMember);
    this.showMemberDetails.set(false);
    
    // Open the accordion for the newly added member
    this.openAccordionIndex.set(family.members.length - 1);
    if (this.isMobile()) {
      this.scrollMemberToView(family.members.length - 1);
    }
  }

  scrollMemberToView(index: number) {
    console.log('scrollMemberToView', index);
    setTimeout(() => {
      if (this.familyMembersContainer) {
        const accordionPanels = this.familyMembersContainer.nativeElement.querySelectorAll('p-accordion-panel');
        console.log(accordionPanels);
        console.log(index);
        if (accordionPanels[index]) {
          accordionPanels[index].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }
    }, 100);
  }

  editMember(index: number) {
    this.editingMemberIndex.set(index);
    this.isAddingMember.set(false);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberDetails.set(false);
  }

  removeMember(index: number) {
    const family = this.familyInfo();
    family.members.splice(index, 1);
    this.familyInfo.set({ ...family });
  }

  flipCard() {
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

  cancelAddMember() {
    this.isAddingMember.set(false);
    this.editingMemberIndex.set(null);
    this.showMemberDetails.set(false);
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
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onItemsUpdated(items: Item[]) {
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

  onMemberUpdated(member: FamilyMember) {
    this.currentMember.set(member);
    
    // Update the family member
    const editingIndex = this.editingMemberIndex();
    if (editingIndex !== null) {
      const family = this.familyInfo();
      family.members[editingIndex] = { ...member };
      this.familyInfo.set({ ...family });
    }
  }

  onFlipCardFromDetails() {
    this.flipCard();
  }

  onSaveMemberFromDetails() {
    this.saveMember();
  }

  onCancelMemberFromDetails() {
    this.cancelAddMember();
  }

  saveMember() {
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