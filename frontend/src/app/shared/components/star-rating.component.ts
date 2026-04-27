import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

/**
 * Sélecteur de note 1-5 étoiles. Mode lecture seule pour afficher une moyenne,
 * mode interactif (cliquable + hover) pour voter.
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="inline-flex gap-1 items-center">
      @for (n of stars; track n) {
        <button type="button"
                [disabled]="readonly()"
                (click)="setRating(n)"
                (mouseenter)="hover.set(n)"
                (mouseleave)="hover.set(0)"
                class="transition-colors disabled:cursor-default"
                [class.cursor-pointer]="!readonly()">
          <svg viewBox="0 0 24 24"
               [class.text-accent-500]="n <= filledCount()"
               [class.text-ink-500]="n > filledCount()"
               class="transition-colors"
               [style.width.px]="size()"
               [style.height.px]="size()">
            <path fill="currentColor"
                  d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>
      }
      @if (showLabel()) {
        <span class="ml-2 text-sm text-zinc-400 font-mono">
          {{ rating() | number:'1.1-1' }} / 5
        </span>
      }
    </div>
  `
})
export class StarRatingComponent {
  readonly stars = [1, 2, 3, 4, 5];

  rating = input<number>(0);
  readonly = input<boolean>(false);
  size = input<number>(20);
  showLabel = input<boolean>(false);

  rated = output<number>();

  protected hover = signal(0);
  protected filledCount = computed(() => this.hover() || Math.round(this.rating()));

  protected setRating(n: number) {
    if (this.readonly()) return;
    this.rated.emit(n);
  }
}
