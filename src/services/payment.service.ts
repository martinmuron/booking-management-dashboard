import { prisma } from '@/lib/database';
import { Payment } from '@/types';

export class PaymentService {
  // Create a new payment record
  static async createPayment(data: {
    bookingId: string;
    stripePaymentIntentId: string;
    amount: number;
    currency?: string;
  }): Promise<Payment> {
    return await prisma.payment.create({
      data: {
        ...data,
        currency: data.currency || 'CZK',
      },
    });
  }

  // Get payment by Stripe payment ID
  static async getPaymentByStripeId(stripePaymentIntentId: string): Promise<Payment | null> {
    return await prisma.payment.findUnique({
      where: { stripePaymentIntentId },
    });
  }

  // Get payments for a booking
  static async getPaymentsByBookingId(bookingId: string): Promise<Payment[]> {
    return await prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update payment status
  static async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: string,
    paidAt?: Date
  ): Promise<Payment> {
    return await prisma.payment.update({
      where: { stripePaymentIntentId },
      data: {
        status,
        paidAt: status === 'paid' ? paidAt || new Date() : null,
      },
    });
  }

  // Check if booking has successful payment
  static async hasSuccessfulPayment(bookingId: string): Promise<boolean> {
    const count = await prisma.payment.count({
      where: {
        bookingId,
        status: 'paid',
      },
    });
    
    return count > 0;
  }

  // Get total amount paid for a booking
  static async getTotalPaidAmount(bookingId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        bookingId,
        status: 'paid',
      },
      _sum: {
        amount: true,
      },
    });
    
    return result._sum.amount || 0;
  }

  // Get pending payments
  static async getPendingPayments(): Promise<Payment[]> {
    return await prisma.payment.findMany({
      where: {
        status: {
          in: ['pending', 'processing'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Delete payment
  static async deletePayment(id: string): Promise<void> {
    await prisma.payment.delete({
      where: { id },
    });
  }

  // Get payment statistics
  static async getPaymentStats(dateRange?: { from: Date; to: Date }) {
    const where = dateRange
      ? {
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        }
      : {};

    const [totalPayments, successfulPayments, totalAmount] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.count({
        where: { ...where, status: 'paid' },
      }),
      prisma.payment.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      successfulPayments,
      totalAmount: totalAmount._sum.amount || 0,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
    };
  }
}