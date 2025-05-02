class Juggler extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone/container
        this.parent = parent;

        // Store current dimensions
        this.currentWidth = Juggler.WIDTH;
        this.currentHeight = Juggler.HEIGHT;

        // References to game objects
        this.bg = null;
        this.jugglerSprite = null;
    }

    create ()
    {
        // Add the window background image
        this.bg = this.add.image(0, 0, 'jugglerWindow').setOrigin(0);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Add the juggler sprite and play its animation
        // Note: The 'juggler' animation is assumed to be created globally or in EditorScene
        // Check if animation exists before playing
        if (this.anims.exists('juggler')) {
             this.jugglerSprite = this.add.sprite(0, 0, 'juggler').setOrigin(0).play('juggler');
        } else {
             console.warn("Juggler animation 'juggler' not found. Displaying static frame.");
             // Display first frame as fallback? Requires spritesheet asset knowledge
             this.jugglerSprite = this.add.sprite(0, 0, 'juggler').setOrigin(0);
        }


        // Initial layout
        this.resizeScene(this.currentWidth, this.currentHeight);
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

        // Reposition and scale the juggler sprite (example: center and scale)
        if (this.jugglerSprite) {
            // Center the sprite within the new dimensions
            // The original position was (100, 22) in a 328x226 window.
            // Let's try to maintain relative position or center it.
            const scale = Math.min(newWidth / Juggler.WIDTH, newHeight / Juggler.HEIGHT);
            this.jugglerSprite.setScale(scale);
            this.jugglerSprite.setPosition(
                 (newWidth - this.jugglerSprite.displayWidth) / 2,
                 (newHeight - this.jugglerSprite.displayHeight) / 2 + 10 // Keep slightly offset Y?
            );
        }

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

    shutdown() {
         // Clean up references
         this.bg?.destroy();
         this.jugglerSprite?.destroy();
         this.bg = null;
         this.jugglerSprite = null;
         this.parent = null;
    }
}

// Define static dimensions for use in EditorScene
Juggler.WIDTH = 328;
Juggler.HEIGHT = 226;

export default Juggler;