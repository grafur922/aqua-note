import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <mat-icon class="error-icon">block</mat-icon>
        <h1>访问被拒绝</h1>
        <p>您没有权限访问此页面</p>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="goHome()">
            返回首页
          </button>
          <button mat-stroked-button (click)="goBack()">
            返回上一页
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .unauthorized-content {
      text-align: center;
      background: white;
      padding: 60px 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      max-width: 400px;
    }

    .error-icon {
      font-size: 4rem;
      color: #f44336;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 2rem;
      color: #333;
      margin: 0 0 10px 0;
    }

    p {
      color: #666;
      margin: 0 0 30px 0;
      font-size: 1.1rem;
    }

    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    button {
      min-width: 120px;
    }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    window.history.back();
  }
}
