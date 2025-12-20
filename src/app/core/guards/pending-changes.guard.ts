import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export type PendingChangesHost = {
  confirmExitIfDirty?: () => Observable<boolean> | Promise<boolean> | boolean;
};

@Injectable({
  providedIn: 'root'
})
export class PendingChangesGuard implements CanDeactivate<PendingChangesHost> {
  canDeactivate(
    component: PendingChangesHost
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (component?.confirmExitIfDirty) {
      return component.confirmExitIfDirty();
    }
    return true;
  }
}
