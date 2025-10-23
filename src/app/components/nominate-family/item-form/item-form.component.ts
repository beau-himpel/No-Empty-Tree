import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { ItemInfoComponent } from '../../item-info/item-info.component';

export interface Item {
  category: string;
  description: string;
  color?: string;
  size?: string;
  details?: string;
  link?: string;
}

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ItemInfoComponent
  ],
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss']
})
export class ItemFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() memberName: string = '';
  @Input() existingItems: Item[] = [];
  @Output() itemsSaved = new EventEmitter<Item[]>();
  @Output() itemsUpdated = new EventEmitter<Item[]>();
  @Output() doneAddingItems = new EventEmitter<void>();
  @Output() editMemberDetails = new EventEmitter<void>();

  readonly itemForm = signal<FormGroup>(this.createItemForm());

  readonly itemCategoryOptions = [
    { label: 'Toy', value: 'Toy' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Book', value: 'Book' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Other', value: 'Other' }
  ];


  createItemForm(): FormGroup {
    return this.fb.group({
      category: ['', [Validators.required]],
      description: ['', [Validators.required]],
      color: [''],
      size: [''],
      details: [''],
      link: ['']
    });
  }

  addAnotherItem() {
    const form = this.itemForm();
    if (form.valid) {
      const newItem = form.value as Item;
      const allItems = [...this.existingItems, newItem];
      this.itemsSaved.emit(allItems);
      
      // Reset the form for the next item
      this.itemForm.set(this.createItemForm());
    }
  }

  onDoneAddingItems() {
    const form = this.itemForm();
    if (form.valid) {
      const newItem = form.value as Item;
      const allItems = [...this.existingItems, newItem];
      this.itemsSaved.emit(allItems);
    }
    
    // Emit the done event to return to member list
    this.doneAddingItems.emit();
  }

  removeExistingItem(index: number) {
    const updatedItems = [...this.existingItems];
    updatedItems.splice(index, 1);
    this.itemsUpdated.emit(updatedItems);
  }

  isFormValid(): boolean {
    return this.itemForm().valid;
  }

  onEditMemberDetails() {
    this.editMemberDetails.emit();
  }
}
