import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.less'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  hidePassword: boolean = true;
  rememberMe: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin() {
    if (!this.email || !this.password) {
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (success) => {
        if (success) {
          // 检查是否有重定向URL
          const redirectUrl = localStorage.getItem('redirect_url');
          if (redirectUrl) {
            localStorage.removeItem('redirect_url');
            this.router.navigateByUrl(redirectUrl);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          console.error('Login failed');
        }
      },
      error: (error) => {
        console.error('Login error:', error);
      }
    });
  }
}
