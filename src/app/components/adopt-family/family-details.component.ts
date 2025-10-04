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
          <h2>{{ selectedFamily.last_name }} - Family Details</h2>
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
            <h2>{{ selectedFamily.last_name }}</h2>
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
            @for (member of selectedFamily.members; track member.first_name) {
              <div class="member-card" [class.all-adopted]="isAllItemsAdopted(member)">
                <div class="member-header">
                  <h4>{{ member.first_name }}</h4>
                  <span class="member-info">{{ member.age }} years old • {{ member.sex }}</span>
                  @if (member.is_parent) {
                    <span class="child-badge">Child</span>
                  } @else {
                    <span class="adult-badge">Adult</span>
                  }
                </div>
                
                @if (member.wishlist_items && member.wishlist_items.length > 0) {
                  @if (isAllItemsAdopted(member)) {
                    <!-- All items adopted - show toggle button -->
                    <div class="wish-list-completed">
                      <div class="completed-status">
                        <span class="completed-badge">✓ All Items Adopted</span>
                        <p-button 
                          [label]="isMemberExpanded(member.first_name) ? 'Hide Wish List' : 'Show Wish List'"
                          [icon]="isMemberExpanded(member.first_name) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                          size="small"
                          severity="secondary"
                          (click)="toggleMemberWishList(member.first_name)">
                        </p-button>
                      </div>
                      
                      @if (isMemberExpanded(member.first_name)) {
                        <div class="wish-list">
                          <h5>Wish List (All Adopted)</h5>
                          @for (item of getSortedWishList(member.wishlist_items || []); track item.id) {
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
                      @for (item of getSortedWishList(member.wishlist_items || []); track item.id) {
                        @if (item.is_adopted && $first) {
                          <div class="adopted-section-divider">
                            Adopted Items
                          </div>
                        }
                        <div class="wish-item" [class.adopted]="item.is_adopted">
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
                            @if (!item.is_adopted) {
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
      adultCount: selectedFamily.members.filter(member => !member.is_parent).length,
      childCount: selectedFamily.members.filter(member => member.is_parent).length
    };
  });

  // Computed signal to get sorted wish list items (unadopted first)
  getSortedWishList(wishList: WishItem[]): WishItem[] {
    return [...wishList].sort((a, b) => {
      // Unadopted items first
      if (!a.is_adopted && b.is_adopted) return -1;
      if (a.is_adopted && !b.is_adopted) return 1;
      
      // If both have same adoption status, maintain original order
      return 0;
    });
  }

  onClose() {
    this.expandedMembers.set(new Set());
    this.closeRequested.emit();
  }

  toggleMemberWishList(memberName: string) {
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

  adoptItem(item: WishItem, family: Family) {
    const user = this.currentUser();
    if (!user) return;
    
    item.is_adopted = true;
    item.adopted_by = user;
    console.log(`Adopted item: ${item.description} for ${family.last_name}`);
  }

  unadoptItem(item: WishItem, family: Family) {
    item.is_adopted = false;
    item.adopted_by = undefined;
    
    // Find the member who owns this item and expand their wish list
    const member = family.members.find(m => m.wishlist_items?.includes(item));
    if (member) {
      const current = this.expandedMembers();
      const newSet = new Set(current);
      newSet.add(member.first_name);
      this.expandedMembers.set(newSet);
    }
    
    console.log(`Unadopted item: ${item.description} for ${family.last_name}`);
  }

  isAdoptedByCurrentUser(item: WishItem): boolean {
    const user = this.currentUser();
    return item.is_adopted && item.adopted_by === user;
  }

  adoptAllItems(family: Family, event: Event) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;
    
    family.members.forEach(member => {
      member.wishlist_items?.forEach(item => {
        item.is_adopted = true;
        item.adopted_by = user;
      });
    });
    console.log('Adopted all items for family:', family.last_name);
  }

  isAllItemsAdopted(member: FamilyMember): boolean {
    return (member.wishlist_items?.length || 0) > 0 && (member.wishlist_items?.every(item => item.is_adopted) || false);
  }
} 