import { AfterViewInit, Component, viewChild } from '@angular/core';
import { NoteListComponent } from '../note-list/note-list.component';
import { NotesComponent } from '../notes/notes.component';
import Split from 'split.js'
@Component({
  selector: 'app-notes-view',
  imports: [NoteListComponent, NotesComponent],
  templateUrl: './notes-view.component.html',
  styleUrl: './notes-view.component.less'
})
export class NotesViewComponent implements AfterViewInit{
  private notesRef = viewChild(NotesComponent);
  constructor(){
    
  }
  ngAfterViewInit(): void {
    Split(['#note-list-panel','#note-editor-panel'])
  }
  confirmExitIfDirty(): Promise<boolean> | boolean {
    const notes = this.notesRef();
    if (!notes?.confirmExitIfDirty) {
      return true;
    }
    return notes.confirmExitIfDirty();
  }
}
