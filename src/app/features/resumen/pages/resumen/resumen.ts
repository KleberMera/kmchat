import { Component } from '@angular/core';
import { ChartBar } from '@primeicons/angular/chart-bar';
import { Inbox } from '@primeicons/angular/inbox';
import { Users } from '@primeicons/angular/users';

@Component({
  imports: [ChartBar, Inbox, Users],
  selector: 'app-resumen',
  templateUrl: './resumen.html',
})
export class Resumen {}
