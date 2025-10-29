import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { contextMenu } from '../../models/contextMenu.model';

@Component({
  selector: 'app-context-menu',
  imports: [],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContextMenuComponent {
  menuProps = input<contextMenu[]>([]);
  visible = input(false);
  position = input<{ x: number; y: number }>({ x: 0, y: 0 });
  context = input<unknown>(null);
  itemSelected = output<contextMenu>();

  onItemClick(event: MouseEvent, item: contextMenu): void {
    event.stopPropagation();
    item.operation?.(this.context());
    this.itemSelected.emit(item);
  }
}
