import { Component, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  navigateTo(route: string): void {
    this.router.navigate(['/home', route]);
  }

  isActive(route: string): boolean {
    return this.router.url.includes(`/home/${route}`);
  }
}