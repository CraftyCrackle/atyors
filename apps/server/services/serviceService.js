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

async function seed() {
  const existing = await ServiceCategory.findOne({ slug: 'trash-recycling' });
  if (existing) return { seeded: false, message: 'Seed data already exists' };

  const category = await ServiceCategory.create({
    name: 'Trash & Recycling',
    slug: 'trash-recycling',
    description: 'Curbside trash barrel put-out and bring-in services',
    icon: 'trash',
  });

  await ServiceType.insertMany([
    { categoryId: category._id, name: 'Put-Out Only', slug: 'put-out', description: 'We put your barrels out to the curb', basePrice: 1.50, sortOrder: 1 },
    { categoryId: category._id, name: 'Bring-In Only', slug: 'bring-in', description: 'We bring your barrels back in from the curb', basePrice: 1.50, sortOrder: 2 },
    { categoryId: category._id, name: 'Both (Put-Out & Bring-In)', slug: 'both', description: 'We take your barrels out and bring them back in', basePrice: 3.00, recurringPrice: 25.00, isDefault: true, sortOrder: 0 },
  ]);

  return { seeded: true, message: 'Seed data created' };
}

module.exports = { getCategories, getTypesByCategory, seed };
