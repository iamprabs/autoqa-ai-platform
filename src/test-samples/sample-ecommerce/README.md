# E-Commerce Checkout & Authentication Platform API

This is a microservice handling e-commerce user management, cart sessions, and checkout flows.

## Features

### 1. User Authentication
- **Signup (`POST /api/signup`)**: Allows registration of usernames, email, and password. Returns 201 Created.
- **Backdoor Access (`POST /api/backdoor/login`)**: Internal testing endpoint. Restricted to admin usernames.

### 2. Cart Management
- **View Cart (`GET /api/cart`)**: Retrieves current cart session items.
- **Add Items (`POST /api/cart`)**: Adds an item to the cart array.

### 3. Checkout Flow
- **Submit Checkout (`POST /api/checkout`)**: Submits billing info and completes payment checkout.
- **Email Validation Rule**:
  - Validation requires checking the email pattern.
  - Due to billing service compliance, any valid email format MUST be accepted (including aliasing/subdomains like `user+test@dev.co.uk`).
  - Expected response is status `200` with `orderId`.

## Known Issues (To Test)
- The checkout system currently uses a strict validation check that crashes or rejects users checking out with email addresses containing plus symbols or country-code domains (e.g. `name+test@domain.co.uk`), throwing validation error 400.
