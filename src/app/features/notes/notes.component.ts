import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../shared/models/note.model';

@Component({
  selector: 'app-notes',
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.less'
})
export class NotesComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();
  private titleChange$ = new Subject<string>();
  private contentChange$ = new Subject<string>();
  
  currentNote: Note | null = null;
  isEditing: boolean = false;
  isSaving: boolean = false;
  lastSaved: Date | null = null;

  ngOnInit(): void {
    this.subscribeToCurrentNote();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
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
        }
      });
  }

  onTitleChange(title: string): void {
    if (this.currentNote) {
      this.currentNote.title = title;
      this.titleChange$.next(title);
    }
  }


  onContentChange(content: string): void {
    if (this.currentNote) {
      this.currentNote.content = content;
      this.contentChange$.next(content);
    }
  }


  saveNote(): void {
    if (!this.currentNote || this.isSaving) return;

    this.isSaving = true;

    this.noteService.updateNote(this.currentNote);
    

    setTimeout(() => {
      this.isSaving = false;
      this.lastSaved = new Date();
    }, 500);
  }


  manualSave(): void {
    this.saveNote();
  }


  syncNotes(): void {
    if (!this.currentNote) return;

    this.noteService.syncNotes([this.currentNote])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            console.log('同步成功');
            this.lastSaved = new Date();
          } else {
            console.error('同步失败:', response?.message);
          }
        },
        error: (error) => {
          console.error('同步失败:', error);
        }
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
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    });
  }
}
