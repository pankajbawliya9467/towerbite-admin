export type Role = 'cafe_staff' | 'super_admin';
export type Staff = { userId: string; role: Role; cafeId: string | null; name: string };
export type Profile = { id: string; name: string; phone: string | null; email: string | null; staff: Staff | null };

export type OrderStatus = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled';
export type Address = { tower: string; floor: string; company: string; desk: string };
export type OrderItem = { id: string; menuItemId: string; name: string; emoji: string; price: number; qty: number };
export type Order = {
  id: string; orderNo: number; status: OrderStatus; userId: string; itemsTotal: number; deliveryFee: number; total: number;
  paymentMethod: 'cod'; codCollected: boolean; customerName: string; customerPhone: string; address: Address;
  note: string | null; riderName: string | null; rejectReason: string | null; createdAt: string; acceptedAt: string | null;
  outAt: string | null; deliveredAt: string | null; cancelledAt: string | null; rejectedAt: string | null;
  cafe: { id: string; slug: string; name: string; emoji: string; coverColor: string; place: string };
  location: { id: string; slug: string; name: string };
  items: OrderItem[];
  /** Set when this is a team order (one order for several people). */
  team: { code: string; name: string; deliverTo: string; people: number } | null;
};

export type Cafe = {
  id: string; locationId: string; slug: string; name: string; cuisines: string; place: string; emoji: string;
  coverColor: string; imageUrl: string | null; phone: string | null; rating: number; ratingCount: number;
  etaMin: number; etaMax: number; isOpen: boolean; acceptingOrders: boolean; tags: string[]; sort: number;
};
export type Category = { id: string; cafeId: string; name: string; sort: number };
export type MenuItem = {
  id: string; cafeId: string; categoryId: string | null; name: string; description: string; price: number; isVeg: boolean;
  emoji: string; imageUrl: string | null; isAvailable: boolean; isPopular: boolean; sort: number;
};
export type CafeWithMenu = Cafe & { categories: Category[]; items: MenuItem[] };
export type CafeStats = { orders: number; delivered: number; sales: number; codCollected: number; active: number };

export type Location = { id: string; slug: string; name: string; area: string; city: string; isActive: boolean };
export type Tower = { id: string; locationId: string; name: string; sort: number };
export type StaffRow = Staff & { cafeName: string | null; email: string; createdAt: string };
export type UserRow = {
  id: string; name: string; phone: string | null; email: string | null; company: string; tower: string; floor: string;
  desk: string; locationName: string | null; orderCount: number; spent: number; createdAt: string;
};
export type AdminStats = {
  ordersToday: number; salesToday: number; activeOrders: number; users: number; cafes: number; locations: number;
  byCafe: { id: string; name: string; emoji: string; locationName: string; orders: number; sales: number }[];
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
  closesAt: string; cancelUntil: string; slots: string[]; isActive: boolean; booked: number; left: number; bookable: boolean;
  bySlot: LunchSlot[];
};
export type LunchBookingStatus = 'booked' | 'out' | 'delivered' | 'cancelled';
export type LunchBooking = {
  id: string; bookingNo: number; lunchId: string; day: string; slot: string; qty: number; price: number; total: number;
  status: LunchBookingStatus; customerName: string; customerPhone: string | null; address: Address; note: string | null;
  createdAt: string; lunch: { name: string; items: string; isVeg: boolean };
};
