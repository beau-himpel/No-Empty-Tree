import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MemberDetailsComponent, FamilyMember } from '../member-details/member-details.component';
import { ItemFormComponent, Item } from '../item-form/item-form.component';
import { AccordionModule } from 'primeng/accordion';
import { BreakpointService } from '../../../breakpoint.service';

@Component({
  selector: 'app-family-member',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    MemberDetailsComponent,
    ItemFormComponent,
    AccordionModule
  ],
  templateUrl: './family-member.component.html',
  styleUrls: ['./family-member.component.scss']
})
export class FamilyMemberComponent {
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
  @Input() isCurrentMember: boolean = false;
  @Input() isAddingMember: boolean = false;
  @Input() editingMemberIndex: number | null = null;
  @Input() memberIndex: number = 0;

  @Output() memberSelected = new EventEmitter<FamilyMember>();
  @Output() memberRemoved = new EventEmitter<FamilyMember>();
  @Output() memberUpdated = new EventEmitter<FamilyMember>();
  @Output() itemsSaved = new EventEmitter<Item[]>();
  @Output() itemsUpdated = new EventEmitter<Item[]>();

  showDeleteDialog = signal(false);
  showConfirmationModal = signal(false);
  showMemberDetails = signal(true);
  
  private readonly breakpointService = inject(BreakpointService);
  readonly isMobile = this.breakpointService.isMobile;

  onSelectMember() {
    this.memberSelected.emit(this.member);
  }

  deleteMember() {
    this.showConfirmationModal.set(true);
  }

  confirmDeleteMember() {
    this.memberRemoved.emit(this.member);
    this.showConfirmationModal.set(false);
  }

  cancelDeleteMember() {
    this.showConfirmationModal.set(false);
  }

  onMemberUpdated(updatedMember: FamilyMember) {
    this.memberUpdated.emit(updatedMember);
  }

  addWishListItems() {
    this.showMemberDetails.set(false);
  }

  onItemsSaved(items: Item[]) {
    this.itemsSaved.emit(items);
  }

  onItemsUpdated(items: Item[]) {
    this.itemsUpdated.emit(items);
  }

  onSaveMemberFromDetails() {
    // This will be handled by the parent component
    // The parent should listen to memberUpdated events
  }

  onCancelMemberFromDetails() {
    // This will be handled by the parent component
    // The parent should handle the cancel logic
  }
}
