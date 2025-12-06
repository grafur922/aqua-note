import { Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from '../../core/services/note.service';

@Component({
  selector: 'app-tag-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tag-dropdown.component.html',
  styleUrl: './tag-dropdown.component.less'
})
export class TagDropdownComponent {
  open = false;
  tagActive = false;
  private isMousedownOutside = false;
  disabled = false;
  currentTagName = '标签';
  tags$ = inject(NoteService).tags$
  dropdown = viewChild<ElementRef<HTMLElement>>('dropdownRef')
  currentTagId: string | null = null;
  loading = false;
  tagRef = viewChild<ElementRef<HTMLInputElement>>('tagInput')

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

  select(t: { tagId: string; tagName: string }) {
    this.currentTagId = t.tagId;
    this.currentTagName = t.tagName;
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
