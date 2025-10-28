import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appPhoneMask]',
  standalone: true
})
export class PhoneMaskDirective implements OnInit {
  @Input() appPhoneMask: boolean = true;

  constructor(
    private el: ElementRef,
    private control: NgControl
  ) {}

  ngOnInit() {
    // Set maxlength to accommodate the formatted phone number
    this.el.nativeElement.maxLength = 14;
  }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    if (!this.appPhoneMask) return;

    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Remove all non-digits

    // Limit to 10 digits
    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    // Format the phone number
    let formattedValue = '';
    if (value.length > 0) {
      if (value.length <= 3) {
        formattedValue = `(${value}`;
      } else if (value.length <= 6) {
        formattedValue = `(${value.substring(0, 3)}) ${value.substring(3)}`;
      } else {
        formattedValue = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
      }
    }

    // Update the input value
    input.value = formattedValue;

    // Update the form control value
    if (this.control.control) {
      this.control.control.setValue(formattedValue, { emitEvent: false });
    }

    // Prevent the default input event to avoid double processing
    event.preventDefault();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Allow navigation keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return;
    }

    // Only allow numeric keys
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    
    const pastedData = event.clipboardData?.getData('text') || '';
    const numericData = pastedData.replace(/\D/g, '');
    
    if (numericData.length > 0) {
      // Simulate typing the pasted digits
      const input = this.el.nativeElement;
      const currentValue = input.value.replace(/\D/g, '');
      const newValue = (currentValue + numericData).substring(0, 10);
      
      // Format and set the value
      let formattedValue = '';
      if (newValue.length > 0) {
        if (newValue.length <= 3) {
          formattedValue = `(${newValue}`;
        } else if (newValue.length <= 6) {
          formattedValue = `(${newValue.substring(0, 3)}) ${newValue.substring(3)}`;
        } else {
          formattedValue = `(${newValue.substring(0, 3)}) ${newValue.substring(3, 6)}-${newValue.substring(6)}`;
        }
      }
      
      input.value = formattedValue;
      
      if (this.control.control) {
        this.control.control.setValue(formattedValue, { emitEvent: false });
      }
    }
  }
}
