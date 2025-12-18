import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from '../../core/services/note.service';
import { Subject, takeUntil } from 'rxjs';
import { ALL_TAG_ID, ALL_TAG_NAME, Tag } from '../../shared/models/note.model';

@Component({
  selector: 'app-tag-dropdown',
  imports: [CommonModule],
  templateUrl: './tag-dropdown.component.html',
  styleUrl: './tag-dropdown.component.less'
})
export class TagDropdownComponent implements OnInit, OnDestroy {
  private noteService = inject(NoteService);
  private destroy$ = new Subject<void>();

  open = false;
  tagActive = false;
  private isMousedownOutside = false;
  disabled = false;
  currentTagName = ALL_TAG_NAME;
  tags$ = this.noteService.tags$;
  dropdown = viewChild<ElementRef<HTMLElement>>('dropdownRef')
  currentTagId: string | null = ALL_TAG_ID;
  loading = false;
  tagRef = viewChild<ElementRef<HTMLInputElement>>('tagInput')

  ngOnInit(): void {
    this.noteService.selectedTagId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tagId => {
        if (tagId === null) {
          this.currentTagId = ALL_TAG_ID;
          this.currentTagName = ALL_TAG_NAME;
          return;
        }

        this.currentTagId = tagId;
      });

    this.tags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tags => {
        if (!this.currentTagId || this.currentTagId === ALL_TAG_ID) {
          this.currentTagName = ALL_TAG_NAME;
          return;
        }

        const selected = tags.find(t => t.tagId === this.currentTagId);
        if (selected) {
          this.currentTagName = selected.tagName;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle() {
    this.open = !this.open;
    if (this.open === true) {
      this.tagActive = false
    }
  }
  addTag() {
    this.tagActive = true
    setTimeout(() => {
      this.tagRef()?.nativeElement.focus()
    }, 0);
  }


  tagConfirm() {
    //http
    console.log('confirm');
    
    this.tagActive = false;
  }

  tagCancel(){
    event?.preventDefault()
    console.log('cancel')
    this.tagActive = false;
  }

  select(t: Tag) {
    this.currentTagId = t.tagId;
    this.currentTagName = t.tagName;
    this.noteService.setSelectedTagId(t.tagId === ALL_TAG_ID ? null : t.tagId);
    this.open = false;
  }

  addTagFromInput(input: HTMLInputElement) {
    //   const name = (input.value || '').trim();
    //   if (!name) return;
    //   if (this.tags.some(x => x.tagName === name)) { input.value = ''; return; }
    //   const id = this.tags.length ? Math.max(...this.tags.map(x => x.tagId)) + 1 : 1;
    //   const t = { tagId: id, tagName: name };
    //   this.tags = [...this.tags, t];
    //   this.currentTagId = t.tagId;
    //   this.currentTagName = t.tagName;
    //   input.value = '';
  }

  deleteTag(t: { id: number; name: string }) {
    //   this.tags = this.tags.filter(x => x.id !== t.id);
    //   if (this.currentTagId === t.id) {
    //     this.currentTagId = null;
    //     this.currentTagName = '';
    //   }
  }
  constructor(private elementRef: ElementRef) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open && !this.elementRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
