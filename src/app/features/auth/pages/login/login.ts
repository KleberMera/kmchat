import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);

  enterDashboard(event: SubmitEvent): void {
    event.preventDefault();
    void this.router.navigateByUrl('/dashboard');
  }
}
