class Boing extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone
        this.parent = parent;

        // Ball sprite and shadow image
        this.ball;
        this.shadow;
    }

    create ()
    {
        // Add the window background from the atlas texture
        const bg = this.add.image(0, 0, 'boing', 'boing-window').setOrigin(0);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Boing.WIDTH, Boing.HEIGHT);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Set physics world bounds inside the window frame
        this.physics.world.setBounds(10, 24, 330, 222);

        // Create the ball sprite and play its animation (created in EditorScene)
        this.ball = this.physics.add.sprite(100, 32, 'boing', 'boing1').play('boing');
        
        // Add a shadow image that follows the ball
        this.shadow = this.add.image(this.ball.x + 62, this.ball.y - 2, 'boing', 'shadow');

        // Set initial velocity with random X component
        this.ball.setVelocity(Phaser.Math.Between(40, 80), 110);
        
        // Make the ball bounce perfectly off boundaries
        this.ball.setBounce(1, 1);
        this.ball.setCollideWorldBounds(true);

        // Listen for postupdate event to update shadow position
        // Note: Check if Phaser 4 still uses the same event system
        this.events.on('postupdate', this.postUpdate, this);
    }

    // Update shadow position to follow the ball
    postUpdate ()
    {
        this.shadow.setPosition(this.ball.x + 44, this.ball.y - 2);
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
Boing.WIDTH = 344;
Boing.HEIGHT = 266;

export default Boing;
