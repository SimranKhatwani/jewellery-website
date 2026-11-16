import { Address } from '../models/Address.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * List saved addresses for authenticated customer
 */
export const listCustomerAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new saved address for customer
 */
export const createCustomerAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (!name || !phone || !addressLine1 || !city || !state || !postalCode) {
      throw new BadRequestError('Required address fields missing: name, phone, addressLine1, city, state, postalCode.');
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length !== 10) {
      throw new BadRequestError('Contact phone must be a valid 10-digit number.');
    }

    // Check if this is the customer's first address; if so, make it default automatically
    const existingCount = await Address.countDocuments({ userId });
    const shouldBeDefault = isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      userId,
      name: name.trim(),
      phone: cleanPhone,
      addressLine1: addressLine1.trim(),
      addressLine2: (addressLine2 || '').trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: (country || 'India').trim(),
      addressType: addressType || 'home',
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      address,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing customer address
 */
export const updateCustomerAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      throw new NotFoundError('Address not found or does not belong to your account.');
    }

    const updates = { ...req.body };
    delete updates.userId; // Prevent transferring address to another user

    if (updates.phone !== undefined) {
      let cleanPhone = String(updates.phone).replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      }
      if (cleanPhone.length !== 10) {
        throw new BadRequestError('Contact phone must be a valid 10-digit number.');
      }
      updates.phone = cleanPhone;
    }

    if (updates.isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    Object.assign(address, updates);
    await address.save();

    res.json({
      success: true,
      message: 'Address updated successfully.',
      address,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a customer address
 */
export const deleteCustomerAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const address = await Address.findOneAndDelete({ _id: addressId, userId });
    if (!address) {
      throw new NotFoundError('Address not found or does not belong to your account.');
    }

    // If deleted address was default, promote another address to default
    if (address.isDefault) {
      const remaining = await Address.findOne({ userId }).sort({ createdAt: -1 });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    res.json({
      success: true,
      message: 'Address deleted successfully.',
      id: address._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set an address as default
 */
export const setDefaultCustomerAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId } = req.params;

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      throw new NotFoundError('Address not found.');
    }

    await Address.updateMany({ userId }, { $set: { isDefault: false } });
    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: 'Default address updated.',
      address,
    });
  } catch (error) {
    next(error);
  }
};
