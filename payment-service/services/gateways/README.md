# Payment Gateway Abstraction Layer

This directory contains the payment gateway abstraction layer that enables multi-gateway support with automatic failover and health monitoring.

## Architecture

### GatewayInterface.js
Base abstract class that defines the contract all payment gateway adapters must implement:
- `createOrder(orderData)` - Create a payment order
- `verifyPayment(verificationData)` - Verify payment signature/callback
- `fetchPaymentDetails(paymentId)` - Fetch payment details from gateway
- `healthCheck()` - Check gateway availability and health

### RazorpayGateway.js
Razorpay payment gateway adapter implementing the GatewayInterface.

## Configuration

Gateways are configured via environment variables:

```bash
# Razorpay Gateway
GATEWAY_RAZORPAY_ENABLED=true
GATEWAY_RAZORPAY_PRIORITY=1
GATEWAY_RAZORPAY_KEY_ID=rzp_test_xxx
GATEWAY_RAZORPAY_KEY_SECRET=xxx
GATEWAY_RAZORPAY_TIMEOUT=30000
```

### Backward Compatibility

The system also supports legacy configuration format:
```bash
PAYMENTS_ENABLED=true
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

## Usage Example

```javascript
const { loadGatewayConfigs } = require('../config/gateways');

// Load all configured gateways
const { gateways, errors } = loadGatewayConfigs();

if (gateways.length === 0) {
  console.error('No payment gateways available');
  return;
}

// Get the highest priority gateway
const primaryGateway = gateways[0];

// Create an order
const order = await primaryGateway.createOrder({
  amount: 50000, // 500.00 INR in paise
  currency: 'INR',
  receipt: 'receipt_123',
  notes: { userId: 'user_123' }
});

// Verify payment
const isValid = await primaryGateway.verifyPayment({
  orderId: order.id,
  paymentId: 'pay_xxx',
  signature: 'signature_xxx'
});

// Check gateway health
const health = await primaryGateway.healthCheck();
console.log('Gateway available:', health.available);
```

## Adding New Gateways

To add a new payment gateway:

1. Create a new adapter class extending `GatewayInterface`:
```javascript
const GatewayInterface = require('./GatewayInterface');

class StripeGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    // Initialize Stripe client
  }

  async createOrder(orderData) {
    // Implement Stripe order creation
  }

  async verifyPayment(verificationData) {
    // Implement Stripe payment verification
  }

  async fetchPaymentDetails(paymentId) {
    // Implement Stripe payment fetch
  }

  async healthCheck() {
    // Implement Stripe health check
  }
}

module.exports = StripeGateway;
```

2. Register the gateway in `config/gateways.js`:
```javascript
// Add to supportedGateways array
const supportedGateways = ['razorpay', 'stripe'];

// Add to createGatewayInstance switch
case 'stripe':
  return new StripeGateway(config);
```

3. Configure via environment variables:
```bash
GATEWAY_STRIPE_ENABLED=true
GATEWAY_STRIPE_PRIORITY=2
GATEWAY_STRIPE_KEY_ID=sk_test_xxx
GATEWAY_STRIPE_KEY_SECRET=xxx
```

## Requirements Mapping

- **Requirement 4.1**: Gateway abstraction with standard interface
- **Requirement 14.1**: Load configurations from environment variables
- **Requirement 14.2**: Support priority ordering and enable/disable flags
- **Requirement 14.3**: Validate credentials on configuration load
- **Requirement 14.4**: Log errors and skip invalid gateways
