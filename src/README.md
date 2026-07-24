# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities with automatic ticket generation
- **QR Code Check-In**: Generate unique QR codes for event tickets, track attendance with QR scanning
- Unregister from activities

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity and receive a ticket with QR code           |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister from an activity                                      |
| GET    | `/activities/{activity_name}/ticket/{ticket_id}`                 | Get ticket details including QR code image                          |
| POST   | `/activities/{activity_name}/checkin?ticket_id={ticket_id}`       | Check in to an activity using a ticket QR code                      |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up
   - Registrations dictionary (ticket_id -> registration data)

2. **Registrations** - Uses UUID ticket_id as identifier:
   - Email address of registered student
   - Timestamp when student registered
   - Check-in status (boolean)
   - Check-in timestamp (if checked in)

3. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.

## QR Code Check-In Workflow

1. Student signs up for an activity via the UI or API
2. A unique ticket with QR code is generated
3. Student views their ticket with the QR code before attending the event
4. At event time, staff/organizers can use the QR scanner interface to check students in
5. Each check-in is timestamped and prevents duplicate check-ins
