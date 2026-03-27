const ServiceCategory = require('../models/ServiceCategory');
const ServiceType = require('../models/ServiceType');

async function getCategories() {
  return ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1 });
}

async function getTypesByCategory(categorySlug) {
  const category = await ServiceCategory.findOne({ slug: categorySlug, isActive: true });
  if (!category) {
    const err = new Error('Category not found');
    err.status = 404;
    throw err;
  }
  const types = await ServiceType.find({ categoryId: category._id, isActive: true }).sort({ sortOrder: 1 });
  return { category, types };
}

async function getAllTypes() {
  const categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1 });
  const results = [];
  for (const cat of categories) {
    const types = await ServiceType.find({ categoryId: cat._id, isActive: true }).sort({ sortOrder: 1 });
    results.push({ category: cat, types });
  }
  return results;
}

async function seed() {
  // ── Trash & Recycling ──────────────────────────────────────────────────────
  const curbItemsDesc = 'We move items from your trash barrel storage area to the curb for pickup (up to 10 items, up to 25 lbs each)';
  let trashCat = await ServiceCategory.findOne({ slug: 'trash-recycling' });

  if (trashCat) {
    await ServiceType.updateOne({ slug: 'put-out' }, { $set: { name: 'Put Out Only', description: 'We take your barrels to the curb', basePrice: 2.5 } });
    await ServiceType.updateOne({ slug: 'bring-in' }, { $set: { name: 'Bring In Only', description: 'We bring your barrels back from the curb', basePrice: 2.5 } });
    await ServiceType.updateOne({ slug: 'both' }, { $set: { name: 'Both (Put Out and Bring In)', description: 'We take your barrels to the curb and bring them back', basePrice: 4.0, recurringPrice: 30.0 } });

    const curbExists = await ServiceType.findOne({ slug: 'curb-items' });
    if (!curbExists) {
      await ServiceType.create({ categoryId: trashCat._id, name: 'Curb Items', slug: 'curb-items', description: curbItemsDesc, basePrice: 2.0, sortOrder: 4 });
    } else {
      await ServiceType.updateOne({ slug: 'curb-items' }, { $set: { basePrice: 2.0, description: curbItemsDesc } });
    }
  } else {
    trashCat = await ServiceCategory.create({
      name: 'Trash & Recycling',
      slug: 'trash-recycling',
      description: 'Curbside trash barrel services',
      icon: 'trash',
      sortOrder: 0,
    });
    await ServiceType.insertMany([
      { categoryId: trashCat._id, name: 'Put Out Only', slug: 'put-out', description: 'We take your barrels to the curb', basePrice: 2.5, sortOrder: 1 },
      { categoryId: trashCat._id, name: 'Bring In Only', slug: 'bring-in', description: 'We bring your barrels back from the curb', basePrice: 2.5, sortOrder: 2 },
      { categoryId: trashCat._id, name: 'Both (Put Out and Bring In)', slug: 'both', description: 'We take your barrels to the curb and bring them back', basePrice: 4.0, recurringPrice: 30.0, isDefault: true, sortOrder: 0 },
      { categoryId: trashCat._id, name: 'Curb Items', slug: 'curb-items', description: curbItemsDesc, basePrice: 2.0, sortOrder: 4 },
    ]);
  }

  const barrelCleanExists = await ServiceType.findOne({ slug: 'barrel-cleaning' });
  if (!barrelCleanExists) {
    await ServiceType.create({
      categoryId: trashCat._id,
      name: 'Barrel Cleaning',
      slug: 'barrel-cleaning',
      description: 'Deep clean of your trash and recycling barrels, interior and exterior. Eliminates odors and buildup.',
      basePrice: 10,
      sortOrder: 5,
    });
  }

  // ── Cleaning (migrated from building-services) ─────────────────────────────
  const entranceDesc = 'Light cleaning for shared interior areas: vacuum & mop each floor, all staircases, plus optional front/back entrance cleaning';

  // Migrate slug if the old name exists, otherwise find or create the new one
  await ServiceCategory.updateOne(
    { slug: 'building-services' },
    { $set: { name: 'Cleaning', slug: 'cleaning', description: 'Cleaning services for multi-family buildings and residential properties', sortOrder: 1 } }
  );

  let cleaningCat = await ServiceCategory.findOne({ slug: 'cleaning' });
  if (!cleaningCat) {
    cleaningCat = await ServiceCategory.create({
      name: 'Cleaning',
      slug: 'cleaning',
      description: 'Cleaning services for multi-family buildings and residential properties',
      icon: 'building',
      sortOrder: 1,
    });
  }

  const ecExists = await ServiceType.findOne({ slug: 'entrance-cleaning' });
  if (!ecExists) {
    await ServiceType.create({ categoryId: cleaningCat._id, name: 'Entrance & Hallway Cleaning', slug: 'entrance-cleaning', description: entranceDesc, basePrice: 0, sortOrder: 0 });
  } else {
    await ServiceType.updateOne({ slug: 'entrance-cleaning' }, { $set: { name: 'Entrance & Hallway Cleaning', description: entranceDesc, categoryId: cleaningCat._id } });
  }

  const staircaseExists = await ServiceType.findOne({ slug: 'staircase-cleaning' });
  if (!staircaseExists) {
    await ServiceType.create({
      categoryId: cleaningCat._id,
      name: 'Public Staircase Cleaning',
      slug: 'staircase-cleaning',
      description: 'Standalone vacuum and mop service for shared staircases in multi-family buildings.',
      basePrice: 8,
      sortOrder: 1,
    });
  }

  const cleanoutExists = await ServiceType.findOne({ slug: 'property-cleanout' });
  if (!cleanoutExists) {
    await ServiceType.create({
      categoryId: cleaningCat._id,
      name: 'Property Cleanout',
      slug: 'property-cleanout',
      description: 'Full cleanout for vacant apartments and homes. Studio/1BR starts at $250; add $50 per bedroom above the first.',
      basePrice: 250,
      sortOrder: 2,
    });
  }

  // ── Outdoors ───────────────────────────────────────────────────────────────
  let outdoorsCat = await ServiceCategory.findOne({ slug: 'outdoors' });
  if (!outdoorsCat) {
    outdoorsCat = await ServiceCategory.create({
      name: 'Outdoors',
      slug: 'outdoors',
      description: 'Lawn care, leaf cleanup, and snow removal for any lot size',
      icon: 'outdoors',
      sortOrder: 2,
    });
  }

  const lawnExists = await ServiceType.findOne({ slug: 'lawn-care' });
  if (!lawnExists) {
    await ServiceType.create({
      categoryId: outdoorsCat._id,
      name: 'Lawn Care',
      slug: 'lawn-care',
      description: 'Mowing and basic lawn maintenance. Pricing by lot size: small (up to 2,000 sq ft) $35, medium (up to 5,000 sq ft) $55, large (5,000+ sq ft) $85.',
      basePrice: 35,
      seasonal: true,
      sortOrder: 0,
    });
  }

  const leavesExists = await ServiceType.findOne({ slug: 'leaf-cleanup' });
  if (!leavesExists) {
    await ServiceType.create({
      categoryId: outdoorsCat._id,
      name: 'Leaf Cleanup',
      slug: 'leaf-cleanup',
      description: 'Seasonal leaf blowing and bagging. Small lot $45, medium $65, large $95.',
      basePrice: 45,
      sortOrder: 1,
    });
  }

  const shovelExists = await ServiceType.findOne({ slug: 'snow-shoveling' });
  if (!shovelExists) {
    await ServiceType.create({
      categoryId: outdoorsCat._id,
      name: 'Snow Shoveling',
      slug: 'snow-shoveling',
      description: 'Shoveling and de-icing for driveways, walkways, and building entrances. Small lot $40, medium $60, large $90.',
      basePrice: 40,
      seasonal: true,
      sortOrder: 2,
    });
  }

  return { seeded: true, message: 'Seed data created' };
}

module.exports = { getCategories, getTypesByCategory, getAllTypes, seed };
