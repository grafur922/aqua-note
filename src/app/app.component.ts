import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WinTitleBarComponent } from './core/win-title-bar/win-title-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WinTitleBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
})
export class AppComponent {
  title = 'AquaNote';
}
