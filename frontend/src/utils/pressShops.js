export const DEFAULT_LOCATION = [20.5937, 78.9629];

const fallbackCatalog = [
  {
    shopName: "Steam & Stitch Studio",
    address: "Civil Lines, Nagpur",
    phone: "+91 98230 14567",
    pricePerCloth: 14,
    rating: 4.8,
    specialty: "Steam press and office wear finishing",
    pickupWindow: "Pickup in 25 mins",
    eta: "90 mins",
    turnaroundHours: 8,
    minimumOrderValue: 149,
    isFeatured: true,
    services: ["Express press", "Shirts", "Trousers", "Wash and iron"],
    about: "Ideal for office wear, quick weekday pickups, and recurring shirt bundles.",
    reviews: [
      { authorName: "Priya", rating: 5, comment: "Excellent finish and on-time doorstep pickup." },
      { authorName: "Rahul", rating: 4, comment: "Smooth booking and clear communication." }
    ],
    locationOffset: [0.012, -0.008]
  },
  {
    shopName: "Fresh Fold Presswala",
    address: "Ramdaspeth, Nagpur",
    phone: "+91 93701 44089",
    pricePerCloth: 12,
    eta: "2 hrs",
    rating: 4.5,
    specialty: "Daily wear ironing with quick dispatch",
    pickupWindow: "Pickup in 35 mins",
    turnaroundHours: 12,
    minimumOrderValue: 99,
    services: ["Daily wear", "Sarees", "Pickup", "Uniforms"],
    about: "Budget-friendly neighborhood option with dependable daily pressing slots.",
    locationOffset: [-0.01, 0.014]
  },
  {
    shopName: "Royal Crease Laundry Press",
    address: "Dharampeth, Nagpur",
    phone: "+91 98904 23118",
    pricePerCloth: 16,
    eta: "Same day",
    rating: 4.9,
    specialty: "Ceremonial and premium fabric pressing",
    pickupWindow: "Pickup in 40 mins",
    turnaroundHours: 10,
    minimumOrderValue: 249,
    isFeatured: true,
    services: ["Blazers", "Lehengas", "Premium finish", "Wedding wear"],
    about: "High-care pressing for occasion wear, premium folds, and event-ready garments.",
    locationOffset: [0.018, 0.01]
  },
  {
    shopName: "Campus Quick Press",
    address: "Laxmi Nagar, Nagpur",
    phone: "+91 91585 88042",
    pricePerCloth: 10,
    eta: "75 mins",
    rating: 4.4,
    specialty: "Student-friendly express ironing",
    pickupWindow: "Pickup in 20 mins",
    turnaroundHours: 6,
    minimumOrderValue: 79,
    services: ["Uniforms", "Hostel pickup", "Bulk", "Same day"],
    about: "Fast and affordable service designed for students and shared hostel drop-offs.",
    locationOffset: [-0.015, -0.01]
  },
  {
    shopName: "EcoPress Doorstep Care",
    address: "Manish Nagar, Nagpur",
    phone: "+91 97666 51203",
    pricePerCloth: 15,
    eta: "3 hrs",
    rating: 4.7,
    specialty: "Low-heat press with reusable packaging",
    pickupWindow: "Pickup in 45 mins",
    turnaroundHours: 18,
    minimumOrderValue: 189,
    services: ["Eco bags", "Curtains", "Home linens", "Dry clean"],
    about: "Eco-conscious care with reusable packaging and home linen handling.",
    locationOffset: [0.005, 0.02]
  },
  {
    shopName: "Midnight Finish Press House",
    address: "Bajaj Nagar, Nagpur",
    phone: "+91 90110 62041",
    pricePerCloth: 18,
    eta: "Open till 11 PM",
    rating: 4.6,
    specialty: "Late-evening rush orders and wedding wear",
    pickupWindow: "Pickup in 30 mins",
    turnaroundHours: 14,
    minimumOrderValue: 199,
    services: ["Wedding wear", "Night slot", "Stain check", "Premium steam"],
    about: "Late-hour emergency pressing with extra attention for occasion garments.",
    locationOffset: [-0.02, 0.006]
  }
];

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm([lat1, lng1], [lat2, lng2]) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildFallbackShops(location) {
  return fallbackCatalog.map((shop, index) => {
    const [latOffset, lngOffset] = shop.locationOffset;
    const lat = location[0] + latOffset;
    const lng = location[1] + lngOffset;

    return {
      ...shop,
      _id: `fallback-${index}`,
      ownerName: shop.shopName,
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    };
  });
}

export function normalizeShop(shop, index, userLocation) {
  const coordinates = shop.location?.coordinates;
  const hasCoordinates = Array.isArray(coordinates) && coordinates.length >= 2;
  const distanceKm = hasCoordinates
    ? calculateDistanceKm(userLocation, [coordinates[1], coordinates[0]])
    : undefined;

  return {
    ...shop,
    rating: typeof shop.rating === "number" && shop.rating > 0 ? shop.rating : 4.2 + (index % 4) * 0.2,
    eta: shop.eta || (index % 2 === 0 ? "90 mins" : "Same day"),
    specialty: shop.specialty || (index % 2 === 0 ? "Steam press and fold" : "Premium crease finishing"),
    pickupWindow: shop.pickupWindow || `Pickup in ${20 + index * 5} mins`,
    turnaroundHours: shop.turnaroundHours || 24,
    minimumOrderValue: shop.minimumOrderValue || 99,
    about: shop.about || "Reliable local press service with quick turnaround and pickup support.",
    services:
      Array.isArray(shop.services) && shop.services.length > 0
        ? shop.services
        : ["Steam press", "Pickup", "Door delivery"],
    reviews:
      Array.isArray(shop.reviews) && shop.reviews.length > 0
        ? shop.reviews
        : [
            {
              authorName: "PressKardu user",
              rating: 5,
              comment: "Smooth experience with neat folding and reliable service."
            }
          ],
    distanceKm
  };
}

export function enrichShopCollection(shops, userLocation) {
  return shops.map((shop, index) => normalizeShop(shop, index, userLocation));
}
