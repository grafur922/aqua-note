import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { RegisterCredentials } from './models/register-credentials.model';

@Component({
  selector: 'app-register',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.less'
})
export class RegisterComponent {

  hidePassword: boolean = true;

  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  registerForm = new FormGroup({
    userName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(20)])
  });

  onSubmit(): void {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const credentials = this.registerForm.value as RegisterCredentials;
    this.authService.register(credentials).subscribe({
      next: (res) => {
        if (res.ok) {
          this.snackBar.open('注册成功，请登录', '关闭', { duration: 3000 });
          this.router.navigate(['/login']);
          return;
        }

        const msg = res.message ?? '注册失败';
        if (msg.includes('邮箱')) {
          this.registerForm.get('email')?.setErrors({ emailExists: true });
        }
        this.snackBar.open(msg, '关闭', { duration: 3000 });
      }
    });
  }
}
