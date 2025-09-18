import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Note, SyncRequest, SyncResponse, ApiResponse } from '../../shared/models/note.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  // 本地笔记缓存
  private notesSubject = new BehaviorSubject<Note[]>([]);
  public notes$ = this.notesSubject.asObservable();
  
  // 当前选中的笔记
  private currentNoteSubject = new BehaviorSubject<Note | null>(null);
  public currentNote$ = this.currentNoteSubject.asObservable();
  
  // 同步版本号
  private lastSyncVersion = 0;

  constructor() { }

  /**
   * 获取HTTP请求头，包含用户ID
   */
  private getHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    return new HttpHeaders({
      'User-Id': user?.id || '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * 获取用户所有笔记
   */
  getNotes(): Observable<Note[]> {
    return this.http.get<ApiResponse<Note[]>>('/api/notes', { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          this.notesSubject.next(response.data);
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('获取笔记失败:', error);
        return of([]);
      })
    );
  }

  /**
   * 获取单个笔记
   */
  getNote(noteId: string): Observable<Note | null> {
    return this.http.get<ApiResponse<Note>>(`/api/notes/${noteId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          this.currentNoteSubject.next(response.data);
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('获取笔记失败:', error);
        return of(null);
      })
    );
  }

  /**
   * 搜索笔记
   */
  searchNotes(keyword: string): Observable<Note[]> {
    return this.http.get<ApiResponse<Note[]>>(`/api/notes/search?keyword=${encodeURIComponent(keyword)}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('搜索笔记失败:', error);
        return of([]);
      })
    );
  }

  /**
   * 删除笔记（软删除）
   */
  deleteNote(noteId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`/api/notes/${noteId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response.code === 200) {
          // 从本地缓存中移除
          const currentNotes = this.notesSubject.value;
          const updatedNotes = currentNotes.filter(note => note.noteId !== noteId);
          this.notesSubject.next(updatedNotes);
          
          // 如果删除的是当前笔记，清空当前笔记
          if (this.currentNoteSubject.value?.noteId === noteId) {
            this.currentNoteSubject.next(null);
          }
          
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('删除笔记失败:', error);
        return of(false);
      })
    );
  }

  /**
   * 同步笔记
   */
  syncNotes(localChanges: Note[] = []): Observable<SyncResponse | null> {
    const syncRequest: SyncRequest = {
      lastSyncVersion: this.lastSyncVersion,
      localChanges: localChanges
    };

    return this.http.post<ApiResponse<SyncResponse>>('/api/notes/sync', syncRequest, {
      headers: this.getHeaders()
    }).pipe(
      map(apiResponse => {
        if (apiResponse.code === 200 && apiResponse.data) {
          return apiResponse.data;
        }
        throw new Error(apiResponse.message || '同步失败');
      }),
      tap(response => {
        if (response.success) {
          // 更新同步版本号
          this.lastSyncVersion = response.currentSyncVersion;
          
          // 合并服务器变更到本地
          if (response.serverChanges.length > 0) {
            this.mergeServerChanges(response.serverChanges);
          }
        }
      }),
      catchError(error => {
        console.error('同步笔记失败:', error);
        return of(null);
      })
    );
  }

  /**
   * 合并服务器变更到本地
   */
  private mergeServerChanges(serverChanges: Note[]): void {
    const currentNotes = this.notesSubject.value;
    const updatedNotes = [...currentNotes];

    serverChanges.forEach(serverNote => {
      const existingIndex = updatedNotes.findIndex(note => note.noteId === serverNote.noteId);
      
      if (existingIndex >= 0) {
        // 更新现有笔记
        updatedNotes[existingIndex] = serverNote;
      } else {
        // 添加新笔记
        updatedNotes.push(serverNote);
      }
    });

    this.notesSubject.next(updatedNotes);
  }

  /**
   * 设置当前笔记
   */
  setCurrentNote(note: Note | null): void {
    this.currentNoteSubject.next(note);
  }

  /**
   * 创建新笔记
   */
  createNote(title: string = '新笔记', content: string = ''): Note {
    const newNote: Note = {
      noteId: this.generateUUID(),
      title,
      content,
      isDeleted: false,
      isArchived: false,
      syncVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: this.authService.getCurrentUser()?.id
    };

    // 添加到本地缓存
    const currentNotes = this.notesSubject.value;
    this.notesSubject.next([newNote, ...currentNotes]);
    
    // 设置为当前笔记
    this.setCurrentNote(newNote);

    return newNote;
  }

  /**
   * 更新笔记
   */
  updateNote(updatedNote: Note): void {
    const currentNotes = this.notesSubject.value;
    const noteIndex = currentNotes.findIndex(note => note.noteId === updatedNote.noteId);
    
    if (noteIndex >= 0) {
      updatedNote.updatedAt = new Date().toISOString();
      updatedNote.syncVersion += 1;
      
      const updatedNotes = [...currentNotes];
      updatedNotes[noteIndex] = updatedNote;
      
      this.notesSubject.next(updatedNotes);
      
      // 如果是当前笔记，也更新当前笔记
      if (this.currentNoteSubject.value?.noteId === updatedNote.noteId) {
        this.currentNoteSubject.next(updatedNote);
      }
    }
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
