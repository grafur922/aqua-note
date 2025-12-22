import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ChangeDetectionStrategy, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged, finalize, interval, takeUntil } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../shared/models/note.model';
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css'; // Editor's Style
import '@toast-ui/editor/dist/i18n/zh-cn';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
@Component({
  selector: 'app-notes',
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)'
  }
})
export class NotesComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();
  private titleChange$ = new Subject<string>();
  private contentChange$ = new Subject<string>();
  private syncTrigger$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private lastRenderedNoteId: string | null = null;
  private isSettingEditorContent = false;
  // private editorHostEl: HTMLElement | null = null;
  private onKeydownCapture = (event: KeyboardEvent): void => {
    const key = event.key?.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      console.log('save');
      
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      this.saveAndSync();
    }
  };
  currentNote: Note | null = null;
  isEditing: boolean = false;
  isSaving: boolean = false;
  isSyncing: boolean = false;
  hasUnsavedChanges: boolean = false;
  lastSaved: Date | null = null;
  editorRef = viewChild<ElementRef>('editor');
  editor?: typeof Editor;

  constructor() {
    effect(() => {
      const el = this.editorRef()?.nativeElement;
      if (!el || this.editor) {
        return;
      }
      this.editorRef()?.nativeElement.setAttribute('spellcheck', 'false');
      const editor = new Editor({
        el,
        initialEditType: 'markdown',
        previewStyle: 'tab',
        height: 'calc(100% - 17px)',
        placeholder: '开始写下你的想法...',
        previewHighlight: true,
        language: 'zh-CN',
        events: {
          change: () => {
            if (this.isSettingEditorContent) {
              return;
            }
            const markdown = editor.getMarkdown();
            if (this.currentNote) {
              this.currentNote.content = markdown;
            }

            this.onContentChange(markdown);
          }
        },
        initialValue: this.currentNote?.content || ''
      });

      this.editor = editor;
      // this.editorHostEl = el;
      this.lastRenderedNoteId = this.currentNote?.noteId || null;

      // this.isSettingEditorContent = true;
      // this.editor.setMarkdown(this.currentNote?.content || '');
      // this.isSettingEditorContent = false;
    })
  } 

  ngOnInit(): void {
    document.addEventListener('keydown', this.onKeydownCapture, true);
    this.subscribeToCurrentNote();
    this.setupAutoSave();
    this.setupAutoSync();
    this.noteService.currentNote$
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (!res) {
          this.lastRenderedNoteId = null;
          if (this.editor) {
            try {
              (this.editor as any)?.destroy?.();
            } finally {
              this.editor = undefined;
            }
          }
          return;
        }

        if (!this.editor) {
          return;
        }

        const noteId = res?.noteId || null;
        if (noteId === this.lastRenderedNoteId) {
          return;
        }

        this.lastRenderedNoteId = noteId;
        this.isSettingEditorContent = true;
        this.editor.setMarkdown(res?.content || '');
        this.isSettingEditorContent = false;
      });
  }


  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeydownCapture, true);
    this.destroy$.next();
    this.destroy$.complete();
  }


  //订阅当前笔记变化
  private subscribeToCurrentNote(): void {
    this.noteService.currentNote$
      .pipe(takeUntil(this.destroy$))
      .subscribe(note => {
        this.currentNote = note;
        this.isEditing = !!note;
        this.cdr.markForCheck();
      });
  }

  private setupAutoSave(): void {
    this.titleChange$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(1000),
        distinctUntilChanged()
      )
      .subscribe(title => {
        if (this.currentNote) {
          this.saveNote();
          this.syncTrigger$.next();
        }
      });


    this.contentChange$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(2000),
        distinctUntilChanged()
      )
      .subscribe(content => {
        if (this.currentNote) {
          this.saveNote();
          this.syncTrigger$.next();
        }
      });
  }

  private setupAutoSync(): void {
    this.syncTrigger$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(1200)
      )
      .subscribe(() => {
        this.syncPendingNotes();
      });

    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.noteService.hasPendingSync()) {
          this.syncPendingNotes();
        }
      });
  }

  onTitleChange(title: string): void {
    if (this.currentNote) {
      this.currentNote.title = title;
      this.hasUnsavedChanges = true;
      this.titleChange$.next(title);
      this.cdr.markForCheck();
    }
  }


  onContentChange(content: string): void {
    if (this.currentNote) {
      this.currentNote.content = content;
      this.hasUnsavedChanges = true;
      this.contentChange$.next(content);
      this.cdr.markForCheck();
    }
  }


  saveNote(): void {
    if (!this.currentNote || this.isSaving) return;

    this.isSaving = true;

    this.noteService.updateNote(this.currentNote);

    this.hasUnsavedChanges = false;


    // setTimeout(() => {
    this.isSaving = false;
    this.lastSaved = new Date();
    this.cdr.markForCheck();
    // }, 500);
  }


  manualSave(): void {
    this.saveAndSync();
  }


  syncNotes(): void {
    this.syncPendingNotes();
  }

  saveAndSync(): void {
    console.log(this.currentNote);
    console.log(this.hasUnsavedChanges);
    
    if (!this.currentNote) {
      return;
    }
    if (this.hasUnsavedChanges) {
      this.saveNote();
    }
    this.syncPendingNotes();
  }

  async confirmExitIfDirty(): Promise<boolean> {
    const hasPending = this.noteService.hasPendingSync();
    if (!hasPending && !this.hasUnsavedChanges) {
      return true;
    }

    if (this.hasUnsavedChanges) {
      this.saveNote();
    }

    const shouldSync = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: '未同步的修改',
          message: '检测到未同步的修改，是否同步到云端？\n确定：同步到云端\n取消：仅保存本地，直接退出',
          confirmText: '同步',
          cancelText: '退出'
        }
      }).afterClosed()
    );
    if (!shouldSync) {
      return true;
    }

    const success = await this.syncPendingNotesOnce();
    if (success) {
      return true;
    }

    const exitAnyway = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: '同步失败',
          message: '同步失败，仍要退出吗？',
          confirmText: '退出',
          cancelText: '取消'
        }
      }).afterClosed()
    );

    return !!exitAnyway;
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    const key = event.key?.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      event.stopPropagation();
      this.saveAndSync();
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges || this.noteService.hasPendingSync()) {
      event.preventDefault();
      event.returnValue = ''; 
    }
  }

  private syncPendingNotes(): void {
    if (this.isSyncing) {
      return;
    }

    const snapshot = this.noteService.getPendingSyncSnapshot();
    if (!snapshot.length) {
      return;
    }

    this.isSyncing = true;
    const localChanges = snapshot.map(x => x.note);

    this.noteService.syncNotes(localChanges)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSyncing = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            const conflictIds = new Set(
              (response.conflicts || [])
                .map(c => c?.clientVersion?.noteId || c?.serverVersion?.noteId)
                .filter((x): x is string => !!x)
            );

            const entriesToClear = snapshot
              .filter(x => !conflictIds.has(x.note.noteId))
              .map(x => ({ noteId: x.note.noteId, version: x.version }));

            this.noteService.clearDirtyNotesByVersion(entriesToClear);
            this.lastSaved = new Date();
            console.log('同步成功');
          } else {
            console.error('同步失败:', response?.message);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('同步失败:', error);
        }
      });
  }

  private syncPendingNotesOnce(): Promise<boolean> {
    if (this.isSyncing) {
      return Promise.resolve(false);
    }

    const snapshot = this.noteService.getPendingSyncSnapshot();
    if (!snapshot.length) {
      return Promise.resolve(true);
    }

    this.isSyncing = true;
    const localChanges = snapshot.map(x => x.note);

    return new Promise(resolve => {
      this.noteService.syncNotes(localChanges)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isSyncing = false;
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: (response) => {
            if (!response?.success) {
              resolve(false);
              return;
            }

            const conflictIds = new Set(
              (response.conflicts || [])
                .map(c => c?.clientVersion?.noteId || c?.serverVersion?.noteId)
                .filter((x): x is string => !!x)
            );

            const entriesToClear = snapshot
              .filter(x => !conflictIds.has(x.note.noteId))
              .map(x => ({ noteId: x.note.noteId, version: x.version }));

            this.noteService.clearDirtyNotesByVersion(entriesToClear);
            this.lastSaved = new Date();
            this.cdr.markForCheck();

            resolve(conflictIds.size === 0);
          },
          error: () => {
            resolve(false);
          }
        });
    });
  }


  getLastSavedText(): string {
    if (!this.lastSaved) return '';

    const now = new Date();
    const diffInMs = now.getTime() - this.lastSaved.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);

    if (diffInSeconds < 60) {
      return '刚刚保存';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分钟前保存`;
    } else {
      return this.lastSaved.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' 保存';
    }
  }

  changeTitle() {
    console.log(this.currentNote?.content.split('\n')[0]);

  }

  insertFormat(format: string): void {
    const textarea = document.querySelector('.note-content') as HTMLTextAreaElement;
    if (!textarea || !this.currentNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let newText = '';

    switch (format) {
      case 'bold':
        newText = `**${selectedText || '粗体文本'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || '斜体文本'}*`;
        break;
      case 'code':
        newText = `\`${selectedText || '代码'}\``;
        break;
      case 'list':
        newText = `\n- ${selectedText || '列表项'}`;
        break;
      default:
        return;
    }

    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    this.currentNote.content = before + newText + after;
    this.onContentChange(this.currentNote.content);

    // 重新设置光标位置
    // setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + newText.length, start + newText.length);
    this.cdr.markForCheck();
    // });
  }
}
