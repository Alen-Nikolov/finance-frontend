import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './budget.html',
  styleUrl: './budget.scss'
})
export class Budget {}
