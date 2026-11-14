import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import * as customerController from '../controllers/customer.controller.js';
import * as addressController from '../controllers/address.controller.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// All customer routes require authenticated user session
router.use(authenticateUser);

/**
 * Customer Profile Endpoints
 */
router.get('/me', customerController.getCustomerProfile);
router.put('/me', customerController.updateCustomerProfile);
router.patch('/me', customerController.updateCustomerProfile);
router.post('/me/change-password', customerController.changeCustomerPassword);

// Aliases for profile routes
router.get('/profile', customerController.getCustomerProfile);
router.patch('/profile', customerController.updateCustomerProfile);
router.put('/profile', customerController.updateCustomerProfile);
router.post('/change-password', customerController.changeCustomerPassword);

/**
 * Customer Address Management Endpoints
 */
router.get('/me/addresses', addressController.listCustomerAddresses);
router.post('/me/addresses', addressController.createCustomerAddress);
router.put('/me/addresses/:addressId', addressController.updateCustomerAddress);
router.delete('/me/addresses/:addressId', addressController.deleteCustomerAddress);
router.patch('/me/addresses/:addressId/default', addressController.setDefaultCustomerAddress);

// Aliases for address routes
router.get('/addresses', addressController.listCustomerAddresses);
router.post('/addresses', addressController.createCustomerAddress);
router.put('/addresses/:addressId', addressController.updateCustomerAddress);
router.delete('/addresses/:addressId', addressController.deleteCustomerAddress);

/**
 * Customer Order History & Cancellation Endpoints
 */
router.get('/me/orders', orderController.getCustomerOrders);
router.get('/me/orders/:orderId', orderController.getCustomerOrderDetails);
router.post('/me/orders/:orderId/cancel', orderController.cancelCustomerOrder);

// Aliases for orders
router.get('/orders', orderController.getCustomerOrders);
router.get('/orders/:orderId', orderController.getCustomerOrderDetails);
router.post('/orders/:orderId/cancel', orderController.cancelCustomerOrder);

export default router;
