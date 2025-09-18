import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../shared/models/note.model';

@Component({
  selector: 'app-note-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './note-list.component.html',
  styleUrl: './note-list.component.less'
})
export class NoteListComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();
  
  notes: Note[] = [];
  filteredNotes: Note[] = [];
  searchKeyword: string = '';
  selectedNote: Note | null = null;
  isLoading: boolean = false;

  ngOnInit(): void {
    this.loadNotes();
    this.subscribeToNotes();
    this.subscribeToCurrentNote();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadNotes(): void {
    this.isLoading = true;
    this.noteService.getNotes()
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
    
    if (confirm(`确定要删除笔记"${note.title}"吗？`)) {
      this.noteService.deleteNote(note.noteId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              console.log('笔记删除成功');
            } else {
              alert('删除笔记失败');
            }
          },
          error: (error) => {
            console.error('删除笔记失败:', error);
            alert('删除笔记失败');
          }
        });
    }
  }


  onSearch(): void {
    this.filterNotes();
  }


  private filterNotes(): void {
    if (!this.searchKeyword.trim()) {
      this.filteredNotes = [...this.notes];
    } else {
      const keyword = this.searchKeyword.toLowerCase();
      this.filteredNotes = this.notes.filter(note => 
        note.title.toLowerCase().includes(keyword) || 
        note.content.toLowerCase().includes(keyword)
      );
    }
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
    const plainText = content.replace(/<[^>]*>/g, ''); // 移除HTML标签
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  }


  isNoteSelected(note: Note): boolean {
    return this.selectedNote?.noteId === note.noteId;
  }

//待优化
  trackByNoteId(index: number, note: Note): string {
    return note.noteId;
  }
}
