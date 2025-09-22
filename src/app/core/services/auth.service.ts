import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, shareReplay } from 'rxjs';
import { LoginCredentials } from '../../features/login/models/login-credentials.model';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../interfaces/ApiResponse';
import { LoginInfo } from '../../features/login/models/login-info.model';
export interface User {
  id: string;
  email: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private http = inject(HttpClient)
  // public userdata$:Observable

  constructor() {
    // 检查本地存储中是否有用户信息
    this.checkStoredAuth();
  }


  private checkStoredAuth(): void {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
      }
    }
  }


  login(loginCredentials: LoginCredentials): Observable<boolean> {
    return this.http.post<ApiResponse<LoginInfo>>('/api/user/login', loginCredentials).pipe(
      map(res => {
        if (res.code === 200 && res.data) {
          const user: User = {
            id: res.data.userId,
            email: res.data.email,
            name: res.data.userName
          };
          localStorage.setItem('auth_token', 'mock_token_' + Date.now());
          localStorage.setItem('current_user', JSON.stringify(user));

          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          return true;
        } else {
          console.error('Login failed:', res.message);
          return false;
        }
      }),
      catchError(err => {
        console.error('Login request failed:', err);
        return of(false);
      })
    );
  }


  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }


  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }


  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }


  hasPermission(permission: string): boolean {

    const user = this.getCurrentUser();
    return user !== null;
  }


  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user !== null;
  }
}
