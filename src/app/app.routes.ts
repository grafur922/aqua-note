import { Routes } from '@angular/router';
import { HomeComponent } from './core/components/home/home.component';
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

  { path: '**', redirectTo: '/login' }
];
