import { Component, OnInit } from '@angular/core';
import { HomeAboutSectionComponent } from "../home-about-section/home-about-section.component";

@Component({
  selector: 'app-hero-section',
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.css'],
  imports: [HomeAboutSectionComponent]
})
export class HeroSectionComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
