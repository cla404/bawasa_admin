/**
 * Test file to verify BAWASA billing logic correctness
 * Run this to validate calculations against official BAWASA standards
 * 
 * Discount applies ONLY to registered voters based on years of service:
 * - Year 1: 0% discount
 * - Year 2: 25% discount
 * - Year 3: 50% discount
 * - Year 4: 75% discount
 * - Year 5-6+: 100% discount (FREE)
 */

import { BAWASABillingCalculator, ConsumerDiscountInfo } from './bawasa-billing-calculator'

// Helper to create a date N years ago
function yearsAgo(years: number): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date
}

// Test cases based on BAWASA official form and payment scheme
// Discount ONLY applies to registered voters based on years of service
const testCases = [
  {
    name: "10 cu.m - Not a registered voter (no discount)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: false, accountCreatedAt: yearsAgo(3) },
    expectedPayment: 300.00, // P300 - no discount
    description: "Non-registered voters pay full price"
  },
  {
    name: "10 cu.m - Registered voter, Year 1 (0% discount)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: new Date() },
    expectedPayment: 300.00, // P300 * (1 - 0) = P300
    description: "Year 1 registered voter: 0% discount"
  },
  {
    name: "10 cu.m - Registered voter, Year 2 (25% discount)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: yearsAgo(1) },
    expectedPayment: 225.00, // P300 * (1 - 0.25) = P225
    description: "Year 2 registered voter: 25% discount"
  },
  {
    name: "10 cu.m - Registered voter, Year 3 (50% discount)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: yearsAgo(2) },
    expectedPayment: 150.00, // P300 * (1 - 0.50) = P150
    description: "Year 3 registered voter: 50% discount"
  },
  {
    name: "10 cu.m - Registered voter, Year 4 (75% discount)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: yearsAgo(3) },
    expectedPayment: 75.00, // P300 * (1 - 0.75) = P75
    description: "Year 4 registered voter: 75% discount"
  },
  {
    name: "10 cu.m - Registered voter, Year 5+ (100% discount - FREE)",
    consumption: 10,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: yearsAgo(4) },
    expectedPayment: 0.00, // P300 * (1 - 1.00) = P0 (FREE)
    description: "Year 5+ registered voter: FREE"
  },
  {
    name: "15 cu.m - Registered voter, Year 2 (25% discount on first 10)",
    consumption: 15,
    consumerInfo: { isRegisteredVoter: true, accountCreatedAt: yearsAgo(1) },
    expectedPayment: 375.00, // (10 * 30 * 0.75) + (5 * 30) = 225 + 150 = 375
    description: "First 10 cu.m with 25% discount + 5 cu.m at full rate"
  },
  {
    name: "15 cu.m - Non-registered voter (no discount)",
    consumption: 15,
    consumerInfo: { isRegisteredVoter: false, accountCreatedAt: yearsAgo(5) },
    expectedPayment: 450.00, // (10 * 30) + (5 * 30) = 300 + 150 = 450
    description: "Non-registered voter pays full price for all consumption"
  }
]

export function runBillingTests() {
  console.log("🧪 Running BAWASA Billing Logic Tests (Registered Voter Discount)")
  console.log("=" .repeat(50))
  
  let passedTests = 0
  const totalTests = testCases.length
  
  testCases.forEach((testCase, index) => {
    const result = BAWASABillingCalculator.calculateBilling(testCase.consumption, testCase.consumerInfo)
    const actualPayment = result.amount_current_billing
    const isCorrect = Math.abs(actualPayment - testCase.expectedPayment) < 0.01
    
    console.log(`\nTest ${index + 1}: ${testCase.name}`)
    console.log(`Description: ${testCase.description}`)
    console.log(`Registered Voter: ${testCase.consumerInfo.isRegisteredVoter ? 'Yes' : 'No'}`)
    console.log(`Years of Service: ${result.years_of_service}`)
    console.log(`Expected: ₱${testCase.expectedPayment.toFixed(2)}`)
    console.log(`Actual: ₱${actualPayment.toFixed(2)}`)
    console.log(`Discount Applied: ${(result.discount_percentage * 100).toFixed(0)}%`)
    console.log(`Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`)
    
    if (isCorrect) {
      passedTests++
    } else {
      console.log(`❌ Calculation breakdown:`)
      console.log(`  - Consumption 10 or below: ${result.consumption_10_or_below} cu.m`)
      console.log(`  - Amount 10 or below: ₱${result.amount_10_or_below.toFixed(2)}`)
      console.log(`  - Amount with discount: ₱${result.amount_10_or_below_with_discount.toFixed(2)}`)
      console.log(`  - Consumption over 10: ${result.consumption_over_10} cu.m`)
      console.log(`  - Amount over 10: ₱${result.amount_over_10.toFixed(2)}`)
    }
  })
  
  console.log("\n" + "=" .repeat(50))
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Billing logic is correct.")
  } else {
    console.log("⚠️  Some tests failed. Please review the billing logic.")
  }
  
  return passedTests === totalTests
}

// Additional validation tests
export function validateAgainstBAWASAForm() {
  console.log("\n🔍 Validating against BAWASA Official Form Structure")
  console.log("=" .repeat(50))
  
  // Test the exact scenario: Year 2 registered voter (25% discount)
  const formTest = BAWASABillingCalculator.calculateBilling(10, {
    isRegisteredVoter: true,
    accountCreatedAt: yearsAgo(1) // Year 2 = 25% discount
  })
  
  console.log("BAWASA Form Validation (10 cu.m, Year 2 Registered Voter):")
  console.log(`✅ Rate per cubic meter: ₱30.00`)
  console.log(`✅ Base amount (10 cu.m): ₱${formTest.amount_10_or_below.toFixed(2)}`)
  console.log(`✅ Discount applied: ${(formTest.discount_percentage * 100).toFixed(0)}%`)
  console.log(`✅ Final amount: ₱${formTest.amount_current_billing.toFixed(2)}`)
  console.log(`✅ Expected from form: ₱225.00 (25% discount)`)
  
  const isFormCorrect = Math.abs(formTest.amount_current_billing - 225.00) < 0.01
  console.log(`Status: ${isFormCorrect ? '✅ MATCHES FORM' : '❌ DOES NOT MATCH FORM'}`)
  
  return isFormCorrect
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runBillingTests()
  validateAgainstBAWASAForm()
}
