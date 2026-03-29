import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierParamsSchema,
  supplierCompareQuerySchema,
} from '../validators/supplier.validator';
import * as supplierController from '../controllers/supplier.controller';

const router = Router();

router.get('/', authenticate, supplierController.listSuppliers);
router.post('/', authenticate, validate(createSupplierSchema), supplierController.createSupplier);
router.get('/compare', authenticate, validate(supplierCompareQuerySchema, 'query'), supplierController.compareSuppliers);
router.put('/:id', authenticate, validate(supplierParamsSchema, 'params'), validate(updateSupplierSchema), supplierController.updateSupplier);
router.delete('/:id', authenticate, validate(supplierParamsSchema, 'params'), supplierController.deleteSupplier);

export default router;
