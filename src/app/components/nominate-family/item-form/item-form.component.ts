import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';

export interface Item {
  category: string;
  description: string;
  color?: string;
  size?: string;
}

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule
  ],
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss']
})
export class ItemFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  @Input() memberName: string = '';
  @Input() existingItems: Item[] = [];
  @Output() itemsSaved = new EventEmitter<Item[]>();
  @Output() itemsUpdated = new EventEmitter<Item[]>();

  readonly itemForms = signal<FormGroup[]>([]);
  readonly isAddingForm = signal(false);

  readonly itemCategoryOptions = [
    { label: 'Toy', value: 'Toy' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Book', value: 'Book' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Other', value: 'Other' }
  ];

  ngOnInit() {
    this.initializeItemForms();
  }

  initializeItemForms() {
    const forms = [this.createItemForm()];
    this.itemForms.set(forms);
  }

  createItemForm(): FormGroup {
    return this.fb.group({
      category: ['', [Validators.required]],
      description: ['', [Validators.required]],
      color: [''],
      size: ['']
    });
  }

  addAnotherItemForm() {
    const newForm = this.createItemForm();
    const currentForms = this.itemForms();
    this.itemForms.set([...currentForms, newForm]);
  }

  removeItemForm(index: number) {
    const currentForms = this.itemForms();
    if (currentForms.length > 1) {
      currentForms.splice(index, 1);
      this.itemForms.set([...currentForms]);
    }
  }

  saveAllItems() {
    const forms = this.itemForms();
    const validItems: Item[] = [];
    
    forms.forEach(form => {
      if (form.valid) {
        validItems.push(form.value as Item);
      }
    });

    if (validItems.length > 0) {
      const allItems = [...this.existingItems, ...validItems];
      this.itemsSaved.emit(allItems);
      
      // Reset forms
      this.itemForms.set([]);
      this.initializeItemForms();
    }
  }

  removeExistingItem(index: number) {
    const updatedItems = [...this.existingItems];
    updatedItems.splice(index, 1);
    this.itemsUpdated.emit(updatedItems);
  }

  isFormValid(form: FormGroup): boolean {
    return form.valid;
  }

  isAnyFormValid(): boolean {
    return this.itemForms().some(form => form.valid);
  }
}
