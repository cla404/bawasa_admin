/**
 * BAWASA Billing Logic Utility
 * Based on official BAWASA water bill form and payment scheme
 * 
 * Discount applies ONLY to registered voters based on years of membership:
 * - Year 1: 0% discount
 * - Year 2: 25% discount
 * - Year 3: 50% discount
 * - Year 4: 75% discount
 * - Year 5-6+: 100% discount (FREE)
 */

export interface BillingCalculation {
  consumption_10_or_below: number
  amount_10_or_below: number
  amount_10_or_below_with_discount: number
  consumption_over_10: number
  amount_over_10: number
  amount_current_billing: number
  discount_percentage: number
  years_of_service: number
  is_registered_voter: boolean
}

export interface ConsumerDiscountInfo {
  isRegisteredVoter: boolean
  accountCreatedAt: string | Date
}

export class BAWASABillingCalculator {
  // BAWASA Pricing Structure (based on official form)
  private static readonly RATE_PER_CUBIC_METER = 30 // 30 pesos per cubic meter (P300 for 10 cu.m)
  
  // Progressive discount scheme based on YEARS OF SERVICE (for registered voters only)
  // Year 1 = 0%, Year 2 = 25%, Year 3 = 50%, Year 4 = 75%, Year 5+ = 100% (FREE)
  private static readonly DISCOUNT_BY_YEAR_OF_SERVICE: Record<number, number> = {
    1: 0.00,    // Year 1: 0% discount
    2: 0.25,    // Year 2: 25% discount
    3: 0.50,    // Year 3: 50% discount
    4: 0.75,    // Year 4: 75% discount
    5: 1.00,    // Year 5: 100% discount (FREE)
    6: 1.00     // Year 6+: 100% discount (FREE)
  }

  /**
   * Calculate billing based on consumption and consumer info
   * Discount only applies to registered voters based on their years of service
   */
  static calculateBilling(
    consumption: number, 
    consumerInfo?: ConsumerDiscountInfo
  ): BillingCalculation {
    const isRegisteredVoter = consumerInfo?.isRegisteredVoter ?? false
    const yearsOfService = consumerInfo?.accountCreatedAt 
      ? this.calculateYearsOfService(consumerInfo.accountCreatedAt)
      : 1
    
    // Only registered voters get the discount
    const discountPercentage = isRegisteredVoter 
      ? this.getDiscountByYearsOfService(yearsOfService)
      : 0
    
    // Calculate consumption breakdown
    const consumption_10_or_below = Math.min(consumption, 10)
    const consumption_over_10 = Math.max(consumption - 10, 0)
    
    // Calculate amounts without discount
    const amount_10_or_below = consumption_10_or_below * this.RATE_PER_CUBIC_METER
    
    // Apply discount for first 10 cubic meters (only for registered voters)
    const amount_10_or_below_with_discount = amount_10_or_below * (1 - discountPercentage)
    
    // Amount for consumption over 10 cu.m (no discount applies)
    const amount_over_10 = consumption_over_10 * this.RATE_PER_CUBIC_METER
    
    // Total current billing (a + b from the form)
    const amount_current_billing = amount_10_or_below_with_discount + amount_over_10
    
    return {
      consumption_10_or_below,
      amount_10_or_below,
      amount_10_or_below_with_discount,
      consumption_over_10,
      amount_over_10,
      amount_current_billing,
      discount_percentage: discountPercentage,
      years_of_service: yearsOfService,
      is_registered_voter: isRegisteredVoter
    }
  }

  /**
   * Calculate years of service from account creation date
   */
  static calculateYearsOfService(accountCreatedAt: string | Date): number {
    const createdDate = new Date(accountCreatedAt)
    const now = new Date()
    
    // Calculate the difference in years
    let years = now.getFullYear() - createdDate.getFullYear()
    
    // Adjust if we haven't reached the anniversary yet this year
    const monthDiff = now.getMonth() - createdDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < createdDate.getDate())) {
      years--
    }
    
    // Year of service starts at 1 (first year = year 1)
    return Math.max(1, years + 1)
  }

  /**
   * Get discount percentage based on years of service
   */
  private static getDiscountByYearsOfService(yearsOfService: number): number {
    if (yearsOfService >= 5) return 1.00 // 100% discount for 5+ years
    return this.DISCOUNT_BY_YEAR_OF_SERVICE[yearsOfService] || 0.00
  }

  /**
   * Get the expected payment for 10 cubic meters based on consumer info
   */
  static getExpectedPaymentFor10CuM(consumerInfo?: ConsumerDiscountInfo): number {
    const result = this.calculateBilling(10, consumerInfo)
    return result.amount_current_billing
  }

  /**
   * Get discount info for display
   */
  static getDiscountInfo(consumerInfo: ConsumerDiscountInfo): {
    yearsOfService: number
    discountPercentage: number
    discountText: string
    isEligible: boolean
  } {
    const yearsOfService = this.calculateYearsOfService(consumerInfo.accountCreatedAt)
    const isEligible = consumerInfo.isRegisteredVoter
    const discountPercentage = isEligible ? this.getDiscountByYearsOfService(yearsOfService) : 0
    
    let discountText: string
    if (!isEligible) {
      discountText = 'No discount (not a registered voter)'
    } else if (discountPercentage === 1.00) {
      discountText = 'FREE (100% discount)'
    } else if (discountPercentage === 0) {
      discountText = 'No discount (Year 1)'
    } else {
      discountText = `${(discountPercentage * 100).toFixed(0)}% discount`
    }
    
    return {
      yearsOfService,
      discountPercentage,
      discountText,
      isEligible
    }
  }

  /**
   * Format billing summary for display
   */
  static formatBillingSummary(calculation: BillingCalculation): string {
    const { years_of_service, discount_percentage, amount_current_billing, is_registered_voter } = calculation
    
    if (!is_registered_voter) {
      return `No discount (not a registered voter) - Total: ₱${amount_current_billing.toFixed(2)}`
    }
    
    const discountText = discount_percentage === 1.00 
      ? 'FREE' 
      : discount_percentage === 0 
        ? 'No discount (Year 1)'
        : `${(discount_percentage * 100).toFixed(0)}% discount`
    
    return `Year ${years_of_service} of service: ${discountText} - Total: ₱${amount_current_billing.toFixed(2)}`
  }
}
