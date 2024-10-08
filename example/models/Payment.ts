// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { customerId, type CustomerId } from './Customer';
import { staffId, type StaffId } from './Staff';
import { rentalId, type RentalId } from './Rental';
import { z } from 'zod';

/** Identifier type for payment */
export type PaymentId = number & { __flavor?: 'PaymentId' };

/** Represents the table public.payment */
export default interface Payment {
  /** Database type: pg_catalog.int4 */
  payment_id: PaymentId;

  /** Database type: pg_catalog.int2 */
  customer_id: CustomerId;

  /** Database type: pg_catalog.int2 */
  staff_id: StaffId;

  /** Database type: pg_catalog.int4 */
  rental_id: RentalId;

  /** Database type: pg_catalog.numeric */
  amount: string;

  /** Database type: pg_catalog.timestamp */
  payment_date: Date;
}

/** Represents the initializer for the table public.payment */
export interface PaymentInitializer {
  /**
   * Database type: pg_catalog.int4
   * Default value: nextval('payment_payment_id_seq'::regclass)
   */
  payment_id?: PaymentId;

  /** Database type: pg_catalog.int2 */
  customer_id: CustomerId;

  /** Database type: pg_catalog.int2 */
  staff_id: StaffId;

  /** Database type: pg_catalog.int4 */
  rental_id: RentalId;

  /** Database type: pg_catalog.numeric */
  amount: string;

  /** Database type: pg_catalog.timestamp */
  payment_date: Date;
}

/** Represents the mutator for the table public.payment */
export interface PaymentMutator {
  /** Database type: pg_catalog.int4 */
  payment_id?: PaymentId;

  /** Database type: pg_catalog.int2 */
  customer_id?: CustomerId;

  /** Database type: pg_catalog.int2 */
  staff_id?: StaffId;

  /** Database type: pg_catalog.int4 */
  rental_id?: RentalId;

  /** Database type: pg_catalog.numeric */
  amount?: string;

  /** Database type: pg_catalog.timestamp */
  payment_date?: Date;
}

export const paymentId = z.number() as unknown as z.Schema<PaymentId>;

export const payment = z.object({
  payment_id: paymentId,
  customer_id: customerId,
  staff_id: staffId,
  rental_id: rentalId,
  amount: z.string(),
  payment_date: z.date(),
}) as unknown as z.Schema<Payment>;

export const paymentInitializer = z.object({
  payment_id: paymentId.optional(),
  customer_id: customerId,
  staff_id: staffId,
  rental_id: rentalId,
  amount: z.string(),
  payment_date: z.date(),
}) as unknown as z.Schema<PaymentInitializer>;

export const paymentMutator = z.object({
  payment_id: paymentId.optional(),
  customer_id: customerId.optional(),
  staff_id: staffId.optional(),
  rental_id: rentalId.optional(),
  amount: z.string().optional(),
  payment_date: z.date().optional(),
}) as unknown as z.Schema<PaymentMutator>;
