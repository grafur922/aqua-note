import { Component, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContextMenuComponent } from '../../../shared/components/context-menu/context-menu.component';
import { contextMenu } from '../../../shared/models/contextMenu.model';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, ContextMenuComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.less',
  host: {
    '(document:click)': 'onDocumentClick()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  settingsMenuVisible = false;
  settingsMenuPosition = { x: 0, y: 0 };
  settingsMenuProps: contextMenu[] = [];

  navigateTo(route: string): void {
    this.router.navigate(['/home', route]);
  }

  isActive(route: string): boolean {
    return this.router.url.includes(`/home/${route}`);
  }

  openSettingsMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (this.settingsMenuVisible) {
      this.hideSettingsMenu();
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const userEmail = this.authService.getCurrentUser()?.email || '未登录';

    this.settingsMenuProps = [
      { title: userEmail, disabled: true },
      {
        title: '设置',
        icon: 'icon-settings',
        operation: () => {
          this.snackBar.open('设置功能开发中', '关闭', { duration: 2000 });
        }
      },
      {
        title: '登出',
        icon: 'icon-sign_out',
        operation: () => {
          this.authService.logout().subscribe(res=>{
            if(res){
              this.router.navigate(['/login']);
            }
          })
        }
      }
    ];

    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 180;
    const menuHeight = this.settingsMenuProps.length * 40;

    let x = rect.right + 8;
    let y = rect.top;

    if (x + menuWidth > viewportWidth) {
      x = Math.max(0, viewportWidth - menuWidth - 12);
    }

    if (y + menuHeight > viewportHeight) {
      y = Math.max(0, viewportHeight - menuHeight - 12);
    }

    this.settingsMenuPosition = { x, y };
    this.settingsMenuVisible = true;
    this.cdr.markForCheck();
  }

  onSettingsMenuItemSelected(): void {
    this.hideSettingsMenu();
  }

  hideSettingsMenu(): void {
    if (!this.settingsMenuVisible) {
      return;
    }
    this.settingsMenuVisible = false;
    this.cdr.markForCheck();
  }

  onDocumentClick(): void {
    this.hideSettingsMenu();
  }
}