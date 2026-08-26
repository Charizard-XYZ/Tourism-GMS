import { Component, signal, inject, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationStart } from '@angular/router';
import { Navbar } from './common/navbar/navbar';
import { FooterComponent } from "./common/footer/footer.component";
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('Tourism-GMS');
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.authService.isAuthenticated()) {
          const targetUrl = event.url.split('?')[0];
          if (targetUrl === '/' || targetUrl === '' || targetUrl === '/auth/login' || targetUrl === '/auth/register') {
            const role = this.authService.userRole();
            const homeRoute = role === 'admin' ? '/admin/dashboard' : (role === 'officer' ? '/officer/dashboard' : '/citizen/dashboard');
            this.router.navigate([homeRoute], { replaceUrl: true });
          }
        }
      }
    });
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    if (this.authService.isAuthenticated()) {
      const currentUrl = window.location.pathname;
      if (currentUrl === '/' || currentUrl === '' || currentUrl === '/auth/login' || currentUrl === '/auth/register') {
        window.history.pushState(null, '', window.location.href);
        const role = this.authService.userRole();
        const homeRoute = role === 'admin' ? '/admin/dashboard' : (role === 'officer' ? '/officer/dashboard' : '/citizen/dashboard');
        this.router.navigate([homeRoute], { replaceUrl: true });
      }
    }
  }
}
