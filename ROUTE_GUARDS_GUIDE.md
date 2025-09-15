# Angular 路由守卫使用指南

## 概述

路由守卫是 Angular 中用于控制路由访问的机制。它们可以防止用户导航到某些路由，或在离开路由时进行确认。

## 已实现的守卫类型

### 1. AuthGuard (认证守卫)
**文件位置**: `src/app/core/guards/auth.guard.ts`

**用途**: 保护需要用户登录才能访问的路由

**使用方法**:
```typescript
{
  path: 'protected-route',
  component: SomeComponent,
  canActivate: [AuthGuard]
}
```

**功能**:
- 检查用户是否已登录
- 未登录用户重定向到登录页面
- 保存用户尝试访问的URL，登录后自动重定向

### 2. LoginRedirectGuard (登录重定向守卫)
**文件位置**: `src/app/core/guards/login-redirect.guard.ts`

**用途**: 防止已登录用户访问登录/注册页面

**使用方法**:
```typescript
{
  path: 'login',
  component: LoginComponent,
  canActivate: [LoginRedirectGuard]
}
```

**功能**:
- 检查用户是否已登录
- 已登录用户重定向到首页或之前尝试访问的页面

### 3. RoleGuard (角色守卫)
**文件位置**: `src/app/core/guards/role.guard.ts`

**用途**: 基于用户角色控制路由访问

**使用方法**:
```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [RoleGuard],
  data: { roles: ['admin', 'superuser'] }
}
```

**功能**:
- 检查用户是否有指定角色
- 无权限用户重定向到未授权页面

### 4. PermissionGuard (权限守卫)
**文件位置**: `src/app/core/guards/permission.guard.ts`

**用途**: 基于用户权限控制路由访问

**使用方法**:
```typescript
{
  path: 'settings',
  component: SettingsComponent,
  canActivate: [PermissionGuard],
  data: { permissions: ['settings_read', 'settings_write'] }
}
```

**功能**:
- 检查用户是否有所需权限
- 无权限用户重定向到未授权页面

## 认证服务 (AuthService)

**文件位置**: `src/app/core/services/auth.service.ts`

### 主要方法:

```typescript
// 用户登录
login(email: string, password: string): Observable<boolean>

// 用户登出
logout(): void

// 检查是否已认证
isAuthenticated(): boolean

// 获取当前用户
getCurrentUser(): User | null

// 检查用户权限
hasPermission(permission: string): boolean

// 检查用户角色
hasRole(role: string): boolean
```

### 使用示例:

```typescript
// 在组件中使用
constructor(private authService: AuthService) {}

// 检查登录状态
ngOnInit() {
  this.authService.isAuthenticated$.subscribe(isAuth => {
    console.log('用户登录状态:', isAuth);
  });
}

// 登录
login() {
  this.authService.login(email, password).subscribe(success => {
    if (success) {
      this.router.navigate(['/dashboard']);
    }
  });
}

// 登出
logout() {
  this.authService.logout();
  this.router.navigate(['/login']);
}
```

## 路由配置示例

```typescript
export const routes: Routes = [
  // 公共路由
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginRedirectGuard]
  },
  
  // 需要登录的路由
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  
  // 需要管理员角色的路由
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  
  // 需要特定权限的路由
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: ['settings_read'] }
  },
  
  // 保护子路由
  {
    path: 'protected',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: 'child1', component: Child1Component },
      { path: 'child2', component: Child2Component }
    ]
  }
];
```

## 其他守卫类型

### CanDeactivate (离开守卫)
用于在用户离开页面前进行确认：

```typescript
@Injectable()
export class CanDeactivateGuard implements CanDeactivate<ComponentWithUnsavedChanges> {
  canDeactivate(component: ComponentWithUnsavedChanges): boolean {
    return component.hasUnsavedChanges ? 
      confirm('您有未保存的更改，确定要离开吗？') : true;
  }
}
```

### Resolve (数据预加载)
在路由激活前预加载数据：

```typescript
@Injectable()
export class DataResolver implements Resolve<any> {
  constructor(private dataService: DataService) {}
  
  resolve(): Observable<any> {
    return this.dataService.getData();
  }
}

// 路由配置
{
  path: 'data',
  component: DataComponent,
  resolve: { data: DataResolver }
}
```

## 最佳实践

### 1. 守卫组合使用
```typescript
{
  path: 'secure-admin',
  component: SecureAdminComponent,
  canActivate: [AuthGuard, RoleGuard, PermissionGuard],
  data: { 
    roles: ['admin'], 
    permissions: ['admin_access'] 
  }
}
```

### 2. 错误处理
```typescript
// 在守卫中添加错误处理
private checkAuth(): Observable<boolean> {
  return this.authService.isAuthenticated$.pipe(
    take(1),
    map(isAuth => isAuth),
    catchError(error => {
      console.error('认证检查失败:', error);
      this.router.navigate(['/login']);
      return of(false);
    })
  );
}
```

### 3. 加载状态
```typescript
// 在组件中显示加载状态
export class ProtectedComponent implements OnInit {
  loading = true;
  
  ngOnInit() {
    // 守卫通过后，组件才会初始化
    this.loading = false;
  }
}
```

### 4. 动态权限检查
```typescript
// 在组件中动态检查权限
canEdit(): boolean {
  return this.authService.hasPermission('edit');
}

canDelete(): boolean {
  return this.authService.hasRole('admin');
}
```

## 调试技巧

### 1. 控制台日志
在守卫中添加日志来调试路由行为：

```typescript
canActivate(): Observable<boolean> {
  console.log('AuthGuard: 检查认证状态');
  return this.authService.isAuthenticated$.pipe(
    tap(isAuth => console.log('认证状态:', isAuth))
  );
}
```

### 2. 路由事件监听
```typescript
// 在 app.component.ts 中监听路由事件
constructor(private router: Router) {
  router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      console.log('导航完成:', event.url);
    }
  });
}
```

## 注意事项

1. **守卫执行顺序**: 多个守卫按数组顺序执行，任一守卫返回 false 都会阻止导航
2. **异步操作**: 守卫支持返回 Observable 或 Promise
3. **内存泄漏**: 使用 `take(1)` 或适当的 unsubscribe 防止内存泄漏
4. **用户体验**: 提供适当的加载状态和错误提示
5. **安全性**: 前端守卫只是 UX 层面的保护，后端 API 仍需要进行权限验证

这个守卫系统为您的 AquaNote 应用提供了完整的路由保护机制，确保只有授权用户才能访问相应的功能。
