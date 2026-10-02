import { PrismaClient, Role, RuleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Admin User
  const adminEmail = 'admin@beachhouse.com';
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
    },
    create: {
      email: adminEmail,
      name: 'Ahungalla Host',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  let adminId = admin.id;
  console.log('Admin user verified/reset: admin@beachhouse.com / admin123');

  // 2. Create default Property
  const propertySlug = 'ahungalla-beach-house';
  
  const propertyData = {
    name: 'Ahungalla Beach House',
    description: 'Stay Longer, Live by the Ocean. A beautiful beachfront luxury house located in the serene coastal town of Ahungalla. Experience golden sands, private direct beach access, fully equipped kitchen facilities, and high speed WiFi. Perfect for long stays and remote working.',
    address: 'Ahungalla Beach Road, Ahungalla, Sri Lanka',
    latitude: 6.3094,
    longitude: 80.0278,
    googleMapsUrl: 'https://maps.app.goo.gl/pMC4zUotycCCD3m48',
    basePrice: 20.00, // Rs. 6,500 LKR base rate is configured as $20 USD.
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    amenities: [
      'Direct Beach Access',
      'High Speed Free WiFi (100 Mbps)',
      'Air Conditioning',
      'Fully Equipped Kitchen',
      'Private Veranda & Garden',
      'Washing Machine',
      'Refrigerator & Cooktop',
      'Smart TV with Netflix',
      '24/7 Security & Parking'
    ],
    rules: [
      'Check-in: After 2:00 PM',
      'Check-out: Before 11:00 AM',
      'No smoking inside the house',
      'Pets allowed on request',
      'No loud parties after 10:00 PM'
    ],
  };

  const property = await prisma.property.upsert({
    where: { slug: propertySlug },
    update: propertyData,
    create: {
      slug: propertySlug,
      ...propertyData
    }
  });
  const propertyId = property.id;
  console.log('Default property verified and basePrice updated to $20.00');

  // 3. Add seed images to the property if none exist
  const imageCount = await prisma.image.count({ where: { propertyId } });
  if (imageCount === 0) {
    await prisma.image.createMany({
      data: [
        {
          propertyId,
          url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
          alt: 'Ahungalla Beach House Ocean View',
          isMain: true,
          displayOrder: 0,
        },
        {
          propertyId,
          url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
          alt: 'Comfortable Bedroom Suite',
          isMain: false,
          displayOrder: 1,
        },
        {
          propertyId,
          url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
          alt: 'Fully Equipped Modern Kitchen',
          isMain: false,
          displayOrder: 2,
        },
        {
          propertyId,
          url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
          alt: 'Living and Dining Space',
          isMain: false,
          displayOrder: 3,
        }
      ],
    });
    console.log('Seed images added');
  }

  // 4. Add dynamic pricing rules (e.g., Seasonal Peak and Weekend multi)
  await prisma.pricingRule.deleteMany({ where: { propertyId } });
  await prisma.pricingRule.createMany({
    data: [
      {
        propertyId,
        name: 'Christmas & New Year Peak Season',
        type: RuleType.SEASONAL,
        startDate: new Date('2026-12-15T00:00:00Z'),
        endDate: new Date('2027-01-10T00:00:00Z'),
        multiplier: 1.5,
        isActive: true,
      }
    ],
  });
  console.log('Default pricing rules created (Weekend Markup removed)');

  // 5. Add default Long-stay Discount Tiers
  await prisma.discountTier.deleteMany({ where: { propertyId } });
  await prisma.discountTier.createMany({
    data: [
      {
        propertyId,
        name: 'Weekly Discount (8-14 Days)',
        minDays: 8,
        discountPct: 5.0, // Small discount (e.g. 5%)
        isActive: true,
      },
      {
        propertyId,
        name: 'Mid-stay Discount (15-29 Days)',
        minDays: 15,
        discountPct: 15.0, // Around 15-25% discount
        isActive: true,
      },
      {
        propertyId,
        name: 'Monthly Discount (30+ Days)',
        minDays: 30,
        discountPct: 20.0, // 20% discount makes it exactly $16 USD/night (Rs. 5,000 equivalent)
        isActive: true,
      }
    ],
  });
  console.log('Long-stay discount tiers updated to match client strategy');

  // 6. Add Dynamic Site Settings
  const settings = [
    { key: 'whatsapp_number', value: '+94774402546', description: 'WhatsApp contact number with country code', category: 'contact' },
    { key: 'phone_number', value: '0094774402546', description: 'Office phone number', category: 'contact' },
    { key: 'contact_email', value: 'hello@ahungallabeachhouse.com', description: 'Guest inquiries email address', category: 'contact' },
    { key: 'google_maps_url', value: 'https://maps.app.goo.gl/pMC4zUotycCCD3m48', description: 'Direct links for directions', category: 'general' },
    { key: 'site_title', value: 'Ahungalla Beach House', description: 'Website title branding', category: 'branding' },
    { key: 'site_tagline', value: 'Stay Longer. Live by the Ocean.', description: 'Website header tagline', category: 'branding' },
    { key: 'facebook_url', value: 'https://facebook.com/ahungallabeachhouse', description: 'Facebook page link', category: 'social' },
    { key: 'instagram_url', value: 'https://instagram.com/ahungallabeachhouse', description: 'Instagram profile link', category: 'social' }
  ];

  for (const s of settings) {
    await prisma.siteSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('Site settings seeded');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
