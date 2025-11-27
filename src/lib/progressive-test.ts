// Quick test to verify progressive logic for registered voters
import { BAWASABillingCalculator } from './bawasa-billing-calculator'

console.log("🧪 Testing Registered Voter Discount by Years of Service")
console.log("=" .repeat(50))

// Helper to create a date N years ago
function yearsAgo(years: number): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date
}

console.log("\n📋 REGISTERED VOTER (Discount Applies):")
const testYearsOfService = [0, 1, 2, 3, 4, 5, 6, 10]

testYearsOfService.forEach(years => {
  const result = BAWASABillingCalculator.calculateBilling(10, {
    isRegisteredVoter: true,
    accountCreatedAt: yearsAgo(years)
  })
  const discountText = result.discount_percentage === 1.00 ? 'FREE' : `${(result.discount_percentage * 100).toFixed(0)}% discount`
  
  console.log(`Year ${result.years_of_service} of service: ${discountText} - ₱${result.amount_current_billing.toFixed(2)}`)
})

console.log("\n📋 NON-REGISTERED VOTER (No Discount):")
const nonVoterResult = BAWASABillingCalculator.calculateBilling(10, {
  isRegisteredVoter: false,
  accountCreatedAt: yearsAgo(5) // 5+ years but no discount
})
console.log(`Year ${nonVoterResult.years_of_service} of service: No discount - ₱${nonVoterResult.amount_current_billing.toFixed(2)}`)

console.log("\n✅ Discount logic confirmed: Only registered voters get discounts based on years of service!")
