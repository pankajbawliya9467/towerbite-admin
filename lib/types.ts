export type Role = 'cafe_staff' | 'super_admin';
/** `<section>.<action>`, e.g. `menu.edit`, `cafes.board` (list in lib/perms.ts). */
export type Permission = `${string}.${string}`;
export type Staff = { userId: string; role: Role; cafeId: string | null; name: string; isSuper?: boolean; permissions?: Permission[] };
export type Profile = { id: string; name: string; phone: string | null; email: string | null; staff: Staff | null };

export type OrderStatus = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled';
export type Address = { tower: string; floor: string; company: string; desk: string };
export type OrderItem = { id: string; menuItemId: string | null; name: string; emoji: string; price: number; qty: number; comboId?: string | null; detail?: string | null };
export type Order = {
  id: string; orderNo: number; status: OrderStatus; userId: string; itemsTotal: number; deliveryFee: number; total: number;
  paymentMethod: 'cod'; codCollected: boolean; customerName: string; customerPhone: string; address: Address;
  note: string | null; riderName: string | null; riderPhone?: string | null; rejectReason: string | null; createdAt: string; acceptedAt: string | null;
  outAt: string | null; deliveredAt: string | null; cancelledAt: string | null; rejectedAt: string | null;
  cafe: { id: string; slug: string; name: string; emoji: string; coverColor: string; place: string };
  location: { id: string; slug: string; name: string };
  items: OrderItem[];
  /** Set when this is a team order (one order for several people). */
  team: { code: string; name: string; deliverTo: string; people: number } | null;
};

export type Cafe = {
  id: string; locationId: string; slug: string; name: string; cuisines: string; place: string; emoji: string;
  coverColor: string; imageUrl: string | null; logoUrl: string | null; phone: string | null; rating: number; ratingCount: number;
  etaMin: number; etaMax: number; isOpen: boolean; acceptingOrders: boolean; tags: string[]; sort: number; isActive: boolean;
  lat: number | null; lng: number | null; geoRadiusM: number; geoCheck: boolean;
  /** Minimum order value in ₹ (items + combos); 0 = none. */
  minOrder: number;
};
export type Category = { id: string; cafeId: string; parentId: string | null; name: string; sort: number };
export type MenuItem = {
  id: string; cafeId: string; categoryId: string | null; name: string; description: string; price: number; isVeg: boolean;
  emoji: string; imageUrl: string | null; isAvailable: boolean; isPopular: boolean; sort: number;
  /** false = hidden from customers (still on the cafe's list) */
  isActive?: boolean;
  /** the global category (Admin → Categories) */
  catalogCategoryId?: string | null;
};
export type CafeWithMenu = Cafe & { categories: Category[]; items: MenuItem[] };
export type CafeStats = { orders: number; delivered: number; sales: number; codCollected: number; active: number };

export type Location = {
  id: string; slug: string; name: string; area: string; city: string; isActive: boolean;
  /** The campus outline drawn on the map: corners as [lat, lng]. Needed before the location can be live. */
  areaGeo: [number, number][] | null;
  /** false: orders only from inside the area */
  outsideAllowed: boolean;
};
export type Tower = { id: string; locationId: string; name: string; sort: number };
export type StaffRow = Staff & {
  cafeName: string | null; email: string; createdAt: string; passwordSetAt: string | null; activeLogins: number;
};
export type AdminRow = {
  id: string; name: string; email: string; isSuper: boolean; permissions: Permission[]; isActive: boolean;
  createdAt: string; passwordSetAt: string | null; activeLogins: number;
  /** Logs in with an authenticator-app code (false: sets it up at the next login). */
  twoFactor: boolean;
};
export type UserRow = {
  id: string; name: string; phone: string | null; email: string | null; company: string; tower: string; floor: string;
  desk: string; locationName: string | null; orderCount: number; spent: number; createdAt: string;
};
export type AdminStats = {
  ordersToday: number; salesToday: number | null; activeOrders: number; users: number; cafes: number; locations: number;
  byCafe: { id: string; name: string; emoji: string; locationName: string; orders: number; sales: number | null }[];
};

