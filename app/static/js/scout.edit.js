document.addEventListener('DOMContentLoaded', function() {
    // Auto-capitalize event code
    const eventCodeInput = document.querySelector('input[name="event_code"]');
    eventCodeInput.addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });

    // Calculate total points in real-time
    const updateTotal = () => {
        const coralPoints = [1, 2, 3, 4].reduce((sum, level) => {
            return sum + (parseInt(document.querySelector(`input[name="coral_level${level}"]`).value) || 0) * level;
        }, 0);
        
        const algaeNet = (parseInt(document.querySelector('input[name="algae_net"]').value) || 0) * 2;
        const algaeProcessor = (parseInt(document.querySelector('input[name="algae_processor"]').value) || 0) * 3;
        const humanPlayerPoints = (parseInt(document.querySelector('input[name="human_player"]').value) || 0) * 2;
        
        const climbType = document.querySelector('select[name="climb_type"]').value;
        const climbSuccess = document.querySelector('input[name="climb_success"]').checked;
        let climbPoints = 0;
        if (climbSuccess) {
            switch(climbType) {
                case 'shallow': climbPoints = 3; break;
                case 'deep': climbPoints = 5; break;
                case 'park': climbPoints = 1; break;
            }
        }
        
        const total = coralPoints + algaeNet + algaeProcessor + humanPlayerPoints + climbPoints;
        document.getElementById('totalPoints').textContent = total;
    };

    // Add event listeners for all scoring inputs
    document.querySelectorAll('input[type="number"], input[type="checkbox"], select[name="climb_type"]')
        .forEach(input => input.addEventListener('input', updateTotal));

    // Initialize total
    updateTotal();

    // Add form submission handler with team check
    const form = document.getElementById('scoutingForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const teamNumber = form.querySelector('input[name="team_number"]').value;
        const eventCode = form.querySelector('input[name="event_code"]').value;
        const matchNumber = form.querySelector('input[name="match_number"]').value;
        const currentId = '{{ team_data._id }}';

        // Check if team already exists in this match (excluding current entry)
        try {
            const response = await fetch(`/scouting/check_team?team=${teamNumber}&event=${eventCode}&match=${matchNumber}&current_id=${currentId}`);
            const data = await response.json();
            
            if (data.exists) {
                alert(`Team ${teamNumber} already exists in match ${matchNumber} for event ${eventCode}`);
                return;
            }
            
            // If team doesn't exist or it's the same entry, submit the form
            form.submit();
        } catch (error) {
            console.error('Error checking team:', error);
            // If check fails, allow form submission
            form.submit();
        }
    });
});

const canvas = document.getElementById('autoPath');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let bgImage = new Image();
let pathHistory = [];
let currentPath = [];
let imageScale = 1;
let imageOffset = { x: 0, y: 0 };

function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set canvas size to match container
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';
    
    // Set actual canvas dimensions
    canvas.width = containerWidth * window.devicePixelRatio;
    canvas.height = containerHeight * window.devicePixelRatio;
    
    // Scale context to match device pixel ratio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Draw background and redraw paths
    drawBackground();
    redrawPaths();
}

function drawBackground() {
    if (!bgImage.complete) return;
    
    // Get the actual canvas dimensions (accounting for device pixel ratio)
    const canvasWidth = canvas.width / window.devicePixelRatio;
    const canvasHeight = canvas.height / window.devicePixelRatio;
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if we're on mobile (using a reasonable breakpoint)
    const isMobile = window.innerWidth < 768;
    
    // Calculate scaling to fit while maintaining aspect ratio
    imageScale = Math.min(
        (isMobile ? canvasWidth * 2 : canvasWidth) / bgImage.width,
        canvasHeight / bgImage.height
    );
    
    // Calculate dimensions for the scaled image
    const scaledWidth = bgImage.width * imageScale;
    const scaledHeight = bgImage.height * imageScale;
    
    if (isMobile) {
        // Mobile view - show half the field based on alliance
        const isRedAlliance = document.querySelector('input[name="alliance"][value="red"]').checked;
        const sourceX = isRedAlliance ? bgImage.width / 2 : 0;
        const sourceWidth = bgImage.width / 2;
        
        imageOffset.x = (canvasWidth - (scaledWidth / 2)) / 2;
        imageOffset.y = (canvasHeight - scaledHeight) / 2;
        
        ctx.drawImage(
            bgImage,
            sourceX, 0, sourceWidth, bgImage.height,  // Source rectangle (half)
            imageOffset.x, imageOffset.y, scaledWidth / 2, scaledHeight  // Destination rectangle
        );
    } else {
        // Desktop view - show full field
        imageOffset.x = (canvasWidth - scaledWidth) / 2;
        imageOffset.y = (canvasHeight - scaledHeight) / 2;
        
        ctx.drawImage(
            bgImage,
            0, 0, bgImage.width, bgImage.height,  // Source rectangle (full)
            imageOffset.x, imageOffset.y, scaledWidth, scaledHeight  // Destination rectangle
        );
    }
}

function getPointerPosition(e) {
    const rect = canvas.getBoundingClientRect();
    // Get raw coordinates relative to canvas, accounting for device pixel ratio
    return {
        x: ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left),
        y: ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top)
    };
}

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPointerPosition(e);
    lastX = pos.x;
    lastY = pos.y;
    currentPath = [];
    currentPath.push({ x: lastX, y: lastY });
}

function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const pos = getPointerPosition(e);
    
    ctx.beginPath();
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Draw directly using screen coordinates
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    // Store the raw coordinates
    currentPath.push({ x: pos.x, y: pos.y });
    lastX = pos.x;
    lastY = pos.y;
    
    document.getElementById('autoPathData').value = canvas.toDataURL();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        if (currentPath.length > 1) {
            pathHistory.push(currentPath);
        }
        currentPath = [];
    }
}

function undoLastPath() {
    if (pathHistory.length > 0) {
        pathHistory.pop();
        redrawPaths();
    }
}

function redrawPaths() {
    drawBackground();
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    pathHistory.forEach(path => {
        if (path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        }
    });
    
    document.getElementById('autoPathData').value = canvas.toDataURL();
}

function clearCanvas() {
    pathHistory = [];
    currentPath = [];
    // Reset to original field background
    bgImage.src = "/static/images/field-2025.png";
    document.getElementById('autoPathData').value = '';
}

function loadExistingPath(base64Data) {
    if (!base64Data || base64Data === "None") {
        console.log('No valid path data to load');
        return;
    }
    
    console.log('Loading path with dimensions:', canvas.width, canvas.height);
    const img = new Image();
    
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawBackground();
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('Path drawn at full size');
        
        document.getElementById('autoPathData').value = base64Data;
    };
    
    img.onerror = (error) => {
        console.error('Failed to load path:', error);
    };
    
    img.src = base64Data;
}

// Event listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

// Prevent scrolling while drawing
canvas.addEventListener('touchstart', e => e.preventDefault());
canvas.addEventListener('touchmove', e => e.preventDefault());

// Initialize
window.addEventListener('load', () => {
    console.log('Page loaded, setting up canvas');
    bgImage.onload = () => {
        resizeCanvas();
    };
    
    const existingPath = document.getElementById('autoPathData').value;
    bgImage.src = existingPath && existingPath !== "None" 
        ? existingPath 
        : "/static/images/field-2025.png";
});
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Add listener for alliance selection change
document.querySelectorAll('input[name="alliance"]').forEach(radio => {  
    radio.addEventListener('change', () => {
        clearCanvas();  // Clear existing paths when alliance changes
    });
});