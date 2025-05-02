// Minimal Boing demo scene adapted for the editor window structure

class Boing extends Phaser.Scene {

    constructor(handle, parent) {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone/container
        this.parent = parent;

        // Store current dimensions
        this.currentWidth = Boing.WIDTH; // Use static default size initially
        this.currentHeight = Boing.HEIGHT;

        // Scene objects
        this.logo = null;
        this.checker = null;
    }

    create() {
        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);
        // Set background color for the scene area
        this.cameras.main.setBackgroundColor(0x2d2d2d); // Dark grey background

        // Create a checkerboard background pattern using graphics
        this.checker = this.add.graphics();
        this.drawCheckerboard();

        // Add the bouncing logo sprite
        // Note: The 'boing' animation is assumed created in EditorScene
        if (this.anims.exists('boing')) {
            this.logo = this.physics.add.sprite(this.currentWidth / 2, 0, 'boing')
                .play('boing')
                .setVelocity(150, 200) // Initial velocity
                .setBounce(1, 1)      // Full bounce
                .setCollideWorldBounds(true);
        } else {
            console.warn("Boing animation 'boing' not found.");
             // Fallback: Display a static image or text
             this.logo = this.add.text(this.currentWidth / 2, this.currentHeight / 2, 'Boing\nAnim Failed', { align: 'center'}).setOrigin(0.5);
        }

        // Set physics world bounds to match the current viewport size
        this.physics.world.setBounds(0, 0, this.currentWidth, this.currentHeight);

        // Apply initial resize/layout adjustments
        this.resizeScene(this.currentWidth, this.currentHeight);
    }

    drawCheckerboard() {
        if (!this.checker) return;
        this.checker.clear();
        const TILE_SIZE = 32;
        for (let y = 0; y < this.currentHeight; y += TILE_SIZE) {
            for (let x = 0; x < this.currentWidth; x += TILE_SIZE) {
                const isDark = ((x / TILE_SIZE % 2 === 0 && y / TILE_SIZE % 2 === 0) || (x / TILE_SIZE % 2 !== 0 && y / TILE_SIZE % 2 !== 0));
                this.checker.fillStyle(isDark ? 0x4d4d4d : 0x595959); // Slightly different greys
                this.checker.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Called by EditorScene when the parent zone is dragged
    refresh() {
        if (!this.parent) return;
        // Update camera position to match the parent zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene to the top of the display list
        if (this.sys && this.sys.bringToTop) {
            this.sys.bringToTop();
        }
    }

    // Called by EditorScene when the window is resized (fullscreen toggle)
    resizeScene(newWidth, newHeight) {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return;

        // Update the camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // Update physics world bounds
        this.physics.world.setBounds(0, 0, newWidth, newHeight);

        // Redraw checkerboard background
        this.drawCheckerboard();

        // Ensure logo stays within new bounds (physics should handle this)
        // If logo got stuck somehow, reset its position?
        if (this.logo && this.logo.body) {
             if (this.logo.x > newWidth) this.logo.x = newWidth - this.logo.width / 2;
             if (this.logo.y > newHeight) this.logo.y = newHeight - this.logo.height / 2;
        }

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

    shutdown() {
        // Clean up
        this.logo?.destroy();
        this.checker?.destroy();
        this.logo = null;
        this.checker = null;
        this.parent = null;
    }
}

// Define static default dimensions (adjust as needed)
Boing.WIDTH = 300;
Boing.HEIGHT = 250;

export default Boing;