export type ReportTotals = { sales: number; orders: number; delivered: number; cancelled: number; rejected: number; all: number; avgOrder: number; lostPct: number };
export type CafeReport = {
  range: { from: string; to: string; days: number; prevFrom: string; prevTo: string };
  totals: ReportTotals;
  previous: ReportTotals;
  change: { sales: number | null; orders: number | null; avgOrder: number | null; lostPct: number | null };
  byDay: { day: string; sales: number; orders: number }[];
  byHour: { hour: number; orders: number }[];
  peakHour: { hour: number; orders: number } | null;
  topItems: { name: string; qty: number; sales: number; share: number; rising: boolean }[];
  companies: { name: string; orders: number; sales: number }[];
};

export type LunchSlot = { slot: string; plates: number };
export type Lunch = {
  id: string; cafeId: string; day: string; name: string; items: string; price: number; isVeg: boolean; plates: number;
  imageUrl: string | null; closesAt: string; cancelUntil: string; slots: string[]; isActive: boolean; booked: number; left: number; bookable: boolean;
  bySlot: LunchSlot[];
  /** Only in /v1/cafe/lunch/past: how many times this dish was posted. */
  timesPosted?: number;
};
export type LunchBookingStatus = 'booked' | 'out' | 'delivered' | 'cancelled';
export type LunchBooking = {
  id: string; bookingNo: number; lunchId: string; day: string; slot: string; qty: number; price: number; total: number;
  status: LunchBookingStatus; customerName: string; customerPhone: string | null; address: Address; note: string | null;
  createdAt: string; lunch: { name: string; items: string; isVeg: boolean };
};

export type Combo = {
  id: string; name: string; description: string; price: number; mrp: number; emoji: string; imageUrl: string | null;
  startTime: string | null; endTime: string | null; days: number[]; isActive: boolean; sort: number; availableNow: boolean;
  items: { menuItemId: string; name: string; emoji: string; price: number; qty: number; isAvailable: boolean }[];
  soldWeek?: number;
};
export type ComboIdea = { a: { menuItemId: string; name: string; price: number }; b: { menuItemId: string; name: string; price: number }; orders: number; pct: number };
export type RatingRow = {
  orderId: string; orderNo: number; stars: number; tags: string[]; comment: string; createdAt: string;
  resolvedAt: string | null; sorrySentAt: string | null; firstName: string; place: string; items: { name: string; liked: boolean }[];
};
export type RatingReport = {
  days: number; avg: number | null; prevAvg: number | null; count: number; low: number; delivered: number;
  onTimePct: number | null; avgMinutes: number | null; dist: { stars: number; n: number }[]; tags: { tag: string; n: number }[];
  items: { menuItemId: string; name: string; liked: number; total: number }[]; list: RatingRow[];
};

export type Rider = { id: string; name: string; phone: string | null; sort: number };

/** Global categories (one list for every cafe). `parentId` null = main category. */
export type CatalogCategory = {
  id: string; parentId: string | null; name: string; slug: string; emoji: string; aliases: string[]; keywords: string[];
  sort: number; isActive: boolean; products: number; cafes: number;
};
/** `enabled`: menus are built from the global categories (the big switch). */
export type CatalogList = { enabled: boolean; categories: CatalogCategory[]; unassigned: number; totalProducts: number };
/** One old per-cafe category name (all cafes that have it), and where it goes. */
export type MappingGroup = {
  key: string; name: string; parent: string | null; ids: string[]; cafes: number; products: number; sample: string[];
  target: string | null; action: 'map' | 'popular' | 'skip'; useKeywords: boolean; approved: boolean; mixed: boolean; mapped: boolean;
};
export type CatalogProduct = {
  id: string; name: string; emoji: string; price: number; isVeg: boolean; isActive: boolean; catalogCategoryId: string | null;
  cafeId: string; cafeName: string; oldCategory: string | null; oldParent: string | null;
};
