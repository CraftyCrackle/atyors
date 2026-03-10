#!/usr/bin/env node
const mongoose = require('mongoose');
const config = require('../apps/server/config');
const Address = require('../apps/server/models/Address');
const geocodeService = require('../apps/server/services/geocodeService');

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');

  const addresses = await Address.find({
    $or: [
      { 'location.coordinates': [0, 0] },
      { 'location.coordinates': { $exists: false } },
    ],
  });

  console.log(`Found ${addresses.length} address(es) needing geocoding`);

  let updated = 0;
  for (const addr of addresses) {
    const geo = await geocodeService.geocode(addr.street, addr.city, addr.state, addr.zip);
    if (geo) {
      addr.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
      await addr.save();
      updated++;
      console.log(`  Geocoded: ${addr.street}, ${addr.city} -> ${geo.lat}, ${geo.lng}`);
    } else {
      console.log(`  Failed: ${addr.street}, ${addr.city}`);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`Done. Updated ${updated}/${addresses.length} addresses.`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
