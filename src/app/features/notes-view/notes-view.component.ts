import { Component } from '@angular/core';
import { NoteListComponent } from '../note-list/note-list.component';
import { NotesComponent } from '../notes/notes.component';

@Component({
  selector: 'app-notes-view',
  imports: [NoteListComponent, NotesComponent],
  templateUrl: './notes-view.component.html',
  styleUrl: './notes-view.component.less'
})
export class NotesViewComponent {

}
