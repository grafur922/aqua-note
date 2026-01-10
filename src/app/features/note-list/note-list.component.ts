import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note,Tag } from '../../shared/models/note.model';
import { Router } from '@angular/router';
import { contextMenu } from '../../shared/models/contextMenu.model';
import { ContextMenuComponent } from "../../shared/components/context-menu/context-menu.component";
import { TagDropdownComponent } from '../tag-dropdown/tag-dropdown.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PromptDialogComponent } from '../../shared/components/prompt-dialog/prompt-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-note-list',
  imports: [CommonModule, FormsModule, ContextMenuComponent, TagDropdownComponent],
  templateUrl: './note-list.component.html',
  styleUrl: './note-list.component.less',
  host: {
    '(document:click)': 'onDocumentClick()'
  }
})
export class NoteListComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  
  notes: Note[] = [];
  filteredNotes: Note[] = [];
  selectedNote: Note | null = null;
  isLoading: boolean = false;
  router=inject(Router);
  menuProps: contextMenu[] = [
    {
      title: '置顶',
      icon: 'icon-pin',
      operation: (context) => {
        const note = context as Note | null;
        if (!note) {
          return;
        }
        console.log('置顶', note);
      }
    },
    {
      title: '重命名',
      icon: 'icon-rename',
      operation: (context) => {
        const note = context as Note | null;
        if (!note) {
          return;
        }
        this.hideContextMenu();

        const currentTitle = (note.title || '').trim();
        this.dialog.open(PromptDialogComponent, {
          data: {
            title: '重命名',
            label: '标题',
            placeholder: '请输入新的标题',
            initialValue: currentTitle || '无标题',
            required: true,
            maxLength: 100,
            confirmText: '确定',
            cancelText: '取消'
          }
        })
        .afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe((value) => {
          if (value === null) {
            return;
          }

          const trimmed = value.trim();
          if (!trimmed) {
            this.snackBar.open('标题不能为空', '关闭', { duration: 2000 });
            return;
          }

          if (trimmed === currentTitle) {
            return;
          }

          const updated = { ...note, title: trimmed };
          this.noteService.updateNote(updated);

          const pending = this.noteService
            .getPendingSyncSnapshot()
            .find(x => x.note.noteId === note.noteId);
          const pendingVersion = pending?.version;

          this.snackBar.open('已重命名，正在同步...', '关闭', { duration: 1200 });
          this.noteService.syncNotes([updated])
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (!response?.success) {
                  this.snackBar.open('同步失败，已保存本地（稍后会自动重试）', '关闭', { duration: 2500 });
                  return;
                }

                const conflictIds = new Set(
                  (response.conflicts || [])
                    .map(c => c?.clientVersion?.noteId || c?.serverVersion?.noteId)
                    .filter((x): x is string => !!x)
                );

                if (conflictIds.has(note.noteId)) {
                  this.snackBar.open('已重命名，但同步发生冲突（请稍后处理）', '关闭', { duration: 2500 });
                  return;
                }

                if (typeof pendingVersion === 'number') {
                  this.noteService.clearDirtyNotesByVersion([{ noteId: note.noteId, version: pendingVersion }]);
                } else {
                  this.noteService.clearDirtyNotes([note.noteId]);
                }

                this.snackBar.open('已同步', '关闭', { duration: 1500 });
              },
              error: (error) => {
                console.error('同步失败:', error);
                this.snackBar.open('同步失败，已保存本地（稍后会自动重试）', '关闭', { duration: 2500 });
              }
            });
        });
      }
    },
    {
      title: '删除',
      icon: 'icon-delete',
      operation: (context) => {
        const note = context as Note | null;
        if (!note) {
          return;
        }
        this.hideContextMenu();
        const title = (note.title || '').trim() || '无标题';

        this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: '删除笔记',
            message: `确定要删除笔记"${title}"吗？`,
            confirmText: '删除',
            cancelText: '取消'
          }
        })
        .afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe((confirmed) => {
          if (!confirmed) {
            return;
          }

          this.noteService.deleteNote(note.noteId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (success) => {
                if (!success) {
                  this.snackBar.open('删除笔记失败', '关闭', { duration: 2000 });
                } else {
                  this.snackBar.open('已删除', '关闭', { duration: 1500 });
                }
                this.refreshNotes();
              },
              error: (error) => {
                console.error('删除笔记失败:', error);
                this.snackBar.open('删除笔记失败', '关闭', { duration: 2000 });
              }
            });
        });
      }
    },
    {
      title: '复制',
      icon: 'icon-copy',
      operation: (context) => {
        const note = context as Note | null;
        if (!note) {
          return;
        }
        console.log('复制', note);
      }
    }
  ];
  menuVisible = false;
  menuPosition = { x: 0, y: 0 };
  menuContext: Note | null = null;

  ngOnInit(): void {
    this.subscribeToSelectedTag();
    this.subscribeToNotes();
    this.subscribeToCurrentNote();
    this.loadTags();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTag():void{
    
  }

  refreshNotes(): void {
    console.log(this.filteredNotes);
    this.loadTags();
    this.loadNotes(this.noteService.getSelectedTagId());
  }
  
  tags: Tag[] = [];
  loadTags(): void {
    this.noteService.getTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tags) => {
          this.tags = tags;
        },
        error: (error) => {
          console.error('加载标签失败:', error);
        }
      });
  }
  
  loadNotes(tagId: string | null = null): void {
    this.isLoading = true;
    this.noteService.getNotes(tagId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.notes = notes.filter(note => !note.isDeleted);
          this.filterNotes();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('加载笔记失败:', error);
          this.isLoading = false;
        }
      });
  }


  private subscribeToSelectedTag(): void {
    this.noteService.selectedTagId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tagId => {
        this.loadNotes(tagId);
      });
  }


  private subscribeToNotes(): void {
    this.noteService.notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => {
        this.notes = notes.filter(note => !note.isDeleted);
        this.filterNotes();
      });
  }


  private subscribeToCurrentNote(): void {
    this.noteService.currentNote$
      .pipe(takeUntil(this.destroy$))
      .subscribe(note => {
        this.selectedNote = note;
      });
  }


  createNote(): void {
    const newNote = this.noteService.createNote();
    this.selectNote(newNote);
  }


  selectNote(note: Note): void {
    this.noteService.setCurrentNote(note);
  }

  deleteNote(note: Note, event: Event): void {
    event.stopPropagation(); // 防止触发选择事件

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '删除笔记',
        message: `确定要删除笔记"${note.title}"吗？`,
        confirmText: '删除',
        cancelText: '取消'
      }
    })
    .afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.noteService.deleteNote(note.noteId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              this.snackBar.open('已删除', '关闭', { duration: 1500 });
            } else {
              this.snackBar.open('删除笔记失败', '关闭', { duration: 2000 });
            }
          },
          error: (error) => {
            console.error('删除笔记失败:', error);
            this.snackBar.open('删除笔记失败', '关闭', { duration: 2000 });
          }
        });
    });
  }


  private filterNotes(): void {
    this.filteredNotes = [...this.notes];
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

  showNoteMenu(event: MouseEvent, note: Note): void {
    event.preventDefault();
    event.stopPropagation();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 220;
    const menuHeight = this.menuProps.length * 40;

    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > viewportWidth) {
      x = Math.max(0, viewportWidth - menuWidth - 12);
    }

    if (y + menuHeight > viewportHeight) {
      y = Math.max(0, viewportHeight - menuHeight - 12);
    }

    this.menuContext = note;
    this.menuPosition = { x, y };
    this.menuVisible = true;
  }

  onMenuItemSelected(): void {
    this.hideContextMenu();
  }

  hideContextMenu(): void {
    if (!this.menuVisible) {
      return;
    }
    this.menuVisible = false;
    this.menuContext = null;
  }

  onDocumentClick(): void {
    this.hideContextMenu();
  }

  isNoteSelected(note: Note): boolean {
    return this.selectedNote?.noteId === note.noteId;
  }

}
