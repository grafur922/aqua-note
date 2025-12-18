import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NoteService } from '../services/note.service';
@Component({
  selector: 'app-win-title-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './win-title-bar.component.html',
  styleUrl: './win-title-bar.component.less'
})
export class WinTitleBarComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private noteService = inject(NoteService);

  isAuthenticated = false;
  keyword = '';

  constructor() {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;

        if (!isAuthenticated) {
          this.keyword = '';
          this.noteService.setSearchKeyword('');
        }
      });

    this.noteService.searchKeyword$
      .pipe(takeUntil(this.destroy$))
      .subscribe(keyword => {
        if (this.keyword !== keyword) {
          this.keyword = keyword;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onKeywordChange(value: string): void {
    this.noteService.setSearchKeyword(value);
  }

  clearSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.keyword = '';
    this.noteService.setSearchKeyword('');
  }
}
