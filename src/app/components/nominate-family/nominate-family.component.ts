import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { SelectModule } from 'primeng/select';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ItemFormComponent, Item } from './item-form/item-form.component';
import { MemberDetailsComponent, FamilyMember } from './member-details/member-details.component';


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
    SelectModule,
    ItemFormComponent,
    MemberDetailsComponent
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
  readonly pendingMembers = signal<FamilyMember[]>([]);

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

  // Form groups
  readonly familyForm = this.fb.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phone: [''],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
  });



  constructor() {
    // No longer needed as member form is handled by MemberDetailsComponent
  }



  addFamilyMember(): void {
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
    
    const pending = this.pendingMembers();
    pending.push(newMember);
    this.pendingMembers.set([...pending]);
    
    // Set up for editing the new member
    this.isAddingMember.set(true);
    this.editingMemberIndex.set(null);
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
    
    // Update the family info or pending members
    if (this.editingMemberIndex() !== null) {
      const family = this.familyInfo();
      family.members[this.editingMemberIndex()!] = { ...member };
      this.familyInfo.set({ ...family });
    } else {
      const pending = this.pendingMembers();
      const memberIndex = pending.findIndex(p => p.id === this.currentMember().id);
      if (memberIndex >= 0) {
        pending[memberIndex] = { ...member };
        this.pendingMembers.set([...pending]);
      }
    }
  }

  cancelAddMember(): void {
    this.isAddingMember.set(false);
    this.editingMemberIndex.set(null);
    this.showMemberDetails.set(false);
    this.resetCurrentMember();
    
    // If there are pending members, switch to the next one
    const pending = this.pendingMembers();
    if (pending.length > 0) {
      const nextMember = pending[0];
      this.currentMember.set(nextMember);
      // Member form is now handled by MemberDetailsComponent
      this.isAddingMember.set(true);
    }
  }

  selectPendingMember(member: FamilyMember): void {
    this.currentMember.set(member);
    this.isAddingMember.set(true);
    this.editingMemberIndex.set(null);
    this.showMemberDetails.set(false);
  }

  removePendingMember(member: FamilyMember): void {
    const pending = this.pendingMembers();
    const index = pending.findIndex(p => p.id === member.id);
    if (index >= 0) {
      pending.splice(index, 1);
      this.pendingMembers.set([...pending]);
      
      // If this was the current member, switch to another pending member or reset
      if (this.currentMember().id === member.id) {
        if (pending.length > 0) {
          this.selectPendingMember(pending[0]);
        } else {
          this.cancelAddMember();
        }
      }
    }
  }

  onItemsSaved(items: Item[]): void {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family info or pending members
    if (this.editingMemberIndex() !== null) {
      const family = this.familyInfo();
      family.members[this.editingMemberIndex()!] = { ...member };
      this.familyInfo.set({ ...family });
    } else {
      const pending = this.pendingMembers();
      const memberIndex = pending.findIndex(p => p.id === this.currentMember().id);
      if (memberIndex >= 0) {
        pending[memberIndex] = { ...member };
        this.pendingMembers.set([...pending]);
      }
    }
  }

  onItemsUpdated(items: Item[]): void {
    const member = this.currentMember();
    member.items = items;
    this.currentMember.set({ ...member });
    
    // Update the family info or pending members
    if (this.editingMemberIndex() !== null) {
      const family = this.familyInfo();
      family.members[this.editingMemberIndex()!] = { ...member };
      this.familyInfo.set({ ...family });
    } else {
      const pending = this.pendingMembers();
      const memberIndex = pending.findIndex(p => p.id === this.currentMember().id);
      if (memberIndex >= 0) {
        pending[memberIndex] = { ...member };
        this.pendingMembers.set([...pending]);
      }
    }
  }

  onMemberUpdated(member: FamilyMember): void {
    this.currentMember.set(member);
    
    // Update the family info or pending members
    if (this.editingMemberIndex() !== null) {
      const family = this.familyInfo();
      family.members[this.editingMemberIndex()!] = { ...member };
      this.familyInfo.set({ ...family });
    } else {
      const pending = this.pendingMembers();
      const memberIndex = pending.findIndex(p => p.id === member.id);
      if (memberIndex >= 0) {
        pending[memberIndex] = { ...member };
        this.pendingMembers.set([...pending]);
      }
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
        // Editing existing member
        family.members[editingIndex] = { ...member };
        this.familyInfo.set({ ...family });
      } else {
        // Adding new member from pending list
        family.members.push({ ...member });
        this.familyInfo.set({ ...family });
        
        // Remove from pending list
        const pending = this.pendingMembers();
        const memberIndex = pending.findIndex(p => p.id === this.currentMember().id);
        if (memberIndex >= 0) {
          pending.splice(memberIndex, 1);
          this.pendingMembers.set([...pending]);
        }
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


  // Form getters for template
  get familyName() { return this.familyForm.get('name'); }
  get familyAddress() { return this.familyForm.get('address'); }
  get familyPhone() { return this.familyForm.get('phone'); }
  get familyEmail() { return this.familyForm.get('email'); }
  
  

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