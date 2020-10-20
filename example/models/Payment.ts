// Automatically generated. Don't change this file manually.
// Name: payment

import { CustomerId } from './Customer';
import { StaffId } from './Staff';
import { RentalId } from './Rental';

export type PaymentId = number & { __flavor?: 'payment' };

export default interface Payment {
  /** Primary key. Index: payment_pkey */
  payment_id: PaymentId;

  /** Index: idx_fk_customer_id */
  customer_id: CustomerId;

  /** Index: idx_fk_staff_id */
  staff_id: StaffId;

  /** Index: idx_fk_rental_id */
  rental_id: RentalId;

  amount: number;

  payment_date: Date;
}

export interface PaymentInitializer {
  /**
   * Default value: nextval('payment_payment_id_seq'::regclass)
   * Primary key. Index: payment_pkey
   */
  payment_id?: PaymentId;

  /** Index: idx_fk_customer_id */
  customer_id: CustomerId;

  /** Index: idx_fk_staff_id */
  staff_id: StaffId;

  /** Index: idx_fk_rental_id */
  rental_id: RentalId;

  amount: number;

  payment_date: Date;
}
