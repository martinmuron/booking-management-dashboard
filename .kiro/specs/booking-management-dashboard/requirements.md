# Requirements Document

## Introduction

This feature implements a comprehensive booking management web application that integrates with HostAway booking software to manage property reservations, guest check-ins, tourist tax collection via Stripe, and virtual key distribution through NUKI. The system provides a dashboard for property managers and a streamlined check-in experience for guests with automatic email notifications and payment processing.

## Requirements

### Requirement 1

**User Story:** As a property manager, I want to view all bookings in a centralized dashboard, so that I can monitor reservation status and guest information efficiently.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the system SHALL display all bookings with property name, guest leader name, check-in date, checkout date, and number of guests
2. WHEN viewing bookings THEN the system SHALL show booking status indicating tax payment, guest registration completion, and virtual key distribution status
3. WHEN accessing booking details THEN the system SHALL display all guest information including names, nationality, birth date, sex, residence country, contact details
4. IF guest information is missing THEN the system SHALL clearly indicate which guests have incomplete registration
5. WHEN viewing a booking THEN the system SHALL show tax payment status and amount paid
6. WHEN filtering is applied THEN the system SHALL allow filtering by booking status, check-in date, number of guests, and property

### Requirement 2

**User Story:** As a property manager, I want to automatically generate unique check-in links for each reservation, so that guests can complete their registration and payment online.

#### Acceptance Criteria

1. WHEN a reservation is created in HostAway THEN the system SHALL automatically generate a unique check-in link for that reservation
2. WHEN generating links THEN each link SHALL be unique and tied to a specific reservation
3. WHEN the link is accessed THEN it SHALL display booking dates, check-in, check-out, and property information
4. WHEN the link is generated THEN the system SHALL automatically send it to the guest leader via email
5. WHEN sending emails THEN the system SHALL include all necessary booking information and instructions

### Requirement 3

**User Story:** As a guest, I want to complete online check-in through a mobile-friendly interface, so that I can register all guests and pay tourist tax before arrival.

#### Acceptance Criteria

1. WHEN accessing the check-in link THEN the system SHALL display a mobile-optimized, minimalistic interface resembling an iPhone app
2. WHEN starting check-in THEN the system SHALL detect the number of guests from the reservation and require information for each guest
3. WHEN filling guest information THEN the system SHALL collect nationality, name, surname, birth date, sex, residence country, contact email, and contact phone number for each guest
4. WHEN all information is complete THEN the system SHALL require a digital signature from the guest leader
5. WHEN signature is provided THEN the system SHALL proceed to payment processing
6. IF guests are 18 or older THEN the system SHALL calculate tourist tax at 50 crowns per day per adult guest
7. WHEN payment is required THEN the system SHALL process payment through Stripe integration

### Requirement 4

**User Story:** As a guest, I want to receive virtual keys automatically after completing check-in and payment, so that I can access the property without manual intervention.

#### Acceptance Criteria

1. WHEN check-in and payment are completed THEN the system SHALL automatically generate NUKI virtual keys
2. WHEN generating keys THEN the system SHALL provide main entrance, luggage room, laundry room, and specific room number keys
3. WHEN keys are generated THEN main entrance, luggage room, and laundry room keys SHALL be the same for all reservations
4. WHEN generating room keys THEN the system SHALL use the specific room number from the reservation
5. WHEN keys are ready THEN the system SHALL deliver them to the guest via email or the check-in interface

### Requirement 5

**User Story:** As a system administrator, I want the application to integrate with HostAway, Stripe, and NUKI APIs, so that data flows automatically between systems.

#### Acceptance Criteria

1. WHEN integrating with HostAway THEN the system SHALL use API credentials (ID: 105054, Key: 1d9b076200d3293be0a975bbf8eff3e3b07248c293fa02e50028240a5b3e5678) to fetch booking data
2. WHEN processing payments THEN the system SHALL integrate with Stripe SDK for secure payment processing
3. WHEN generating virtual keys THEN the system SHALL use NUKI API (Key: 46859bffad5f36d6b17d714d36a1e349de5ee4fd472f5682338a02299059fbe4b9cc1e06022a8398) to create and distribute keys
4. WHEN APIs are called THEN the system SHALL handle errors gracefully and provide appropriate user feedback
5. WHEN data is synchronized THEN the system SHALL maintain consistency between HostAway bookings and internal records

### Requirement 6

**User Story:** As a property manager, I want to monitor tax collection and compliance, so that I can ensure all tourist tax obligations are met.

#### Acceptance Criteria

1. WHEN viewing bookings THEN the system SHALL display total tax owed based on 50 crowns per adult guest per day
2. WHEN tax is paid THEN the system SHALL record payment amount, date, and Stripe transaction details
3. WHEN generating reports THEN the system SHALL provide tax collection summaries by date range and property
4. IF tax is unpaid THEN the system SHALL clearly indicate outstanding amounts
5. WHEN tax calculations are made THEN the system SHALL only include guests 18 years or older

### Requirement 7

**User Story:** As a guest, I want to receive clear communication throughout the check-in process, so that I understand what information is required and what happens next.

#### Acceptance Criteria

1. WHEN receiving the check-in email THEN it SHALL include booking details, check-in instructions, and the unique link
2. WHEN using the check-in interface THEN the system SHALL provide clear progress indicators and instructions
3. WHEN errors occur THEN the system SHALL display helpful error messages and guidance
4. WHEN check-in is complete THEN the system SHALL provide confirmation with virtual key delivery information
5. WHEN payment is processed THEN the system SHALL send payment confirmation and receipt