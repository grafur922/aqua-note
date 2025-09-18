import { Component } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { RouterOutlet } from "@angular/router";
import { NotesComponent } from "../../../features/notes/notes.component";
import { NoteListComponent } from "../../../features/note-list/note-list.component";

@Component({
  selector: 'app-home',
  imports: [SidebarComponent, RouterOutlet, NotesComponent, NoteListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.less'
})
export class HomeComponent {

}
