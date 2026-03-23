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
  const existing = await ServiceCategory.findOne({ slug: 'trash-recycling' });
  const curbItemsDesc = 'We move items from your trash barrel storage area to the curb for pickup (up to 10 items, up to 25 lbs each)';

  if (existing) {
    await ServiceType.updateOne({ slug: 'put-out' }, { $set: { name: 'Put Out Only', description: 'We take your barrels to the curb', basePrice: 2.5 } });
    await ServiceType.updateOne({ slug: 'bring-in' }, { $set: { name: 'Bring In Only', description: 'We bring your barrels back from the curb', basePrice: 2.5 } });
    await ServiceType.updateOne({ slug: 'both' }, { $set: { name: 'Both (Put Out and Bring In)', description: 'We take your barrels to the curb and bring them back', basePrice: 4.0, recurringPrice: 30.0 } });

    const curbExists = await ServiceType.findOne({ slug: 'curb-items' });
    if (!curbExists) {
      await ServiceType.create({
        categoryId: existing._id,
        name: 'Curb Items',
        slug: 'curb-items',
        description: curbItemsDesc,
        basePrice: 2.0,
        sortOrder: 4,
      });
    } else {
      await ServiceType.updateOne({ slug: 'curb-items' }, { $set: { basePrice: 2.0, description: curbItemsDesc } });
    }
  } else {
    const category = await ServiceCategory.create({
      name: 'Trash & Recycling',
      slug: 'trash-recycling',
      description: 'Curbside trash barrel services',
      icon: 'trash',
    });

    await ServiceType.insertMany([
      { categoryId: category._id, name: 'Put Out Only', slug: 'put-out', description: 'We take your barrels to the curb', basePrice: 2.5, sortOrder: 1 },
      { categoryId: category._id, name: 'Bring In Only', slug: 'bring-in', description: 'We bring your barrels back from the curb', basePrice: 2.5, sortOrder: 2 },
      { categoryId: category._id, name: 'Both (Put Out and Bring In)', slug: 'both', description: 'We take your barrels to the curb and bring them back', basePrice: 4.0, recurringPrice: 30.0, isDefault: true, sortOrder: 0 },
      { categoryId: category._id, name: 'Curb Items', slug: 'curb-items', description: curbItemsDesc, basePrice: 2.0, sortOrder: 4 },
    ]);
  }

  // Building services category
  const buildingCat = await ServiceCategory.findOne({ slug: 'building-services' });
  const entranceDesc = 'Light cleaning for shared interior areas: vacuum & mop each floor, all staircases, plus optional front/back entrance cleaning';

  if (!buildingCat) {
    const newCat = await ServiceCategory.create({
      name: 'Building Services',
      slug: 'building-services',
      description: 'Interior cleaning services for multi-family buildings',
      icon: 'building',
      sortOrder: 1,
    });
    await ServiceType.create({
      categoryId: newCat._id,
      name: 'Multi-Family Entrance Cleaning',
      slug: 'entrance-cleaning',
      description: entranceDesc,
      basePrice: 0,
      sortOrder: 0,
    });
  } else {
    const ecExists = await ServiceType.findOne({ slug: 'entrance-cleaning' });
    if (!ecExists) {
      await ServiceType.create({
        categoryId: buildingCat._id,
        name: 'Multi-Family Entrance Cleaning',
        slug: 'entrance-cleaning',
        description: entranceDesc,
        basePrice: 0,
        sortOrder: 0,
      });
    } else {
      await ServiceType.updateOne({ slug: 'entrance-cleaning' }, { $set: { name: 'Multi-Family Entrance Cleaning', description: entranceDesc } });
    }
  }

  return { seeded: true, message: 'Seed data created' };
}

module.exports = { getCategories, getTypesByCategory, getAllTypes, seed };
