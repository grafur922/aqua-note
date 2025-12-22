import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type PromptDialogData = {
  title?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  maxLength?: number;
};

@Component({
  selector: 'app-prompt-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './prompt-dialog.component.html',
  styleUrl: './prompt-dialog.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromptDialogComponent {
  data = inject<PromptDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PromptDialogComponent, string | null>);

  valueControl = new FormControl<string>(this.data.initialValue ?? '', {
    nonNullable: true,
    validators: [
      ...(this.data.required ? [Validators.required] : []),
      ...(this.data.maxLength ? [Validators.maxLength(this.data.maxLength)] : [])
    ]
  });

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (this.valueControl.invalid) {
      this.valueControl.markAsTouched();
      return;
    }
    this.dialogRef.close(this.valueControl.value);
  }
}
