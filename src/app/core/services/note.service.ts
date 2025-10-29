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
  

  private notesSubject = new BehaviorSubject<Note[]>([]);
  public notes$ = this.notesSubject.asObservable();
  
  // 当前选中的笔记
  private currentNoteSubject = new BehaviorSubject<Note | null>(null);
  public currentNote$ = this.currentNoteSubject.asObservable();
  
  // 同步版本号
  private lastSyncVersion = 0;

  constructor() { }

  private getHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    return new HttpHeaders({
      'User-Id': user?.id || '',
      'Content-Type': 'application/json'
    });
  }


  getNotes(): Observable<Note[]> {
    return this.http.get<ApiResponse<Note[]>>('/api/notes', { 
      headers: this.getHeaders() 
    }).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          // console.log(response.data);
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

  //同步笔记
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


  private mergeServerChanges(serverChanges: Note[]): void {
    const currentNotes = this.notesSubject.value;
    const updatedNotes = [...currentNotes];

    serverChanges.forEach(serverNote => {
      const existingIndex = updatedNotes.findIndex(note => note.noteId === serverNote.noteId);
      
      if (existingIndex >= 0) {
        // 更新现有笔记
        updatedNotes[existingIndex] = serverNote;
      } else {
        updatedNotes.push(serverNote);
      }
    });

    this.notesSubject.next(updatedNotes);
  }

  setCurrentNote(note: Note | null): void {
    this.currentNoteSubject.next(note);
  }

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


    const currentNotes = this.notesSubject.value;
    this.notesSubject.next([newNote, ...currentNotes]);
  
    this.setCurrentNote(newNote);

    return newNote;
  }


  updateNote(updatedNote: Note): void {
    const currentNotes = this.notesSubject.value;
    const noteIndex = currentNotes.findIndex(note => note.noteId === updatedNote.noteId);
    
    if (noteIndex >= 0) {
      updatedNote.updatedAt = new Date().toISOString();
      // updatedNote.syncVersion += 1;
      
      const updatedNotes = [...currentNotes];
      updatedNotes[noteIndex] = updatedNote;
      
      this.notesSubject.next(updatedNotes);
      
      // 如果是当前笔记，也更新当前笔记
      if (this.currentNoteSubject.value?.noteId === updatedNote.noteId) {
        this.currentNoteSubject.next(updatedNote);
      }
    }
  }


  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
