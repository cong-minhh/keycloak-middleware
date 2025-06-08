// Sensor data management functionality

// State management
let sensorData = [];

// UI Elements
const loadingSpinner = document.getElementById('sensor-loading');
const errorState = document.getElementById('sensor-error');
const emptyState = document.getElementById('sensor-empty');
const sensorContent = document.getElementById('sensorContent');
const sensorForm = document.getElementById('sensorForm');
const sensorDataContainer = document.getElementById('sensorDataContainer');
const alertArea = document.getElementById('alertArea');

// Show/Hide UI States
function showLoading() {
    loadingSpinner.style.display = 'flex';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    sensorContent.style.display = 'none';
}

function showError(message) {
    loadingSpinner.style.display = 'none';
    errorState.style.display = 'block';
    emptyState.style.display = 'none';
    sensorContent.style.display = 'none';
    errorState.querySelector('.error-message').textContent = message;
}

function showEmpty() {
    loadingSpinner.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'block';
    sensorContent.style.display = 'block';
}

function showContent() {
    loadingSpinner.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    sensorContent.style.display = 'block';
}

// Alert Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertArea.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// Fetch Sensor Data
async function fetchSensorData() {
    showLoading();
    try {
        const response = await fetch('/api/sensors');
        if (!response.ok) throw new Error('Failed to fetch sensor data');
        
        sensorData = await response.json();
            
        if (sensorData.length === 0) {
            showEmpty();
            return;
        }
        
        renderSensorData();
        showContent();
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        showError(error.message);
    }
}

// Render Sensor Data
function renderSensorData() {
    sensorDataContainer.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Robot ID</th>
                        <th>Position X</th>
                        <th>Position Y</th>
                        <th>Task Status</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${sensorData.map(sensor => `
                        <tr>
                            <td>${sensor.robotId}</td>
                            <td>${sensor.positionX}</td>
                            <td>${sensor.positionY}</td>
                            <td>
                                <span class="badge bg-${getStatusColor(sensor.taskStatus)}">
                                    ${sensor.taskStatus}
                                </span>
                            </td>
                            <td>${new Date(sensor.timestamp).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Helper function for status colors
function getStatusColor(status) {
    const colors = {
        'IDLE': 'secondary',
        'ACTIVE': 'success',
        'ERROR': 'danger',
        'MAINTENANCE': 'warning'
    };
    return colors[status] || 'secondary';
}

// Submit Sensor Data
sensorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = sensorForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status"></span>
        Submitting...
    `;
    
    try {
        const formData = {
            robotId: document.getElementById('robotId').value,
            positionX: parseFloat(document.getElementById('positionX').value),
            positionY: parseFloat(document.getElementById('positionY').value),
            taskStatus: document.getElementById('taskStatus').value
        };
        
        const response = await fetch('/api/sensors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit sensor data');
        }
        
        showAlert('Sensor data submitted successfully');
        sensorForm.reset();
        await fetchSensorData();
    } catch (error) {
        console.error('Error submitting sensor data:', error);
        showAlert(error.message, 'danger');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!hasRole('sensor-view')) {
        showError('Access Denied: You do not have permission to view sensor data');
        return;
    }
    fetchSensorData();
});

// Refresh data periodically
setInterval(fetchSensorData, 30000); // Refresh every 30 seconds