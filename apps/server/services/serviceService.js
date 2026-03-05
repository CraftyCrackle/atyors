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
  if (existing) {
    await ServiceType.updateOne({ slug: 'put-out' }, { $set: { name: 'Put Out Only', description: 'We take your barrels to the curb' } });
    await ServiceType.updateOne({ slug: 'bring-in' }, { $set: { name: 'Bring In Only', description: 'We bring your barrels back from the curb' } });
    await ServiceType.updateOne({ slug: 'both' }, { $set: { name: 'Both (Put Out and Bring In)', description: 'We take your barrels to the curb and bring them back' } });
    return { seeded: false, message: 'Names updated' };
  }

  const category = await ServiceCategory.create({
    name: 'Trash & Recycling',
    slug: 'trash-recycling',
    description: 'Curbside trash barrel services',
    icon: 'trash',
  });

  await ServiceType.insertMany([
    { categoryId: category._id, name: 'Put Out Only', slug: 'put-out', description: 'We take your barrels to the curb', basePrice: 1.50, sortOrder: 1 },
    { categoryId: category._id, name: 'Bring In Only', slug: 'bring-in', description: 'We bring your barrels back from the curb', basePrice: 1.50, sortOrder: 2 },
    { categoryId: category._id, name: 'Both (Put Out and Bring In)', slug: 'both', description: 'We take your barrels to the curb and bring them back', basePrice: 3.00, recurringPrice: 25.00, isDefault: true, sortOrder: 0 },
  ]);

  return { seeded: true, message: 'Seed data created' };
}

module.exports = { getCategories, getTypesByCategory, seed };
