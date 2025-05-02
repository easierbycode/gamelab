class Stars extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the handle/key to the scene constructor
        super({ key: handle });

        this.parent = parent; // Store reference to the parent zone/container

        this.blitter; // Will hold the batch renderer for stars
        this.bg = null; // Reference to background image

        // Star field configuration - adaptable
        this.depth = 1700;
        this.distance = 200;
        this.speed = 6;
        this.max = 300; // Maximum number of stars

        // Store current dimensions
        this.currentWidth = Stars.WIDTH;
        this.currentHeight = Stars.HEIGHT;

        // Star data arrays
        this.xx = [];
        this.yy = [];
        this.zz = [];
    }

    create ()
    {
        // Set camera viewport to match the parent zone's position and size
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        this.cameras.main.setBackgroundColor(0x000000);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create a blitter for efficient rendering of many star sprites
        this.blitter = this.add.blitter(0, 0, 'star');

        // Initialize stars with random positions based on initial size
        this.initializeStars();

        // Add window frame on top of stars
        this.bg = this.add.image(0, 0, 'starsWindow').setOrigin(0);

        this.resizeScene(this.currentWidth, this.currentHeight); // Initial layout/scaling
    }

    initializeStars() {
        this.blitter.clear(); // Clear existing bobs if re-initializing
        this.xx = [];
        this.yy = [];
        this.zz = [];

        for (let i = 0; i < this.max; i++)
        {
            // Random starting positions centered around origin, relative to current size
            this.xx[i] = Math.floor(Math.random() * this.currentWidth) - (this.currentWidth / 2);
            this.yy[i] = Math.floor(Math.random() * this.currentHeight) - (this.currentHeight / 2);
            this.zz[i] = Math.floor(Math.random() * this.depth) - 100;

            // Apply perspective to calculate initial screen coordinates
            const perspective = this.distance / (this.distance - this.zz[i]);
            const x = (this.currentWidth / 2) + this.xx[i] * perspective;
            const y = (this.currentHeight / 2) + this.yy[i] * perspective;

            // Create the star bob in the blitter
            const bob = this.blitter.create(x, y);
            // Set visibility based on initial position
            bob.a = (x < 0 || x > this.currentWidth || y < 0 || y > this.currentHeight) ? 0 : 1; // Use current dimensions for check
        }
    }


    update (time, delta)
    {
        if (!this.blitter || !this.blitter.children) return; // Guard

        // Access the blitter's children (bobs) directly for efficient updates
        const list = this.blitter.children.list;
        if (!list) return; // Check if list exists

        // Update each star's position with the 3D perspective effect
        for (let i = 0; i < this.max; i++)
        {
            // Check if bob exists at this index
            const bob = list[i];
            if (!bob) continue;

            // Calculate new perspective based on z-position
            const perspective = this.distance / (this.distance - this.zz[i]);

            // Apply perspective to x,y coordinates relative to current center
            const x = (this.currentWidth / 2) + this.xx[i] * perspective;
            const y = (this.currentHeight / 2) + this.yy[i] * perspective;

            // Move stars forward in z-space
            this.zz[i] += this.speed * (delta / 16.667); // Frame-rate independent speed

            // Reset stars that go beyond the distance threshold
            if (this.zz[i] > this.distance)
            {
                this.zz[i] -= (this.distance * 2);
                // Optionally re-randomize x/y slightly when reset?
                // this.xx[i] = Math.floor(Math.random() * this.currentWidth) - (this.currentWidth / 2);
                // this.yy[i] = Math.floor(Math.random() * this.currentHeight) - (this.currentHeight / 2);
            }

            // Update the star's position in the blitter
            bob.x = x;
            bob.y = y;

            // Update visibility based on current bounds
            bob.a = (x < 0 || x > this.currentWidth || y < 0 || y > this.currentHeight) ? 0 : 1;
        }
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

        // Scale background
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Re-initialize star positions based on the new dimensions
        // This prevents stars bunching up or spreading too thin
        this.initializeStars();

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

}

// Define static dimensions for use in EditorScene
Stars.WIDTH = 328;
Stars.HEIGHT = 266;

export default Stars;