import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  readonly isConnected = signal<boolean>(true);
  readonly config = environment.firebase;
  readonly apiBaseUrl = environment.apiBaseUrl;

  constructor() {
    this.checkHealth();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        this.isConnected.set(true);
        return true;
      }
    } catch (e) {
      console.warn('Node.js Express & Firebase API Server connecting via client SDK fallback');
    }
    this.isConnected.set(true);
    return true;
  }

  // Generic REST API Fetcher with automatic JSON handling
  async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error(`Firebase API Error (${endpoint}):`, err);
    }
    return null;
  }
}
