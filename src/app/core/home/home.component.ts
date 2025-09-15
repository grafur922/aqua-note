import { Component } from '@angular/core';
import { WinTitleBarComponent } from "../win-title-bar/win-title-bar.component";

@Component({
  selector: 'app-home',
  imports: [WinTitleBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.less'
})
export class HomeComponent {

}
