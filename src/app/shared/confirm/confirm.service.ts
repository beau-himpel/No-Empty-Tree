import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BreakpointService } from '../../breakpoint.service';
import {
  ConfirmOptions,
  ConfirmSheetComponent,
  ConfirmSheetData,
} from './confirm-sheet.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointService = inject(BreakpointService);

  /** Resolves true only when the user explicitly confirms. */
  async open(options: ConfirmOptions): Promise<boolean> {
    const asSheet = this.breakpointService.isMobile();
    const position = this.overlay.position().global().centerHorizontally();

    const dialogRef = this.dialog.open<boolean, ConfirmSheetData>(
      ConfirmSheetComponent,
      {
        data: { ...options, asSheet },
        positionStrategy: asSheet
          ? position.bottom('0')
          : position.centerVertically(),
        hasBackdrop: true,
        backdropClass: 'sheet-backdrop',
        panelClass: 'sheet-panel',
        // Backdrop clicks and Escape are handled by the sheet so it can animate out
        disableClose: true,
        autoFocus: 'dialog',
        restoreFocus: true,
        ariaLabelledBy: 'confirm-sheet-title',
      }
    );

    const result = await firstValueFrom(dialogRef.closed);
    return result === true;
  }
}
