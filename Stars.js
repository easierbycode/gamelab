class Stars extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the handle/key to the scene constructor
        super({ key: handle });

        this.parent = parent; // Store reference to the parent zone

        this.blitter; // Will hold the batch renderer for stars

        // Star field configuration
        this.width = 320;
        this.height = 220;
        this.depth = 1700;
        this.distance = 200;
        this.speed = 6;

        this.max = 300; // Maximum number of stars
        this.xx = []; // Array for star x positions
        this.yy = []; // Array for star y positions
        this.zz = []; // Array for star z positions (depth)
    }

    create ()
    {
        // Set camera viewport to match the parent zone's position and size
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Stars.WIDTH, Stars.HEIGHT);
        this.cameras.main.setBackgroundColor(0x000000);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create a blitter for efficient rendering of many star sprites
        // Note: If Phaser 4 has different or improved methods for batch rendering,
        // this might need to be updated
        this.blitter = this.add.blitter(0, 0, 'star');

        // Initialize stars with random positions
        for (let i = 0; i < this.max; i++)
        {
            // Random starting positions, centered around origin
            this.xx[i] = Math.floor(Math.random() * this.width) - (this.width / 2);
            this.yy[i] = Math.floor(Math.random() * this.height) - (this.height / 2);
            this.zz[i] = Math.floor(Math.random() * this.depth) - 100;

            // Apply perspective to calculate screen coordinates
            const perspective = this.distance / (this.distance - this.zz[i]);
            const x = (this.width / 2) + this.xx[i] * perspective;
            const y = (this.height / 2) + this.yy[i] * perspective;
            
            // Hide stars outside viewport bounds
            const a = (x < 0 || x > 320 || y < 20 || y > 260) ? 0 : 1;

            // Create the star in the blitter (rendered as a batch)
            this.blitter.create(x, y);
        }

        // Add window frame on top of stars
        const bg = this.add.image(0, 0, 'starsWindow').setOrigin(0);
    }

    update (time, delta)
    {
        // Access the blitter's children directly for efficient updates
        const list = this.blitter.children.list;

        // Update each star's position with the 3D perspective effect
        for (let i = 0; i < this.max; i++)
        {
            // Calculate new perspective based on z-position
            const perspective = this.distance / (this.distance - this.zz[i]);

            // Apply perspective to x,y coordinates
            const x = (this.width / 2) + this.xx[i] * perspective;
            const y = (this.height / 2) + this.yy[i] * perspective;

            // Move stars forward in z-space
            this.zz[i] += this.speed;

            // Reset stars that go beyond the distance threshold
            if (this.zz[i] > this.distance)
            {
                this.zz[i] -= (this.distance * 2);
            }

            // Update the star's position in the blitter
            list[i].x = x;
            list[i].y = y;
            
            // Hide stars that would be outside the window bounds
            list[i].a = (x < 0 || x > 320 || y < 20 || y > 260) ? 0 : 1;
        }
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
        // Update camera position to match the parent zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene to the top of the display list
        // Check if bringToTop exists in Phaser 4's scene management
        if (this.scene.bringToTop) {
            this.scene.bringToTop();
        } else if (this.sys && this.sys.bringToTop) {
            this.sys.bringToTop(); // Phaser 3 style fallback
        }
    }
}

// Define static dimensions for use in EditorScene
Stars.WIDTH = 328;
Stars.HEIGHT = 266;

export default Stars;
