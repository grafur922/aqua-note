import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../shared/models/note.model';

@Component({
  selector: 'app-recycle-bin',
  imports: [CommonModule],
  templateUrl: './recycle-bin.component.html',
  styleUrl: './recycle-bin.component.less'
})
export class RecycleBinComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();

  deletedNotes: Note[] = [];
  isLoading: boolean = false;
  isClearing: boolean = false;

  ngOnInit(): void {
    this.subscribeToNotes();
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadNotes();
  }

  loadNotes(): void {
    this.isLoading = true;
    this.noteService.getNotes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.updateDeletedNotes(notes);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('加载回收站失败:', error);
          this.isLoading = false;
        }
      });
  }

  restoreNote(note: Note, event: Event): void {
    event.stopPropagation();
    const title = note.title || '无标题';
    if (!confirm(`确定要恢复笔记"${title}"吗？`)) {
      return;
    }

    const restoredNote: Note = { ...note, isDeleted: false };
    this.noteService.syncNotes([restoredNote])
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response?.success) {
          this.noteService.updateNote(restoredNote);
          console.log('笔记恢复成功');
        } else {
          alert(response?.message || '恢复笔记失败');
        }
      });
  }

  permanentlyDeleteNote(note: Note, event: Event): void {
    event.stopPropagation();
    const title = note.title || '无标题';
    if (!confirm(`确定要永久删除笔记"${title}"吗？此操作无法撤销。`)) {
      return;
    }

    this.noteService.deleteNote(note.noteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((success) => {
        if (success) {
          console.log('笔记永久删除成功');
        } else {
          alert('永久删除失败');
        }
      });
  }

  clearAll(): void {
    if (this.deletedNotes.length === 0 || this.isClearing) {
      return;
    }

    if (!confirm(`确定要清空回收站吗？将永久删除 ${this.deletedNotes.length} 条笔记，且无法撤销。`)) {
      return;
    }

    this.isClearing = true;
    const notesToDelete = [...this.deletedNotes];

    forkJoin(notesToDelete.map(note => this.noteService.deleteNote(note.noteId)))
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        const successCount = results.filter(Boolean).length;
        this.isClearing = false;

        if (successCount === notesToDelete.length) {
          console.log('回收站清空成功');
        } else {
          alert(`回收站清空部分失败（${successCount}/${notesToDelete.length}）`);
        }
      });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return '今天';
    } else if (diffInDays === 1) {
      return '昨天';
    } else if (diffInDays < 7) {
      return `${diffInDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  getPreviewContent(content: string): string {
    const maxLength = 100;
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  private subscribeToNotes(): void {
    this.noteService.notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notes) => {
        this.updateDeletedNotes(notes);
      });
  }

  private updateDeletedNotes(notes: Note[]): void {
    this.deletedNotes = notes
      .filter(note => note.isDeleted)
      .sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
  }
}
