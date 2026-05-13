import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private auth = inject(AuthService);
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl || environment.apiUrl.replace('/api', ''), {
      transports: ['websocket', 'polling'],
      auth: { token: this.auth.getAccessToken() },
    });

    this.socket.on('connect', () => console.log('Socket connected:', this.socket?.id));
    this.socket.on('disconnect', () => console.log('Socket disconnected'));
    this.socket.on('connect_error', (err) => console.error('Socket error:', err));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinContest(contestId: string) {
    this.socket?.emit('join:contest', contestId);
  }

  leaveContest(contestId: string) {
    this.socket?.emit('leave:contest', contestId);
  }

  onSubmissionUpdate(): Observable<any> {
    return new Observable((observer) => {
      this.socket?.on('submission:update', (data) => observer.next(data));
      return () => this.socket?.off('submission:update');
    });
  }

  onScoreboardUpdate(): Observable<any> {
    return new Observable((observer) => {
      this.socket?.on('scoreboard:update', (data) => observer.next(data));
      return () => this.socket?.off('scoreboard:update');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
