import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MemberDetailsComponent, FamilyMember } from '../member-details/member-details.component';
import { ItemFormComponent, Item } from '../item-form/item-form.component';
import { ConfirmDeleteModalComponent } from '../../confirm-delete-modal/confirm-delete-modal.component';
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
    ConfirmDeleteModalComponent
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
  @Input() isAddingMember: boolean = false;

  @Output() memberRemoved = new EventEmitter<FamilyMember>();
  @Output() memberUpdated = new EventEmitter<FamilyMember>();
  @Output() itemsSaved = new EventEmitter<Item[]>();
  @Output() itemsUpdated = new EventEmitter<Item[]>();
  @Output() doneEditing = new EventEmitter<void>();

  showDeleteModal = signal(false);
  showMemberDetails = signal(true);
  
  private readonly breakpointService = inject(BreakpointService);
  readonly isMobile = this.breakpointService.isMobile;

  readonly isMemberBasicInfoValid = computed(() => {
    const member = this.member;
    return !!(
      member.name.trim() &&
      member.age > 0 &&
      member.gender &&
      member.isChild !== undefined
    );
  });

  deleteMember() {
    this.showDeleteModal.set(true);
  }

  onDeleteConfirmed() {
    this.memberRemoved.emit(this.member);
    this.showDeleteModal.set(false);
  }

  onDeleteCancelled() {
    this.showDeleteModal.set(false);
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

  onDoneAddingItems() {
    this.doneEditing.emit();
  }

  onEditMemberDetails() {
    this.showMemberDetails.set(true);
  }

}
