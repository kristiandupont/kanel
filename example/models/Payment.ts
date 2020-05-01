// Automatically generated. Don't change this file manually.

import { CustomerId } from './Customer';
import { StaffId } from './Staff';
import { RentalId } from './Rental';

export type PaymentId = number & { __flavor?: 'payment' };

export default interface Payment {
  /** Primary key. Index: payment_pkey */
  paymentId: PaymentId;

  /** Index: idx_fk_customer_id */
  customerId: CustomerId;

  /** Index: idx_fk_staff_id */
  staffId: StaffId;

  /** Index: idx_fk_rental_id */
  rentalId: RentalId;

  amount: number;

  paymentDate: Date;
}

export interface PaymentInitializer {
  /**
   * Default value: nextval('payment_payment_id_seq'::regclass)
   * Primary key. Index: payment_pkey
  */
  paymentId?: PaymentId;

  /** Index: idx_fk_customer_id */
  customerId: CustomerId;

  /** Index: idx_fk_staff_id */
  staffId: StaffId;

  /** Index: idx_fk_rental_id */
  rentalId: RentalId;

  amount: number;

  paymentDate: Date;
}
