import { Component, input, signal, computed, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Family, FamilyMember, WishItem } from '../../shared/types';

@Component({
  selector: 'app-family-details',
  standalone: true,
  imports: [CardModule, ButtonModule],
  template: `
    @if (family(); as selectedFamily) {
      <div class="family-details-inline">
        <div class="family-details-header">
          <h2>{{ selectedFamily.name }} - Family Details</h2>
          <p-button 
            label="Close" 
            icon="pi pi-times"
            severity="secondary"
            size="small"
            (onClick)="onClose()">
          </p-button>
        </div>
        
        <div class="family-details">
          <div class="family-info">
            <h2>{{ selectedFamily.name }}</h2>
            <div class="family-summary">
              <span class="adults">{{ familyCounts().adultCount }} Adults</span>
              <span class="children">{{ familyCounts().childCount }} Children</span>
            </div>
            <div class="adopt-all-section" (click)="adoptAllItems(selectedFamily, $event)">
              <p-button 
                class="adopt-all-btn"
                label="Adopt All Items for This Family" 
                icon="pi pi-heart-fill" 
                iconPos="right"
                severity="success"
                size="large">
              </p-button>
            </div>
          </div>
          
          <div class="members-section">
            @for (member of selectedFamily.members; track member.name) {
              <div class="member-card" [class.all-adopted]="isAllItemsAdopted(member)">
                <div class="member-header">
                  <h4>{{ member.name }}</h4>
                  <span class="member-info">{{ member.age }} years old • {{ member.gender }}</span>
                  @if (member.isChild) {
                    <span class="child-badge">Child</span>
                  } @else {
                    <span class="adult-badge">Adult</span>
                  }
                </div>
                
                @if (member.wishList.length > 0) {
                  @if (isAllItemsAdopted(member)) {
                    <!-- All items adopted - show toggle button -->
                    <div class="wish-list-completed">
                      <div class="completed-status">
                        <span class="completed-badge">✓ All Items Adopted</span>
                        <p-button 
                          [label]="isMemberExpanded(member.name) ? 'Hide Wish List' : 'Show Wish List'"
                          [icon]="isMemberExpanded(member.name) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                          size="small"
                          severity="secondary"
                          (click)="toggleMemberWishList(member.name)">
                        </p-button>
                      </div>
                      
                      @if (isMemberExpanded(member.name)) {
                        <div class="wish-list">
                          <h5>Wish List (All Adopted)</h5>
                          @for (item of getSortedWishList(member.wishList); track item.id) {
                            <div class="wish-item adopted">
                              <div class="item-info">
                                <span class="item-category">{{ item.category }}</span>
                                <span class="item-description">{{ item.description }}</span>
                                @if (item.color) {
                                  <span class="item-detail">Color: {{ item.color }}</span>
                                }
                                @if (item.size) {
                                  <span class="item-detail">Size: {{ item.size }}</span>
                                }
                                @if (item.details) {
                                  <div class="item-details">{{ item.details }}</div>
                                }
                                @if (item.link) {
                                  <a href="{{ item.link }}" target="_blank" class="item-link">
                                    <i class="pi pi-external-link"></i> View Item
                                  </a>
                                }
                              </div>
                              <div class="item-actions">
                                <div class="adopted-info">
                                  <span class="adopted-badge">Adopted ✓</span>
                                  @if (item.adoptedBy) {
                                    <div class="adopted-by">by {{ item.adoptedBy }}</div>
                                  }
                                  @if (isAdoptedByCurrentUser(item)) {
                                    <p-button 
                                      label="Unadopt" 
                                      icon="pi pi-times" 
                                      size="small"
                                      severity="secondary"
                                      (click)="unadoptItem(item, selectedFamily)">
                                    </p-button>
                                  }
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <!-- Some items not adopted - show wish list normally -->
                    <div class="wish-list">
                      <h5>Wish List</h5>
                      @for (item of getSortedWishList(member.wishList); track item.id) {
                        @if (item.isAdopted && $first) {
                          <div class="adopted-section-divider">
                            Adopted Items
                          </div>
                        }
                        <div class="wish-item" [class.adopted]="item.isAdopted">
                          <div class="item-info">
                            <span class="item-category">{{ item.category }}</span>
                            <span class="item-description">{{ item.description }}</span>
                            @if (item.color) {
                              <span class="item-detail">Color: {{ item.color }}</span>
                            }
                            @if (item.size) {
                              <span class="item-detail">Size: {{ item.size }}</span>
                            }
                            @if (item.details) {
                              <div class="item-details">{{ item.details }}</div>
                            }
                            @if (item.link) {
                              <a href="{{ item.link }}" target="_blank" class="item-link">
                                <i class="pi pi-external-link"></i> View Item
                              </a>
                            }
                          </div>
                          <div class="item-actions">
                            @if (!item.isAdopted) {
                              <p-button 
                                class="adopt-all-btn"
                                label="Adopt" 
                                icon="pi pi-heart-fill" 
                                iconPos="right"
                                size="large"
                                (click)="adoptItem(item, selectedFamily)">
                              </p-button>
                            } @else if (isAdoptedByCurrentUser(item)) {
                              <div class="adopted-info">
                                <span class="adopted-badge">Adopted ✓</span>
                                <div class="adopted-by">by {{ item.adoptedBy }}</div>
                                <p-button 
                                  label="Unadopt" 
                                  icon="pi pi-times" 
                                  size="small"
                                  severity="secondary"
                                  (click)="unadoptItem(item, selectedFamily)">
                                </p-button>
                              </div>
                            } @else {
                              <div class="adopted-info">
                                <span class="adopted-badge">Adopted ✓</span>
                                @if (item.adoptedBy) {
                                  <div class="adopted-by">by {{ item.adoptedBy }}</div>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                } @else {
                  <p class="no-wishes">No wish list items</p>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./family-details.component.scss']
})
export class FamilyDetailsComponent {
  family = input<Family | null>(null);
  currentUser = input<string | null>(null);
  expandedMembers = signal<Set<string>>(new Set());
  closeRequested = output<void>();

  // Computed signal for selected family counts
  readonly familyCounts = computed(() => {
    const selectedFamily = this.family();
    if (!selectedFamily) return { adultCount: 0, childCount: 0 };
    
    return {
      adultCount: selectedFamily.members.filter(member => !member.isChild).length,
      childCount: selectedFamily.members.filter(member => member.isChild).length
    };
  });

  // Computed signal to get sorted wish list items (unadopted first)
  getSortedWishList(wishList: WishItem[]): WishItem[] {
    return [...wishList].sort((a, b) => {
      // Unadopted items first
      if (!a.isAdopted && b.isAdopted) return -1;
      if (a.isAdopted && !b.isAdopted) return 1;
      
      // If both have same adoption status, maintain original order
      return 0;
    });
  }

  onClose(): void {
    this.expandedMembers.set(new Set());
    this.closeRequested.emit();
  }

  toggleMemberWishList(memberName: string): void {
    const current = this.expandedMembers();
    const newSet = new Set(current);
    
    if (newSet.has(memberName)) {
      newSet.delete(memberName);
    } else {
      newSet.add(memberName);
    }
    
    this.expandedMembers.set(newSet);
  }

  isMemberExpanded(memberName: string): boolean {
    return this.expandedMembers().has(memberName);
  }

  adoptItem(item: WishItem, family: Family): void {
    const user = this.currentUser();
    if (!user) return;
    
    item.isAdopted = true;
    item.adoptedBy = user;
    console.log(`Adopted item: ${item.description} for ${family.name}`);
  }

  unadoptItem(item: WishItem, family: Family): void {
    item.isAdopted = false;
    item.adoptedBy = undefined;
    
    // Find the member who owns this item and expand their wish list
    const member = family.members.find(m => m.wishList.includes(item));
    if (member) {
      const current = this.expandedMembers();
      const newSet = new Set(current);
      newSet.add(member.name);
      this.expandedMembers.set(newSet);
    }
    
    console.log(`Unadopted item: ${item.description} for ${family.name}`);
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.isAdopted && item.adoptedBy === user;
  }

  adoptAllItems(family: Family, event: Event): void {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    family.members.forEach(member => {
      member.wishList.forEach(item => {
        item.isAdopted = true;
        item.adoptedBy = user;
      });
    });
    console.log('Adopted all items for family:', family.name);
  }

  isAllItemsAdopted(member: FamilyMember): boolean {
    return member.wishList.length > 0 && member.wishList.every(item => item.isAdopted);
  }
} 