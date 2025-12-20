import { Routes } from '@angular/router';
import { HomeComponent } from './core/components/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';
import { NotesViewComponent } from './features/notes-view/notes-view.component';
import { TodoListComponent } from './features/todo-list/todo-list.component';
import { RecycleBinComponent } from './features/recycle-bin/recycle-bin.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PermissionGuard } from './core/guards/permission.guard';
import { PendingChangesGuard } from './core/guards/pending-changes.guard';

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
    path: 'home', 
    component: HomeComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'notes', 
        component: NotesViewComponent,
        canDeactivate: [PendingChangesGuard]
      },
      { 
        path: 'todos', 
        component: TodoListComponent 
      },
      { 
        path: 'recycle', 
        component: RecycleBinComponent 
      },
      { 
        path: '', 
        redirectTo: 'notes', 
        pathMatch: 'full' 
      }
    ]
  },

  { 
    path: '', 
    redirectTo: '/home', 
    pathMatch: 'full' 
  },

  { path: '**', redirectTo: '/login' }
];
