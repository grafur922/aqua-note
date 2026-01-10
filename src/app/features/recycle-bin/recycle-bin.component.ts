import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../shared/models/note.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-recycle-bin',
  imports: [CommonModule],
  templateUrl: './recycle-bin.component.html',
  styleUrl: './recycle-bin.component.less'
})
export class RecycleBinComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

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
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '恢复笔记',
        message: `确定要恢复笔记"${title}"吗？`,
        confirmText: '恢复',
        cancelText: '取消'
      }
    })
    .afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      const restoredNote: Note = { ...note, isDeleted: false };
      this.noteService.syncNotes([restoredNote])
        .pipe(takeUntil(this.destroy$))
        .subscribe((response) => {
          if (response?.success) {
            this.noteService.updateNote(restoredNote);
            this.snackBar.open('已恢复', '关闭', { duration: 1500 });
          } else {
            this.snackBar.open(response?.message || '恢复笔记失败', '关闭', { duration: 2000 });
          }
        });
    });
  }

  permanentlyDeleteNote(note: Note, event: Event): void {
    event.stopPropagation();
    const title = note.title || '无标题';
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '永久删除',
        message: `确定要永久删除笔记"${title}"吗？此操作无法撤销。`,
        confirmText: '永久删除',
        cancelText: '取消'
      }
    })
    .afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.noteService.permanentDeleteNote(note.noteId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((success) => {
          if (success) {
            this.snackBar.open('已永久删除', '关闭', { duration: 1500 });
            this.refresh();
          } else {
            this.snackBar.open('永久删除失败', '关闭', { duration: 2000 });
          }
        });
    });
  }

  clearAll(): void {
    if (this.deletedNotes.length === 0 || this.isClearing) {
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '清空回收站',
        message: `确定要清空回收站吗？将永久删除 ${this.deletedNotes.length} 条笔记，且无法撤销。`,
        confirmText: '清空',
        cancelText: '取消'
      }
    })
    .afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe((confirmed) => {
      if (!confirmed) {
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
            this.snackBar.open('回收站已清空', '关闭', { duration: 1500 });
          } else {
            this.snackBar.open(`回收站清空部分失败（${successCount}/${notesToDelete.length}）`, '关闭', { duration: 2500 });
          }
        });
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
