import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  constructor() {
    // 检查本地存储中是否有用户信息
    this.checkStoredAuth();
  }

  /**
   * 检查本地存储的认证状态
   */
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

  /**
   * 用户登录
   */
  login(email: string, password: string): Observable<boolean> {
    return new Observable(observer => {

      setTimeout(() => {
        if (email && password) {
          const user: User = {
            id: '1',
            email: email,
            name: email.split('@')[0]
          };

          localStorage.setItem('auth_token', 'mock_token_' + Date.now());
          localStorage.setItem('current_user', JSON.stringify(user));
          
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          observer.next(true);
        } else {
          observer.next(false);
        }
        observer.complete();
      }, 1000);
    });
  }

  /**
   * 用户登出
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * 获取认证令牌
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * 检查用户是否有特定权限
   */
  hasPermission(permission: string): boolean {
    // 这里可以实现更复杂的权限逻辑
    const user = this.getCurrentUser();
    return user !== null;
  }

  /**
   * 检查用户角色
   */
  hasRole(role: string): boolean {
    // 这里可以实现角色检查逻辑
    const user = this.getCurrentUser();
    return user !== null;
  }
}
