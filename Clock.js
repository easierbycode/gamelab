class Clock extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone/container
        this.parent = parent;

        // Properties for the clock
        this.graphics;
        this.bg = null; // Reference to background image
        this.clockSize = 120; // Initial clock size

        // Store current dimensions
        this.currentWidth = Clock.WIDTH;
        this.currentHeight = Clock.HEIGHT;
    }

    create ()
    {
        // Add the window background image
        this.bg = this.add.image(0, 0, 'clockWindow').setOrigin(0);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        this.cameras.main.setBackgroundColor(0x0055aa);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create a graphics object for drawing the clock hands
        this.graphics = this.add.graphics();

        this.resizeScene(this.currentWidth, this.currentHeight); // Initial layout
    }

    update ()
    {
        const graphics = this.graphics;
        if (!graphics) return; // Guard if graphics not created yet

        // Use current dimensions for centering
        const centerX = this.currentWidth / 2;
        // Adjust Y based on potential header/frame space (e.g., 8px from original)
        const centerY = 8 + (this.currentHeight - 8) / 2;

        // Adapt clock size to the smaller dimension of the window, minus padding
        const padding = 20;
        this.clockSize = Math.max(20, Math.min(this.currentWidth, this.currentHeight) / 2 - padding);

        // Clear previous frame's drawing
        graphics.clear();

        //  Draw the clock face
        graphics.fillStyle(0xffffff, 1);
        graphics.lineStyle(3, 0x000000, 1);
        graphics.fillCircle(centerX, centerY, this.clockSize);
        graphics.strokeCircle(centerX, centerY, this.clockSize);

        // Get current time
        let date = new Date;
        let seconds = date.getSeconds() / 60;
        let mins = date.getMinutes() / 60;
        let hours = (date.getHours() % 12 + mins) / 12; // Correct 12-hour calculation with minutes influence

        // Set size for the clock hands (90% of clock radius)
        let handBaseSize = this.clockSize * 0.9;

        // --- Draw Hands ---
        this.drawHand(graphics, centerX, centerY, hours, handBaseSize * 0.6, 5, 0x000000); // Hour hand (shorter, thicker base)
        this.drawHand(graphics, centerX, centerY, mins, handBaseSize * 0.9, 5, 0x000000); // Minute hand (longer, thicker base)
        this.drawHand(graphics, centerX, centerY, seconds, handBaseSize, 2, 0xff0000); // Second hand (longest, thinner base)
    }

    drawHand(graphics, x, y, progress, length, baseWidthDegrees, color) {
         const angle = (360 * progress) - 90;
         const dest = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle), length);

         graphics.fillStyle(color, 1);
         graphics.beginPath();
         graphics.moveTo(x, y);

         // Create triangular hand shape based on baseWidthDegrees
         let p1 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle - baseWidthDegrees), length * 0.3); // Control base width point
         graphics.lineTo(p1.x, p1.y);
         graphics.lineTo(dest.x, dest.y);

         let p2 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle + baseWidthDegrees), length * 0.3); // Control base width point
         graphics.lineTo(p2.x, p2.y);
         graphics.lineTo(dest.x, dest.y); // Ensure it closes back at the destination

         graphics.closePath(); // Close the path before filling
         graphics.fillPath();
    }


    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
        if (!this.parent) return;
        // Update camera position to match the parent zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene to the top of the display list
        if (this.sys && this.sys.bringToTop) {
            this.sys.bringToTop();
        }
    }

    // Called by EditorScene when the window is resized (fullscreen toggle)
    resizeScene(newWidth, newHeight)
    {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return;

        // Update the camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // Scale background to fit
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Graphics object position is relative to scene (0,0), no need to move it
        // Clock drawing in update() will adapt based on newWidth/newHeight

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }
}

// Define static dimensions for use in EditorScene
Clock.WIDTH = 275;
Clock.HEIGHT = 276;

export default Clock;