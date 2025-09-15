import { Routes } from '@angular/router';
import { HomeComponent } from './core/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // 公共路由
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginRedirectGuard] // 已登录用户重定向到首页
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [LoginRedirectGuard] // 已登录用户重定向到首页
  },
  { 
    path: 'unauthorized', 
    component: UnauthorizedComponent 
  },

  // 受保护的路由 - 需要登录
  { 
    path: '', 
    component: HomeComponent,
    canActivate: [AuthGuard] // 需要登录才能访问
  },

  // 示例：受保护的路由组
  {
    path: 'dashboard',
    component: HomeComponent, // 临时使用 HomeComponent
    canActivate: [AuthGuard],
    children: [
      {
        path: 'profile',
        component: HomeComponent, // 临时使用 HomeComponent
        canActivate: [PermissionGuard],
        data: { permissions: ['profile_read'] }
      },
      {
        path: 'admin',
        component: HomeComponent, // 临时使用 HomeComponent
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      }
    ]
  },

  // 通配符路由 - 必须放在最后
  { path: '**', redirectTo: '/login' }
];
