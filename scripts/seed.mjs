// Seeds demo accounts and 3 sample studios (Colombo and Kandy).
// Usage: npm run seed   (reads .env.local; needs SUPABASE_SERVICE_ROLE_KEY)
// Safe to run more than once: it replaces the demo owner's studios each time.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = "studio-photos";
const PASSWORD = "password123";

const USERS = [
  { email: "owner@jamspot.lk", name: "Nuwan Perera", phone: "0771234567", role: "owner" },
  { email: "musician@jamspot.lk", name: "Ayesha Fernando", phone: "0719876543", role: "musician" },
];

const STUDIOS = [
  {
    name: "Rhythm Room Colombo",
    city: "Colombo",
    address: "45 Galle Road, Colombo 03",
    description:
      "A fully sound-treated rehearsal room in the heart of Colombo. Air conditioned, with free parking for two vehicles. Great for bands of up to 6 people.",
    phone: "0771234567",
    price_per_hour: 2500,
    equipment: ["Pearl drum kit", "Marshall guitar amp", "Ampeg bass amp", "Yamaha keyboard", "Shure mics", "PA system", "Air conditioning"],
    // Open every day 9 AM – 9 PM
    hours: Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, open_time: "09:00", close_time: "21:00", is_closed: false })),
    colors: ["#ea580c", "#7c2d12"],
  },
  {
    name: "Bassline Studios",
    city: "Colombo",
    address: "12 Duplication Road, Colombo 04",
    description:
      "Two practice rooms with high-quality backline. Late-night slots on weekends. Recording available on request.",
    phone: "0112345678",
    price_per_hour: 3500,
    equipment: ["Tama drum kit", "Fender guitar amp", "Bass amp", "Mixer", "Monitors", "Microphones"],
    // Mon–Fri 2 PM – 11 PM, Sat 10 AM – midnight, Sun closed
    hours: [
      { day_of_week: 0, open_time: null, close_time: null, is_closed: true },
      ...[1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, open_time: "14:00", close_time: "23:00", is_closed: false })),
      { day_of_week: 6, open_time: "10:00", close_time: "24:00", is_closed: false },
    ],
    colors: ["#2563eb", "#1e1b4b"],
  },
  {
    name: "Hill Capital Jam Space",
    city: "Kandy",
    address: "8 Peradeniya Road, Kandy",
    description:
      "A friendly, affordable jam space close to Kandy town. Perfect for students and new bands.",
    phone: "0812233445",
    price_per_hour: 1500,
    equipment: ["Drum kit", "Guitar amp", "Keyboard", "Microphones", "PA system"],
    // Mon–Sat 8 AM – 8 PM, Sun 10 AM – 6 PM
    hours: [
      { day_of_week: 0, open_time: "10:00", close_time: "18:00", is_closed: false },
      ...[1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, open_time: "08:00", close_time: "20:00", is_closed: false })),
    ],
    colors: ["#059669", "#064e3b"],
  },
];

function coverSvg(title, subtitle, [from, to], variant) {
  const shapes = [
    `<circle cx="980" cy="160" r="260" fill="#fff" opacity="0.08"/><circle cx="160" cy="760" r="320" fill="#fff" opacity="0.06"/>`,
    `<rect x="760" y="-80" width="520" height="520" rx="80" fill="#fff" opacity="0.07" transform="rotate(20 1000 180)"/>`,
    `<circle cx="600" cy="450" r="380" fill="none" stroke="#fff" stroke-width="40" opacity="0.08"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  ${shapes[variant % shapes.length]}
  <text x="80" y="700" font-family="Helvetica, Arial, sans-serif" font-size="140" fill="#fff" opacity="0.9">♪</text>
  <text x="80" y="800" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#fff">${title}</text>
  <text x="80" y="850" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#fff" opacity="0.8">${subtitle}</text>
</svg>`;
}

async function ensureUser({ email, name, phone, role }) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name, phone, role },
  });
  if (error) throw error;
  return data.user.id;
}

function sriLankaDate(offsetDays) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const [ownerId, musicianId] = await Promise.all(USERS.map(ensureUser));
  console.log("✓ Demo users ready");

  // Start fresh: remove the demo owner's old studios and photos.
  await supabase.from("studios").delete().eq("owner_id", ownerId);
  const { data: oldFiles } = await supabase.storage.from(BUCKET).list(ownerId);
  if (oldFiles?.length) {
    await supabase.storage.from(BUCKET).remove(oldFiles.map((f) => `${ownerId}/${f.name}`));
  }

  const studioIds = [];
  for (const [i, s] of STUDIOS.entries()) {
    const photos = [];
    const labels = ["Main room", "Drum corner", "Control desk"];
    for (const [j, label] of labels.entries()) {
      const path = `${ownerId}/seed-${i}-${j}.svg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, Buffer.from(coverSvg(s.name, label, s.colors, j)), {
          contentType: "image/svg+xml",
          upsert: true,
        });
      if (error) throw error;
      photos.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }

    const { hours, colors, ...fields } = s;
    const { data: studio, error } = await supabase
      .from("studios")
      .insert({ ...fields, owner_id: ownerId, photos })
      .select("id")
      .single();
    if (error) throw error;

    const { error: hoursError } = await supabase
      .from("studio_hours")
      .insert(hours.map((h) => ({ ...h, studio_id: studio.id })));
    if (hoursError) throw hoursError;

    studioIds.push(studio.id);
    console.log(`✓ ${s.name} (${s.city})`);
  }

  // One pending request so the owner dashboard has something to show.
  const { error: bookingError } = await supabase.from("bookings").insert({
    studio_id: studioIds[0],
    musician_id: musicianId,
    date: sriLankaDate(1),
    start_time: "18:00",
    end_time: "20:00",
  });
  if (bookingError) throw bookingError;
  console.log("✓ Sample booking request for tomorrow 6–8 PM");

  console.log(`
Done! Log in with:
  Studio owner: owner@jamspot.lk / ${PASSWORD}
  Musician:     musician@jamspot.lk / ${PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
