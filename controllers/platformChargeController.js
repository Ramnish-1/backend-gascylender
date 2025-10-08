const PlatformCharge = require('../models/PlatformCharge');
const { ErrorHandler } = require('../utils/errorHandler');

// Add or Update Platform Charge
exports.addOrUpdatePlatformCharge = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount === null || amount < 0) {
      throw new ErrorHandler('Valid amount is required', 400);
    }

    // Find active platform charge
    let platformCharge = await PlatformCharge.findOne({ where: { isActive: true } });

    if (platformCharge) {
      // Update existing
      platformCharge.amount = amount;
      await platformCharge.save();
    } else {
      // Create new
      platformCharge = await PlatformCharge.create({
        amount: amount,
        isActive: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Platform charge saved successfully',
      data: {
        id: platformCharge.id,
        amount: platformCharge.amount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Platform Charge
exports.getPlatformCharge = async (req, res, next) => {
  try {
    const platformCharge = await PlatformCharge.findOne({ where: { isActive: true } });

    if (!platformCharge) {
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          amount: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: platformCharge.id,
        amount: platformCharge.amount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Platform Charge
exports.deletePlatformCharge = async (req, res, next) => {
  try {
    const platformCharge = await PlatformCharge.findOne({ where: { isActive: true } });

    if (!platformCharge) {
      throw new ErrorHandler('No active platform charge found', 404);
    }

    // Soft delete
    platformCharge.isActive = false;
    await platformCharge.save();

    res.status(200).json({
      success: true,
      message: 'Platform charge deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
