import { Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NoteService } from '../services/note.service';
import { Note } from '../../shared/models/note.model';
@Component({
  selector: 'app-win-title-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './win-title-bar.component.html',
  styleUrl: './win-title-bar.component.less',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown)': 'onDocumentKeydown($event)'
  }
})
export class WinTitleBarComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private noteService = inject(NoteService);
  private router = inject(Router);

  private keywordInput$ = new Subject<string>();
  private notesForSearch: Note[] = [];

  isAuthenticated = false;
  keyword = '';

  resultsVisible = false;
  isSearching = false;
  searchResults: Note[] = [];
  searchWrapperRef = viewChild<ElementRef>('searchWrapper');

  constructor() {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;

        if (!isAuthenticated) {
          this.clearState();
        }
      });

    this.noteService.notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => {
        this.notesForSearch = notes.filter(n => !n.isDeleted);
        this.updateResults(this.keyword);
      });

    this.keywordInput$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(keyword => {
        this.updateResults(keyword);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onKeywordChange(value: string): void {
    this.resultsVisible = !!value.trim();
    this.isSearching = this.resultsVisible;
    this.keywordInput$.next(value);
  }

  clearSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.clearState();
  }

  onKeywordFocus(): void {
    if (this.keyword.trim()) {
      this.resultsVisible = true;
    }
  }

  selectSearchResult(note: Note, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.router.url.startsWith('/home/notes')) {
      this.router.navigate(['/home/notes']);
    }

    this.noteService.setCurrentNote(note);
    this.resultsVisible = false;
    this.isSearching = false;
  }

  getResultPreview(content: string): string {
    const maxLength = 60;
    const plainText = (content || '').replace(/<[^>]*>/g, '');
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.resultsVisible) {
      return;
    }

    const wrapper = this.searchWrapperRef()?.nativeElement;
    const target = event.target as Node | null;
    if (wrapper && target && wrapper.contains(target)) {
      return;
    }

    this.resultsVisible = false;
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.resultsVisible = false;
      this.isSearching = false;
    }
  }

  private clearState(): void {
    this.keyword = '';
    this.searchResults = [];
    this.resultsVisible = false;
    this.isSearching = false;
    this.keywordInput$.next('');
  }

  private updateResults(rawKeyword: string): void {
    const keyword = rawKeyword.trim().toLowerCase();
    if (!keyword) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    const scored = this.notesForSearch
      .map((note, index) => {
        const title = (note.title || '').toLowerCase();
        const content = (note.content || '').replace(/<[^>]*>/g, '').toLowerCase();

        const titleHit = title.includes(keyword);
        const contentHit = content.includes(keyword);
        const rank = titleHit ? 0 : (contentHit ? 1 : 2);

        return { note, index, rank };
      })
      .filter(x => x.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .slice(0, 12);

    this.searchResults = scored.map(x => x.note);
    this.isSearching = false;
  }
}
