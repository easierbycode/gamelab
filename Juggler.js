class Juggler extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone
        this.parent = parent;
    }

    create ()
    {
        // Add the window background image
        const bg = this.add.image(0, 0, 'jugglerWindow').setOrigin(0);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Juggler.WIDTH, Juggler.HEIGHT);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Add the juggler sprite and play its animation
        // Note: The 'juggler' animation is created in EditorScene
        this.add.sprite(100, 22, 'juggler').setOrigin(0).play('juggler');
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
        // Update camera position to match the parent zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene to the top of the display list
        // Note: Check if Phaser 4 has different scene management
        if (this.scene.bringToTop) {
            this.scene.bringToTop();
        } else if (this.sys && this.sys.bringToTop) {
            this.sys.bringToTop(); // Phaser 3 style fallback
        }
    }
}

// Define static dimensions for use in EditorScene
Juggler.WIDTH = 328;
Juggler.HEIGHT = 226;

export default Juggler;
