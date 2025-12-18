import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, shareReplay } from 'rxjs';
import { LoginCredentials } from '../../features/login/models/login-credentials.model';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../interfaces/ApiResponse';
export interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginUserDto {
  userId: string;
  userName: string;
  email: string;
  createAt: string;
}

interface LoginResponseDto {
  user: LoginUserDto;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
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
    const refreshToken = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logoutLocal();
      }
    }
  }


  login(loginCredentials: LoginCredentials): Observable<boolean> {
    return this.http.post<ApiResponse<LoginResponseDto>>('/api/user/login', loginCredentials).pipe(
      map(res => {
        if (res.code === 200 && res.data && res.data.user) {
          const user: User = {
            id: res.data.user.userId,
            email: res.data.user.email,
            name: res.data.user.userName
          };
          localStorage.setItem('auth_token', res.data.accessToken);
          localStorage.setItem('refresh_token', res.data.refreshToken);
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


  refresh(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(false);
    }

    return this.http.post<ApiResponse<TokenResponseDto>>('/api/user/refresh', { refreshToken }).pipe(
      map(res => {
        if (res.code === 200 && res.data) {
          localStorage.setItem('auth_token', res.data.accessToken);
          localStorage.setItem('refresh_token', res.data.refreshToken);
          this.isAuthenticatedSubject.next(true);
          return true;
        }
        return false;
      }),
      catchError(() => of(false)),
      shareReplay(1)
    );
  }


  logout(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logoutLocal();
      return of(true);
    }

    return this.http.post<ApiResponse<unknown>>('/api/user/logout', { refreshToken }).pipe(
      map((res) => {
        this.logoutLocal();
        return res.code === 200;
      }),
      catchError(() => {
        this.logoutLocal();
        return of(false);
      })
    );
  }


  logoutLocal(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
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

  getAccessToken(): string | null {
    return localStorage.getItem('auth_token');
  }


  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
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
