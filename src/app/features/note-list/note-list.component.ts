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
  
  notes: Note[] = [];
  filteredNotes: Note[] = [];
  searchKeyword: string = '';
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
        console.log('重命名', note);
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
        console.log('删除', note);
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
    this.loadNotes();
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
    this.loadNotes();
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
