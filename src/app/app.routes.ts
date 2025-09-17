import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginRedirectGuard]
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [LoginRedirectGuard]
  },
  { 
    path: 'unauthorized', 
    component: UnauthorizedComponent 
  },

  { 
    path: '', 
    component: HomeComponent,
    canActivate: [AuthGuard] 
  },

  {
    path: 'dashboard',
    component: HomeComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'profile',
        component: HomeComponent,
        canActivate: [PermissionGuard],
        data: { permissions: ['profile_read'] }
      },
      {
        path: 'admin',
        component: HomeComponent, 
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      }
    ]
  },

  { path: '**', redirectTo: '/login' }
];
