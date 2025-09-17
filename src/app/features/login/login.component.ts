import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule,FormGroup,FormControl,Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../core/services/auth.service';
import { LoginCredentials } from './models/login-credentials.model';
@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.less'
})
export class LoginComponent {
  hidePassword: boolean = true;
  rememberMe: boolean = false;
  private router=inject(Router)
  private authService=inject(AuthService)
  constructor(
  ) {}
  loginForm=new FormGroup({
    email:new FormControl('',[Validators.required,Validators.email]),
    password:new FormControl('',[Validators.required])
  })
  onSubmit() {
    
    if (this.loginForm.valid) {
      const credentials: LoginCredentials = this.loginForm.value as LoginCredentials;
      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login successful', response);
          this.router.navigate(['/']); // 登录成功后导航到主页
        },
        error: (error) => {
          console.error('Login failed', error);
          // 在这里处理错误，例如显示一个提示消息
        }
      });
    }
  }
}
