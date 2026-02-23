import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotesService } from './notes.service';

type NoteId = number;

interface Note {
  id: NoteId;
  content: string;
  completed: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.html',
  styleUrl: './notes.scss'
})
export class Notes {
  readonly notes = signal<Note[]>([]);

  content = '';
  editingId: NoteId | null = null;
  private readonly api = new NotesService();

  async ngOnInit() {
    const items = await this.api.list();
    this.notes.set(items);
  }

  get isEditing() {
    return this.editingId !== null;
  }

  saveNote() {
    const trimmedContent = this.content.trim();

    if (!trimmedContent) {
      return;
    }

    if (this.editingId !== null) {
      const id = this.editingId;
      this.api
        .update(id, { content: trimmedContent })
        .then((updated) => {
          this.notes.update((items) =>
            items.map((note) => (note.id === id ? updated : note))
          );
          this.resetForm();
        })
        .catch(console.error);
    } else {
      this.api
        .create(trimmedContent)
        .then((created) => {
          this.notes.update((items) => [created, ...items]);
          this.resetForm();
        })
        .catch(console.error);
    }
  }

  editNote(note: Note) {
    this.editingId = note.id;
    this.content = note.content;
  }

  deleteNote(id: NoteId) {
    this.api
      .remove(id)
      .then(() => {
        this.notes.update((items) => items.filter((note) => note.id !== id));
        if (this.editingId === id) {
          this.resetForm();
        }
      })
      .catch(console.error);
  }

  toggleCompleted(id: NoteId) {
    const current = this.notes().find((n) => n.id === id);
    if (!current) {
      return;
    }

    const nextCompleted = !current.completed;

    this.api
      .update(id, { completed: nextCompleted })
      .then((updated) => {
        this.notes.update((items) =>
          items.map((note) => (note.id === id ? updated : note))
        );
      })
      .catch(console.error);
  }

  resetForm() {
    this.content = '';
    this.editingId = null;
  }
}
