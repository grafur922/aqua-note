import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * 基于权限的路由保护
   * 在路由配置中使用 data: { permissions: ['read', 'write'] }
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          localStorage.setItem('redirect_url', state.url);
          this.router.navigate(['/login']);
          return false;
        }

        // 检查路由数据中的权限要求
        const requiredPermissions = route.data['permissions'] as string[];
        if (!requiredPermissions || requiredPermissions.length === 0) {
          return true;
        }

        // 检查用户是否有所需权限
        const hasPermission = requiredPermissions.every(permission => 
          this.authService.hasPermission(permission)
        );

        if (!hasPermission) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      })
    );
  }
}
