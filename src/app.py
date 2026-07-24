"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
import uuid
import qrcode
from io import BytesIO
import base64
from datetime import datetime

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
        "registrations": {  # ticket_id -> {email, registered_at, checked_in, checked_in_at}
            "550e8400-e29b-41d4-a716-446655440000": {
                "email": "michael@mergington.edu",
                "registered_at": "2024-07-24T10:00:00",
                "checked_in": False,
                "checked_in_at": None
            },
            "550e8400-e29b-41d4-a716-446655440001": {
                "email": "daniel@mergington.edu",
                "registered_at": "2024-07-24T10:05:00",
                "checked_in": False,
                "checked_in_at": None
            }
        }
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
        "registrations": {}
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
        "registrations": {}
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"],
        "registrations": {}
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"],
        "registrations": {}
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"],
        "registrations": {}
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"],
        "registrations": {}
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"],
        "registrations": {}
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"],
        "registrations": {}
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


def generate_qr_code(data: str) -> str:
    """Generate a QR code and return as base64 encoded image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return img_str


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity and generate a ticket"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Generate unique ticket ID
    ticket_id = str(uuid.uuid4())
    
    # Store registration details
    activity["registrations"][ticket_id] = {
        "email": email,
        "registered_at": datetime.now().isoformat(),
        "checked_in": False,
        "checked_in_at": None
    }
    
    # Add student to participants
    activity["participants"].append(email)
    
    return {
        "message": f"Signed up {email} for {activity_name}",
        "ticket_id": ticket_id
    }


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    
    # Remove all registrations for this email
    tickets_to_remove = [tid for tid, reg in activity["registrations"].items() if reg["email"] == email]
    for ticket_id in tickets_to_remove:
        del activity["registrations"][ticket_id]
    
    return {"message": f"Unregistered {email} from {activity_name}"}


@app.get("/activities/{activity_name}/ticket/{ticket_id}")
def get_ticket(activity_name: str, ticket_id: str):
    """Get ticket details with QR code"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity = activities[activity_name]
    
    if ticket_id not in activity["registrations"]:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    registration = activity["registrations"][ticket_id]
    
    # Generate QR code data
    qr_data = f"{activity_name}|{ticket_id}|{registration['email']}"
    qr_code = generate_qr_code(qr_data)
    
    return {
        "ticket_id": ticket_id,
        "activity": activity_name,
        "email": registration["email"],
        "registered_at": registration["registered_at"],
        "checked_in": registration["checked_in"],
        "checked_in_at": registration["checked_in_at"],
        "qr_code": f"data:image/png;base64,{qr_code}"
    }


@app.post("/activities/{activity_name}/checkin")
def checkin_to_activity(activity_name: str, ticket_id: str):
    """Check in a student to an activity using their ticket"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity = activities[activity_name]
    
    if ticket_id not in activity["registrations"]:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    registration = activity["registrations"][ticket_id]
    
    # Prevent duplicate check-ins
    if registration["checked_in"]:
        raise HTTPException(
            status_code=400,
            detail="Student has already checked in"
        )
    
    # Mark as checked in
    registration["checked_in"] = True
    registration["checked_in_at"] = datetime.now().isoformat()
    
    return {
        "message": f"Checked in {registration['email']} to {activity_name}",
        "ticket_id": ticket_id,
        "checked_in_at": registration["checked_in_at"]
    }
