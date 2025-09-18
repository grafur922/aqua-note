export interface Note {
    noteId: string;
    title: string;
    content: string;
    isDeleted: boolean;
    isArchived: boolean;
    syncVersion: number;
    createdAt?: string;
    updatedAt?: string;
    userId?: string;
}

export interface SyncRequest {
    lastSyncVersion: number | null;
    localChanges: Note[];
}

export interface SyncResponse {
    currentSyncVersion: number;
    serverChanges: Note[];
    conflicts: ConflictInfo[];
    success: boolean;
    message: string;
}

export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface ConflictInfo {
    serverVersion: Note;
    clientVersion: Note;
    conflictReason: string;
}