import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WinTitleBarComponent } from './win-title-bar.component';

describe('WinTitleBarComponent', () => {
  let component: WinTitleBarComponent;
  let fixture: ComponentFixture<WinTitleBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WinTitleBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WinTitleBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
