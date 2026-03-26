const PLACE_TYPE_MAP: Record<string, string> = {
  // Food & Drink
  restaurant:       'Restaurant',
  cafe:             'Cafe',
  bar:              'Bar',
  bakery:           'Bakery',
  meal_delivery:    'Delivery',
  meal_takeaway:    'Takeaway',
  night_club:       'Nightclub',
  food:             'Food',

  // Activities & Entertainment
  museum:           'Museum',
  art_gallery:      'Art Gallery',
  movie_theater:    'Cinema',
  bowling_alley:    'Bowling',
  amusement_park:   'Amusement Park',
  aquarium:         'Aquarium',
  zoo:              'Zoo',
  casino:           'Casino',
  stadium:          'Stadium',
  gym:              'Gym',
  spa:              'Spa',

  // Outdoors
  park:             'Park',
  campground:       'Campground',
  rv_park:          'RV Park',
  natural_feature:  'Natural Area',

  // Shopping
  shopping_mall:    'Shopping Mall',
  clothing_store:   'Clothing Store',
  book_store:       'Bookstore',
  jewelry_store:    'Jewelry Store',
  grocery_or_supermarket: 'Grocery',
  convenience_store: 'Convenience Store',

  // Services & Accommodation
  beauty_salon:     'Salon',
  hair_care:        'Hair Salon',
  lodging:          'Hotel',
  tourist_attraction: 'Attraction',
  church:           'Church',
  library:          'Library',
  university:       'University',
  hospital:         'Hospital',
  pharmacy:         'Pharmacy',
  bank:             'Bank',
  atm:              'ATM',
  gas_station:      'Gas Station',
  car_rental:       'Car Rental',

  // Catch-alls (suppress)
  point_of_interest: 'Point of Interest',
  establishment:     '',
  premise:           '',
  political:         '',
  locality:          '',
  sublocality:       '',
  route:             '',
};

/**
 * Returns the first human-readable label from a place's `types` array.
 * Filters out meaningless Google catch-all types like "establishment".
 */
export function getPlaceDisplayType(types: string[]): string {
  for (const type of types) {
    const mapped = PLACE_TYPE_MAP[type];
    if (mapped !== undefined && mapped !== '') return mapped;
    // Unknown type that's not in our map but looks meaningful
    if (mapped === undefined && !type.includes('_level_') && type !== 'political') {
      return type
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return 'Place';
}

/**
 * Returns "Type · $$" display string for a place.
 * If price_level is present, appends dollar signs.
 */
export function getPlaceCuisineAndType(
  types: string[],
  priceLevel?: number,
): string {
  const type = getPlaceDisplayType(types);
  if (priceLevel != null && priceLevel > 0) {
    return `${type} · ${'$'.repeat(priceLevel)}`;
  }
  return type;
}
