import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Note, SyncRequest, SyncResponse, ApiResponse, Tag, ALL_TAG_ID, ALL_TAG_NAME, ConflictInfo } from '../../shared/models/note.model';
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


  private currentTagsSubject = new BehaviorSubject<Tag[]>([]);
  public tags$ = this.currentTagsSubject.asObservable();

  private selectedTagIdSubject = new BehaviorSubject<string | null>(null);
  public selectedTagId$ = this.selectedTagIdSubject.asObservable();

  private searchKeywordSubject = new BehaviorSubject<string>('');
  public searchKeyword$ = this.searchKeywordSubject.asObservable();

  private dirtyVersion = 0;
  private pendingSyncNotes = new Map<string, { note: Note; version: number }>();
  private pendingSyncCountSubject = new BehaviorSubject<number>(0);
  public pendingSyncCount$ = this.pendingSyncCountSubject.asObservable();

  constructor() { 
    this.tags$.subscribe(tags => {
      console.log(tags);
    });
  }

  markNoteDirty(note: Note): void {
    if (!note?.noteId) {
      return;
    }

    const version = ++this.dirtyVersion;
    this.pendingSyncNotes.set(note.noteId, { note: { ...note }, version });
    this.pendingSyncCountSubject.next(this.pendingSyncNotes.size);
  }

  getPendingSyncNotes(): Note[] {
    return Array.from(this.pendingSyncNotes.values()).map(x => x.note);
  }

  getPendingSyncSnapshot(): Array<{ note: Note; version: number }> {
    return Array.from(this.pendingSyncNotes.values()).map(x => ({ note: x.note, version: x.version }));
  }

  hasPendingSync(): boolean {
    return this.pendingSyncNotes.size > 0;
  }

  clearDirtyNotes(noteIds: string[]): void {
    if (!noteIds?.length) {
      return;
    }

    noteIds.forEach(id => {
      this.pendingSyncNotes.delete(id);
    });
    this.pendingSyncCountSubject.next(this.pendingSyncNotes.size);
  }

  clearDirtyNotesByVersion(entries: Array<{ noteId: string; version: number }>): void {
    if (!entries?.length) {
      return;
    }

    entries.forEach(({ noteId, version }) => {
      const current = this.pendingSyncNotes.get(noteId);
      if (!current) {
        return;
      }
      if (current.version === version) {
        this.pendingSyncNotes.delete(noteId);
      }
    });
    this.pendingSyncCountSubject.next(this.pendingSyncNotes.size);
  }

  clearAllDirtyNotes(): void {
    this.pendingSyncNotes.clear();
    this.pendingSyncCountSubject.next(0);
  }

  setSelectedTagId(tagId: string | null): void {
    this.selectedTagIdSubject.next(tagId);
  }

  getSelectedTagId(): string | null {
    return this.selectedTagIdSubject.value;
  }

  setSearchKeyword(keyword: string): void {
    this.searchKeywordSubject.next(keyword);
  }

  getSearchKeyword(): string {
    return this.searchKeywordSubject.value;
  }

  getNotes(tagId: string | null = null): Observable<Note[]> {
    return this.http.post<ApiResponse<Note[]>>('/api/notes', { tagId }).pipe(
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
    return this.http.get<ApiResponse<Note>>(`/api/notes/${noteId}`).pipe(
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
    return this.http.get<ApiResponse<Note[]>>(`/api/notes/search?keyword=${encodeURIComponent(keyword)}`).pipe(
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
    return this.http.delete<ApiResponse<any>>(`/api/notes/${noteId}`).pipe(
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

    return this.http.post<ApiResponse<SyncResponse>>('/api/notes/sync', syncRequest).pipe(
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

          this.updateLocalSyncVersionsAfterSync(localChanges, response.conflicts || []);
        }
      }),
      catchError(error => {
        console.error('同步笔记失败:', error);
        return of(null);
      })
    );
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<ApiResponse<Tag[]>>(`/api/notes/tags`).pipe(
      map(response => {
        const serverTags = response.code === 200 && response.data ? response.data : [];
        const tags = serverTags.filter(t => t.tagId !== ALL_TAG_ID);
        const tagsWithAll: Tag[] = [{ tagId: ALL_TAG_ID, tagName: ALL_TAG_NAME }, ...tags];

        this.currentTagsSubject.next(tagsWithAll);
        return tagsWithAll;
      }),
      catchError(error => {
        console.error('获取标签失败:', error);

        const fallback: Tag[] = [{ tagId: ALL_TAG_ID, tagName: ALL_TAG_NAME }];
        this.currentTagsSubject.next(fallback);
        return of(fallback);
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

      if (this.currentNoteSubject.value?.noteId === serverNote.noteId) {
        this.currentNoteSubject.next(serverNote);
      }
    });

    this.notesSubject.next(updatedNotes);
  }

  private updateLocalSyncVersionsAfterSync(localChanges: Note[], conflicts: ConflictInfo[]): void {
    if (!localChanges?.length) {
      return;
    }

    const conflictMap = new Map<string, ConflictInfo>();
    (conflicts || []).forEach(c => {
      const id = c?.clientVersion?.noteId || c?.serverVersion?.noteId;
      if (id) {
        conflictMap.set(id, c);
      }
    });

    localChanges.forEach(change => {
      const noteId = change?.noteId;
      if (!noteId) {
        return;
      }

      const conflict = conflictMap.get(noteId);
      const nextSyncVersion = conflict
        ? conflict.serverVersion?.syncVersion
        : (change.syncVersion || 0) + 1;

      if (typeof nextSyncVersion !== 'number') {
        return;
      }

      this.patchNoteSyncVersion(noteId, nextSyncVersion);
      this.patchPendingSyncNoteSyncVersion(noteId, nextSyncVersion);
    });
  }

  private patchNoteSyncVersion(noteId: string, syncVersion: number): void {
    const currentNotes = this.notesSubject.value;
    const idx = currentNotes.findIndex(n => n.noteId === noteId);
    if (idx >= 0) {
      const updated = { ...currentNotes[idx], syncVersion };
      const next = [...currentNotes];
      next[idx] = updated;
      this.notesSubject.next(next);

      if (this.currentNoteSubject.value?.noteId === noteId) {
        this.currentNoteSubject.next(updated);
      }
      return;
    }

    if (this.currentNoteSubject.value?.noteId === noteId) {
      this.currentNoteSubject.next({ ...this.currentNoteSubject.value, syncVersion });
    }
  }

  private patchPendingSyncNoteSyncVersion(noteId: string, syncVersion: number): void {
    const entry = this.pendingSyncNotes.get(noteId);
    if (!entry) {
      return;
    }

    this.pendingSyncNotes.set(noteId, {
      ...entry,
      note: { ...entry.note, syncVersion }
    });
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

    this.markNoteDirty(newNote);

    return newNote;
  }


  updateNote(updatedNote: Note): void {
    const currentNotes = this.notesSubject.value;
    const noteIndex = currentNotes.findIndex(note => note.noteId === updatedNote.noteId);
    
    if (noteIndex >= 0) {
      updatedNote.updatedAt = new Date().toISOString();
      // updatedNote.syncVersion += 1;

      this.markNoteDirty(updatedNote);
      
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
