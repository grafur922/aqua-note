import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginRedirectGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * 如果用户已登录，重定向到主页
   * 用于保护登录页面，防止已登录用户访问
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          const redirectUrl = localStorage.getItem('redirect_url');
          if (redirectUrl) {
            localStorage.removeItem('redirect_url');
            this.router.navigateByUrl(redirectUrl);
          } else {
            this.router.navigate(['/']);
          }
          return false;
        }
        return true;
      })
    );
  }
}
