import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface NoteDto {
  id: number;
  content: string;
  completed: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/notes';

  async list(): Promise<NoteDto[]> {
    return firstValueFrom(this.http.get<NoteDto[]>(this.baseUrl));
  }

  async create(content: string): Promise<NoteDto> {
    return firstValueFrom(this.http.post<NoteDto>(this.baseUrl, { content }));
  }

  async update(id: number, data: Partial<Pick<NoteDto, 'content' | 'completed'>>): Promise<NoteDto> {
    return firstValueFrom(this.http.put<NoteDto>(`${this.baseUrl}/${id}`, data));
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}

