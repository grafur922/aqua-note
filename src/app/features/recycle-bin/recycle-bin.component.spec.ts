import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoteService } from '../../core/services/note.service';

import { RecycleBinComponent } from './recycle-bin.component';

describe('RecycleBinComponent', () => {
  let component: RecycleBinComponent;
  let fixture: ComponentFixture<RecycleBinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleBinComponent],
      providers: [
        {
          provide: NoteService,
          useValue: {
            notes$: of([]),
            getNotes: () => of([]),
            syncNotes: () => of(null),
            deleteNote: () => of(true),
            updateNote: () => {}
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleBinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
