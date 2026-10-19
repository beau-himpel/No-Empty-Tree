import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Formats US phone numbers as (555) 123-4567 while typing or pasting. */
@Directive({
  selector: '[appPhoneMask]',
  standalone: true
})
export class PhoneMaskDirective implements OnInit {
  @Input() appPhoneMask: boolean = true;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private control: NgControl
  ) {}

  ngOnInit() {
    this.el.nativeElement.maxLength = 14;
    this.el.nativeElement.inputMode = 'tel';
  }

  // Formatting happens on input rather than filtering keydown: Android soft
  // keyboards report most keys as "Unidentified", so key filtering blocks typing.
  @HostListener('input')
  onInput() {
    if (!this.appPhoneMask) return;
    this.apply(this.el.nativeElement.value);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    if (!this.appPhoneMask) return;
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    this.apply(this.el.nativeElement.value + pasted);
  }

  private apply(raw: string) {
    const formatted = formatPhone(raw);
    this.el.nativeElement.value = formatted;
    // Emit so form value listeners (validation, draft autosave) see the change
    this.control.control?.setValue(formatted);
  }
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').substring(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
}
