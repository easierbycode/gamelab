class Example2 extends Phaser.Scene {
    constructor(handle, parent) { // Add handle and parent parameters
        super({ key: handle }); // Use handle for scene key
        this.parent = parent; // Store parent container reference

        // Initialize properties
        this.points = [];
        this.stars = null; // Initialize as null
        this.maxDepth = 32;
        this.logo = null; // Initialize as null
        this.bg = null; // Background for window (optional)

        // Store current dimensions
        this.currentWidth = Example2.WIDTH;
        this.currentHeight = Example2.HEIGHT;
    }

    preload() {
        // Assets should ideally be loaded globally by LoadScene or EditorScene
        // Keeping them here for demonstration, but remove if loaded elsewhere.
        this.load.image('logo', `https://play.rosebud.ai/assets/logo.png?j9ze`);
        this.load.spritesheet('stars', 'https://play.rosebud.ai/assets/stars-bw.png?sOck', { frameWidth: 8, frameHeight: 8 });
        // Load a window background if desired
        // this.load.image('example2Window', 'path/to/your/window/bg.png');
    }

    create() {
         // Set viewport/camera based on parent container passed from EditorScene
         if (this.parent) {
              this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
              this.cameras.main.setBackgroundColor(0x000000); // Black background for scene area
              this.cameras.main.setScroll(0, 0);
              this.cameras.main.setOrigin(0, 0); // Ensure camera origin is top-left

               // Optional: Add a background frame image if loaded
               // this.bg = this.add.image(0, 0, 'example2Window').setOrigin(0);
         } else {
              // Fallback if no parent (e.g., running standalone)
              this.cameras.main.setBackgroundColor(0x000000);
         }

        this.points = [];
        this.stars = this.add.group();
        this.maxDepth = 32;

        for (var i = 0; i < 384; i++) {
            this.points.push({
                // Center points around origin for easier scaling later
                x: Phaser.Math.Between(-this.currentWidth / 20, this.currentWidth / 20), // Adjust range based on visual preference
                y: Phaser.Math.Between(-this.currentHeight / 20, this.currentHeight / 20), // Adjust range based on visual preference
                z: Phaser.Math.Between(1, this.maxDepth)
            });
        }

        this.logo = this.physics.add.image(this.currentWidth / 2, 100, 'logo');
        // Ensure logo is within physics bounds if needed, otherwise remove physics
        this.physics.world.setBounds(0, 0, this.currentWidth, this.currentHeight);
        this.logo.setCollideWorldBounds(true);

        this.resizeScene(this.currentWidth, this.currentHeight); // Initial layout
    }

    update() {
        if (!this.stars) return; // Guard

        this.stars.clear(true, true); // Clear previous frame's stars
        for (var i = 0; i < this.points.length; i++) {
            var point = this.points[i];

            point.z -= 0.2;

            if (point.z <= 0) {
                 // Reset points relative to current dimensions
                point.x = Phaser.Math.Between(-this.currentWidth / 20, this.currentWidth / 20);
                point.y = Phaser.Math.Between(-this.currentHeight / 20, this.currentHeight / 20);
                point.z = this.maxDepth;
            }

            // Calculate perspective projection based on current center
            var scaleFactor = 128 / point.z; // Original perspective scale
            var px = point.x * scaleFactor + (this.currentWidth * 0.5);
            var py = point.y * scaleFactor + (this.currentHeight * 0.5);

            // Star appearance based on depth
            var depthFactor = (1 - point.z / this.maxDepth);
            var starAlpha = depthFactor;
            var starScale = depthFactor * 1.15;

            // Check if star is within current bounds before creating sprite
            if (px >= 0 && px <= this.currentWidth && py >= 0 && py <= this.currentHeight) {
                 var star = this.add.sprite(px, py, 'stars', Phaser.Math.Between(0, 5));
                 // Depth sorting - higher value is further back (less visible)
                 // We want closer stars (smaller z) to be on top (higher depth value in Phaser)
                 star.setDepth(depthFactor * 10); // Scale depth value
                 star.setAlpha(starAlpha);
                 star.setScale(starScale);
                 this.stars.add(star); // Add to group for cleanup
            }
        }
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
         if (!this.parent) return;
        // Update camera position to match the dragged zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene's display list to the top
        if (this.sys && this.sys.bringToTop) {
             this.sys.bringToTop();
        }
    }

    // Called by EditorScene for resize/fullscreen
    resizeScene(newWidth, newHeight)
    {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return; // Guard

        // Update camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // Scale background if it exists
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Update physics bounds
        this.physics.world.setBounds(0, 0, newWidth, newHeight);

        // Reposition logo (example: keep centered horizontally, fixed distance from top)
        if (this.logo) {
            this.logo.setPosition(newWidth / 2, Math.min(100, newHeight * 0.15));
             this.logo.body?.setCollideWorldBounds(true); // Re-apply world bounds
        }

        // Reset star positions based on new dimensions
        // This prevents stars bunching up or spreading too thin after resize
        this.points = [];
        for (var i = 0; i < 384; i++) {
             this.points.push({
                 x: Phaser.Math.Between(-newWidth / 20, newWidth / 20),
                 y: Phaser.Math.Between(-newHeight / 20, newHeight / 20),
                 z: Phaser.Math.Between(1, this.maxDepth)
             });
        }
        if(this.stars) this.stars.clear(true, true); // Clear existing sprites immediately

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

     shutdown() {
         // Clean up resources
         this.points = [];
         this.stars?.destroy(true); // Destroy group and children
         this.logo?.destroy();
         this.bg?.destroy();

         // Nullify references
         this.stars = null;
         this.logo = null;
         this.parent = null;
         this.bg = null;
     }
}

// Define static dimensions needed by EditorScene.createWindow
Example2.WIDTH = 360;
Example2.HEIGHT = 640;

// Add the default export statement
export default Example2;