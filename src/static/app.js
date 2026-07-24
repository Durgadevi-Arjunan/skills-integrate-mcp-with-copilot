document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        
        // Display the ticket with QR code
        displayTicket(activity, result.ticket_id);
        
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Display ticket with QR code
  async function displayTicket(activity, ticketId) {
    const ticketContainer = document.getElementById("ticket-container");
    const ticketDetails = document.getElementById("ticket-details");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/ticket/${ticketId}`
      );

      if (response.ok) {
        const ticketData = await response.json();

        const checkinStatus = ticketData.checked_in
          ? `<div class="checkin-status checked-in">✓ Checked In</div>`
          : `<div class="checkin-status not-checked-in">⚠ Not Yet Checked In</div>`;

        ticketDetails.innerHTML = `
          <div class="ticket-card">
            <h4>${activity} - Event Ticket</h4>
            <div class="qr-code-container">
              <img src="data:image/png;base64,${ticketData.qr_code}" alt="QR Code" />
            </div>
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>Email:</strong> ${ticketData.email}</p>
              <p><strong>Registered:</strong> ${new Date(ticketData.registered_at).toLocaleString()}</p>
              ${ticketData.checked_in_at ? `<p><strong>Checked In:</strong> ${new Date(ticketData.checked_in_at).toLocaleString()}</p>` : ''}
            </div>
            ${checkinStatus}
            <button id="show-scanner-btn" class="secondary-btn" type="button">Show Scanner for Check-In</button>
            <button id="close-ticket-btn" class="secondary-btn" type="button">Close Ticket</button>
          </div>
        `;

        ticketContainer.classList.remove("hidden");

        // Add event listeners for ticket buttons
        document.getElementById("show-scanner-btn").addEventListener("click", () => {
          initializeScanner(activity, ticketId);
        });

        document.getElementById("close-ticket-btn").addEventListener("click", () => {
          ticketContainer.classList.add("hidden");
        });
      } else {
        console.error("Failed to fetch ticket details");
      }
    } catch (error) {
      console.error("Error displaying ticket:", error);
    }
  }

  // Initialize QR code scanner
  let html5QrCodeScanner = null;
  let isScanning = false;

  async function initializeScanner(activity, ticketId) {
    const checkinContainer = document.getElementById("checkin-container");
    const scannerContainer = document.getElementById("qr-scanner");
    const scannerStatus = document.getElementById("scanner-status");
    const scannerToggle = document.getElementById("scanner-toggle-btn");
    const checkinResult = document.getElementById("checkin-result");

    checkinContainer.classList.remove("hidden");
    checkinResult.classList.add("hidden");

    if (isScanning) {
      return;
    }

    isScanning = true;
    scannerStatus.textContent = "Camera access requested...";

    try {
      html5QrCodeScanner = new Html5QrcodeScanner(
        "qr-scanner",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      html5QrCodeScanner.render(
        async (decodedText) => {
          // When QR code is successfully scanned
          scannerStatus.textContent = "Processing...";
          html5QrCodeScanner.clear();
          isScanning = false;

          // Send check-in request
          await processCheckin(activity, decodedText, checkinResult, scannerStatus);

          scannerToggle.textContent = "Start Scanner";
        },
        (error) => {
          // Ignore scanning errors
          if (error && !error.toString().includes("NotFound")) {
            console.log("QR scan error:", error);
          }
        }
      );

      scannerStatus.textContent = "Scanner ready - point at QR code";
      scannerToggle.textContent = "Stop Scanner";

      scannerToggle.onclick = () => {
        if (html5QrCodeScanner) {
          html5QrCodeScanner.clear();
          isScanning = false;
          scannerToggle.textContent = "Start Scanner";
          scannerStatus.textContent = "Scanner stopped";
          scannerToggle.onclick = () => initializeScanner(activity, ticketId);
        }
      };
    } catch (error) {
      scannerStatus.textContent = "Error: Could not access camera. Make sure you allow camera access.";
      console.error("Scanner error:", error);
      isScanning = false;
    }
  }

  // Process check-in
  async function processCheckin(activity, ticketId, checkinResult, scannerStatus) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/checkin?ticket_id=${encodeURIComponent(ticketId)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();
      checkinResult.classList.remove("hidden");

      if (response.ok) {
        checkinResult.className = "checkin-result success";
        checkinResult.innerHTML = `
          <h5>✓ Check-In Successful!</h5>
          <p>${result.message}</p>
          <p><strong>Checked in at:</strong> ${new Date(result.checked_in_at).toLocaleString()}</p>
        `;
        scannerStatus.textContent = "Check-in successful! You can close this window.";
      } else {
        checkinResult.className = "checkin-result error";
        checkinResult.innerHTML = `
          <h5>✗ Check-In Failed</h5>
          <p>${result.detail || "An error occurred during check-in"}</p>
        `;
        scannerStatus.textContent = "Check-in failed. Try again.";
      }

      // Hide result after 5 seconds
      setTimeout(() => {
        checkinResult.classList.add("hidden");
      }, 5000);
    } catch (error) {
      checkinResult.classList.remove("hidden");
      checkinResult.className = "checkin-result error";
      checkinResult.innerHTML = `
        <h5>✗ Error</h5>
        <p>Failed to process check-in. Please try again.</p>
      `;
      console.error("Check-in error:", error);
    }
  }

  // Initialize app
  fetchActivities();
});
