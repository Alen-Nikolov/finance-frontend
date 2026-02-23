import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';

@Component({
  selector: 'app-hello',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hello.html',
  styleUrl: './hello.scss'
})
export class Hello implements OnInit, OnDestroy {
  messages =  [] as any;
  username = signal('');
  text = signal('');

  constructor(private readonly chat: ChatService) {}


  ngOnInit(): void {
    this.messages = this.chat.messages;
    this.chat.setHelloActive(true);
  }

  ngOnDestroy(): void {
    this.chat.setHelloActive(false);
  }

  send() {
    const name = this.username();
    const content = this.text();
    this.chat.send(name, content);
    this.text.set('');
  }
}

