import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss'
})
export class Calculator {}
