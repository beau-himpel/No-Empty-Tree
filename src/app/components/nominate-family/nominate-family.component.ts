import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../auth.service';
import { BreakpointService } from '../../breakpoint.service';
import { NominationSettingsService } from '../../nomination-settings.service';
import { PhoneMaskDirective } from '../../shared/phone-mask.directive';
import { SupabaseService } from '../../supabase.service';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { Item, ItemFormComponent } from './item-form/item-form.component';
import { FamilyMember, MemberDetailsComponent } from './member-details/member-details.component';

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
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    MemberDetailsComponent,
    ItemFormComponent,
    ConfirmDeleteModalComponent,
    PhoneMaskDirective,
  ],
  templateUrl: './nominate-family.component.html',
  styleUrls: ['./nominate-family.component.scss'],
})
export class NominateFamilyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly FAMILY_INFO_STORAGE_KEY = 'nominateFamilyInfo';

  currentStep = signal<'familyInfo' | 'familyMembers'>('familyInfo');
  selectedMemberIndex = signal<number | null>(null);
  showMemberList = signal(true);
  showMemberDetails = signal(true);
  showDeleteModal = signal(false);
  memberToDelete = signal<number | null>(null);
  showValidationModal = signal(false);
  validationMemberIndex = signal<number | null>(null);

  // New state signals for saving
  isSaving = signal(false);
  saveError = signal<string | null>(null);

  private readonly router = inject(Router);
  private readonly breakpointService = inject(BreakpointService);
  private readonly nominationSettingsService = inject(
    NominationSettingsService
  );
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly familyInfo = signal<FamilyInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    members: [],
  });

  readonly currentMember = signal<FamilyMember>({
    id: '',
    name: '',
    age: 0,
    gender: '',
    ethnicity: '',
    isChild: false,
    items: [],
  });

  readonly isAddingMember = signal(false);
  readonly isMobile = this.breakpointService.isMobile;

  readonly nominationsEnabled =
    this.nominationSettingsService.nominationsEnabled;
  readonly loading = this.nominationSettingsService.loading;
  readonly error = this.nominationSettingsService.error;

  readonly isMemberValid = computed(() => {
    const member = this.currentMember();
    return this.isMemberBasicInfoValid() && member.items.length > 0;
  });

  isFamilyValid = computed(() => {
    return (
      this.familyForm.valid &&
      this.familyInfo().members.length > 0 &&
      this.familyInfo().members.every(
        (member) =>
          member.items.length > 0 &&
          member.name.trim() &&
          member.gender &&
          member.isChild !== undefined
      )
    );
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
      value: index,
    }));
  });

  readonly familyForm = this.fb.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phone: [''],
    email: [''],
    // email: ['', [Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
  });

  get familyName() {
    return this.familyForm.get('name');
  }
  get familyAddress() {
    return this.familyForm.get('address');
  }
  get familyPhone() {
    return this.familyForm.get('phone');
  }
  get familyEmail() {
    return this.familyForm.get('email');
  }

  ngOnInit() {
    this.loadCachedFamilyInfo();
    this.setupFormAutoSave();
  }

  private loadCachedFamilyInfo() {
    try {
      const cachedData = localStorage.getItem(this.FAMILY_INFO_STORAGE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Load family info signal
        if (parsedData.familyInfo) {
          this.familyInfo.set(parsedData.familyInfo);
        }

        // Load form values
        if (parsedData.formValues) {
          this.familyForm.patchValue(parsedData.formValues);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached family info:', error);
      // Clear corrupted data
      localStorage.removeItem(this.FAMILY_INFO_STORAGE_KEY);
    }
  }

  private setupFormAutoSave() {
    this.familyForm.valueChanges.subscribe(() => {
      this.saveFamilyInfoToLocalStorage();
    });
  }

  private saveFamilyInfoToLocalStorage() {
    try {
      const dataToSave = {
        familyInfo: this.familyInfo(),
        formValues: this.familyForm.value,
      };
      localStorage.setItem(
        this.FAMILY_INFO_STORAGE_KEY,
        JSON.stringify(dataToSave)
      );
    } catch (error) {
      console.warn('Failed to save family info to local storage:', error);
    }
  }

  addFamilyMember() {
    const newMember: FamilyMember = {
      id: this.generateMemberId(),
      name: '',
      age: 0,
      gender: '',
      ethnicity: '',
      isChild: false,
      items: [],
    };

    // Add directly to family members
    const family = this.familyInfo();
    family.members.push(newMember);
    this.familyInfo.set({ ...family });
    this.saveFamilyInfoToLocalStorage();

    // Set up for editing the new member
    this.isAddingMember.set(true);
    this.selectedMemberIndex.set(family.members.length - 1);
    this.currentMember.set(newMember);
    this.showMemberList.set(false);
    this.showMemberDetails.set(true);
  }

  editMember(index: number) {
    this.selectedMemberIndex.set(index);
    this.isAddingMember.set(false);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberList.set(false);
    this.showMemberDetails.set(true);
  }

  removeMember(index: number) {
    const family = this.familyInfo();
    family.members.splice(index, 1);
    this.familyInfo.set({ ...family });
    this.saveFamilyInfoToLocalStorage();

    // If we removed the currently selected member, go back to list view
    if (this.selectedMemberIndex() === index) {
      this.showMemberList.set(true);
      this.selectedMemberIndex.set(null);
    } else if (
      this.selectedMemberIndex() !== null &&
      this.selectedMemberIndex()! > index
    ) {
      // Adjust selected index if we removed a member before the current one
      this.selectedMemberIndex.set(this.selectedMemberIndex()! - 1);
    }
  }

  selectMemberFromDropdown(index: number) {
    this.selectedMemberIndex.set(index);
    const member = this.familyInfo().members[index];
    this.currentMember.set({ ...member });
    this.showMemberList.set(false);
    this.showMemberDetails.set(true);
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
    this.saveFamilyInfoToLocalStorage();
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
      this.saveFamilyInfoToLocalStorage();
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
      this.saveFamilyInfoToLocalStorage();
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
      this.saveFamilyInfoToLocalStorage();
    }
  }

  async saveFamily() {
    if (!this.familyForm.valid || !this.familyForm.value) {
      return;
    }

    // Check if user is authenticated
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.saveError.set('You must be logged in to save a family');
      this.messageService.add({
        severity: 'error',
        summary: 'Authentication Required',
        detail: 'You must be logged in to save a family',
      });
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const familyData = this.familyForm.value as Partial<FamilyInfo>;
      const family = { ...this.familyInfo(), ...familyData };

      // Create the family record first
      const familyRecord = await this.supabaseService.createFamily({
        last_name: family.name,
        address: family.address,
        phone: family.phone || undefined,
        email: family.email || undefined,
        nominated_by: currentUser.id,
      });

      // Only proceed with members and items if family creation succeeded
      try {
        // Add family members
        for (const member of family.members) {
          const memberRecord = await this.supabaseService.addFamilyMember({
            family_id: familyRecord.id,
            first_name: member.name,
            age: member.age,
            sex: this.mapGenderToSex(member.gender),
            is_parent: !member.isChild,
          });

          // Add wishlist items for this member
          for (const item of member.items) {
            await this.supabaseService.addWishlistItem({
              family_member_id: memberRecord.id,
              category: item.category,
              description: item.description,
              color: item.color || undefined,
              size: item.size || undefined,
              link: item.link || undefined,
              details: item.details || undefined,
            });
          }
        }

        localStorage.removeItem(this.FAMILY_INFO_STORAGE_KEY);

        this.messageService.add({
          severity: 'success',
          summary: 'Family Saved',
          detail: 'Family nomination has been saved successfully',
        });

        this.router.navigate(['/my-adoptions']);
      } catch (memberError) {
        try {
          await this.supabaseService.deleteFamily(familyRecord.id);
        } catch (deleteError) {
        }

        this.saveError.set('Failed to save family members. Please try again.');
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: 'Failed to save family members. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error creating family:', error);
      this.saveError.set('Failed to save family. Please try again.');
      this.messageService.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Failed to save family. Please try again.',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  private generateMemberId(): string {
    return (
      'member_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  private mapGenderToSex(gender: string): 'male' | 'female' {
    switch (gender.toLowerCase()) {
      case 'male':
        return 'male';
      case 'female':
        return 'female';
      default:
        // Default to male if somehow an invalid value gets through
        return 'male';
    }
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
    });
  }

  deleteMemberFromList(index: number) {
    this.memberToDelete.set(index);
    this.showDeleteModal.set(true);
  }

  confirmDeleteFromList() {
    const index = this.memberToDelete();
    if (index !== null) {
      this.removeMember(index);
    }
    this.showDeleteModal.set(false);
    this.memberToDelete.set(null);
  }

  cancelDeleteFromList() {
    this.showDeleteModal.set(false);
    this.memberToDelete.set(null);
  }

  getMemberValidationErrors(member: FamilyMember): string[] {
    const errors: string[] = [];

    if (!member.name || member.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!member.gender || member.gender.trim() === '') {
      errors.push('Gender is required');
    }

    if (member.isChild === undefined || member.isChild === null) {
      errors.push('Member type (Child/Adult) is required');
    }

    if (!member.items || member.items.length === 0) {
      errors.push('At least 1 wish list item is required');
    }

    return errors;
  }

  showValidationErrors(memberIndex: number) {
    this.validationMemberIndex.set(memberIndex);
    this.showValidationModal.set(true);
  }

  closeValidationModal() {
    this.showValidationModal.set(false);
    this.validationMemberIndex.set(null);
  }

  getCurrentValidationErrors(): string[] {
    const memberIndex = this.validationMemberIndex();
    if (
      memberIndex !== null &&
      memberIndex >= 0 &&
      memberIndex < this.familyInfo().members.length
    ) {
      return this.getMemberValidationErrors(
        this.familyInfo().members[memberIndex]
      );
    }
    return [];
  }

  getCurrentValidationMemberName(): string {
    const memberIndex = this.validationMemberIndex();
    if (
      memberIndex !== null &&
      memberIndex >= 0 &&
      memberIndex < this.familyInfo().members.length
    ) {
      const member = this.familyInfo().members[memberIndex];
      return member.name || `New Member ${memberIndex + 1}`;
    }
    return '';
  }

  showMemberDetailsView() {
    this.showMemberDetails.set(true);
  }

  showWishlistItemsView() {
    this.showMemberDetails.set(false);
  }
}
