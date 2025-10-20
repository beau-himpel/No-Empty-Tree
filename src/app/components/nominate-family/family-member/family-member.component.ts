import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MemberDetailsComponent, FamilyMember } from '../member-details/member-details.component';
import { ItemFormComponent, Item } from '../item-form/item-form.component';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-family-member',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
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
  @Output() flipCard = new EventEmitter<void>();
  @Output() itemsSaved = new EventEmitter<Item[]>();
  @Output() itemsUpdated = new EventEmitter<Item[]>();

  onSelectMember() {
    this.memberSelected.emit(this.member);
  }

  onRemoveMember(event: Event) {
    event.stopPropagation();
    this.memberRemoved.emit(this.member);
  }

  onMemberUpdated(updatedMember: FamilyMember) {
    this.memberUpdated.emit(updatedMember);
  }

  onFlipCardFromDetails() {
    this.flipCard.emit();
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
