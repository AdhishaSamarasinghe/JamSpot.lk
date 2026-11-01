export type Role = "owner" | "musician";

export type Profile = {
  id: string;
  name: string;
  phone: string;
  role: Role;
};

export type Studio = {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  price_per_hour: number;
  equipment: string[];
  photos: string[];
  created_at: string;
};

export type StudioHours = {
  id?: string;
  studio_id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type Booking = {
  id: string;
  studio_id: string;
  musician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  created_at: string;
};
