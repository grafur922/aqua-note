import { Component, viewChild } from '@angular/core';
import { NoteListComponent } from '../note-list/note-list.component';
import { NotesComponent } from '../notes/notes.component';

@Component({
  selector: 'app-notes-view',
  imports: [NoteListComponent, NotesComponent],
  templateUrl: './notes-view.component.html',
  styleUrl: './notes-view.component.less'
})
export class NotesViewComponent {
  private notesRef = viewChild(NotesComponent);

  confirmExitIfDirty(): Promise<boolean> | boolean {
    const notes = this.notesRef();
    if (!notes?.confirmExitIfDirty) {
      return true;
    }
    return notes.confirmExitIfDirty();
  }
}
