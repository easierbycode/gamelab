class Invaders extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone/container
        this.parent = parent;

        // Input keys
        this.left;
        this.right;

        // Game objects
        this.bg = null; // Background image
        this.ship;
        this.invaders;
        this.mothership;
        this.bullet;

        // Tracking the boundaries of invaders group
        this.topLeft;
        this.bottomRight;

        // Timers for game events
        this.bulletTimer;
        this.mothershipTimer;

        // Game state
        this.isGameOver = false;

        // Store current dimensions
        this.currentWidth = Invaders.WIDTH;
        this.currentHeight = Invaders.HEIGHT;

        // Boundaries for the invaders formation - will adjust based on width
        this.invadersBounds = { x: 12, y: 62, right: this.currentWidth - 12 }; // Adjust right based on width
    }

    create ()
    {
        // Set up keyboard input (might be better handled globally)
        this.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        // Set up physics world - Use current dimensions
        this.physics.world.setBounds(4, 22, this.currentWidth - 8, this.currentHeight - 32); // Adjusted world bounds

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        this.cameras.main.setBackgroundColor('#000');
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create the invaders formation
        this.createInvaders(); // Will use initial width

        // Create player bullet
        this.bullet = this.physics.add.image(this.currentWidth / 2, this.currentHeight - 30, 'invaders.bullet2');

        // Create mothership that periodically flies across the screen
        this.mothership = this.physics.add.image(this.currentWidth + 100, 40, 'invaders.mothership');

        // Create player ship
        this.ship = this.physics.add.image(this.currentWidth / 2, this.currentHeight - 14, 'invaders.ship');

        // Add the window frame over everything else
        this.bg = this.add.image(0, 0, 'invadersWindow').setOrigin(0);

        // Make the ship stay within the world bounds
        this.ship.setCollideWorldBounds(true);

        // Set up collision detection
        this.physics.add.overlap(this.bullet, this.invaders, this.bulletHit, null, this);
        this.physics.add.overlap(this.bullet, this.mothership, this.bulletHitMothership, null, this);

        // Launch the initial bullet
        this.launchBullet();

        // Set up a timer for the mothership to appear
        this.mothershipTimer = this.time.addEvent({ 
            delay: 10000, 
            callback: this.launchMothership, 
            callbackScope: this, 
            repeat: -1 
        });

        // Set initial velocity for the invaders group
        this.invaders.setVelocityX(50);

        this.resizeScene(this.currentWidth, this.currentHeight); // Call initial resize/layout
    }

    // Launch the mothership from the right side of the screen
    launchMothership ()
    {
        // Use current width for starting position
        this.mothership.body.reset(this.currentWidth + 100, 40);
        this.mothership.setVelocityX(-100);
    }

    // Handle bullet hitting an invader
    bulletHit (bullet, invader)
    {
        // Reset the bullet
        this.launchBullet();

        // Disable the invader's physics body
        invader.body.enable = false;

        // Hide the invader
        this.invaders.killAndHide(invader);

        // Recalculate the boundaries of the invaders formation
        this.refreshOutliers();
    }

    // Handle bullet hitting the mothership
    bulletHitMothership (bullet, mothership)
    {
        // Reset the bullet
        this.launchBullet();

        // Reset the mothership position offscreen
        this.mothership.body.reset(this.currentWidth + 100, 40);
    }

    // Recalculate the leftmost and rightmost invaders after one is destroyed
    refreshOutliers ()
    {
        const list = this.invaders.getChildren();
        let first = null; // Initialize to null
        let last = null; // Initialize to null

        // Find the first and last *active* invaders
        for (let i = 0; i < list.length; i++) {
            const vader = list[i];
            if (vader.active) {
                if (first === null || vader.x < first.x) {
                    first = vader;
                }
                if (last === null || vader.x > last.x) {
                    last = vader;
                }
            }
        }

        // Update the boundary markers
        this.topLeft = first;
        this.bottomRight = last;

        // Check if all invaders are destroyed (both first and last are null after check)
        if (this.topLeft === null && this.bottomRight === null && this.invaders.countActive(true) === 0) {
             if (!this.isGameOver) { // Prevent multiple calls
                 this.gameOver();
             }
        }
    }

    // Reset and launch the player's bullet
    launchBullet ()
    {
        if (!this.bullet || !this.ship) return; // Guard against missing objects
        this.bullet.body.reset(this.ship.x, this.ship.y);
        this.bullet.body.velocity.y = -400;
        this.bullet.body.velocity.x = 0; // Ensure no horizontal drift initially
    }

    // Create the formation of invaders
    createInvaders ()
    {
        if (this.invaders) {
            this.invaders.destroy(true); // Destroy previous group if recreating
        }
        this.invaders = this.physics.add.group();

        // Adjust layout based on current width - Needs more sophisticated logic
        // For now, we'll keep the original number of rows/columns but adjust spacing
        const formationWidth = this.currentWidth - this.invadersBounds.x * 2; // Available width
        let xSpacing1 = Math.max(18, formationWidth / 10); // Adjust spacing dynamically
        let xSpacing2 = Math.max(20, formationWidth / 8);
        let xSpacing3 = Math.max(22, formationWidth / 7);
        let ySpacing = 28;

        // First row - red invaders (10)
        let x = this.invadersBounds.x;
        let y = this.invadersBounds.y;
        for (let i = 0; i < 10; i++)
        {
            this.invaders.create(x, y, 'invaders.invader1')
                .setTint(0xff0000)
                .play('invader1');
            x += xSpacing1;
        }

        // Second and third rows - green invaders (8 per row)
        x = this.invadersBounds.x;
        y += ySpacing;
        for (let i = 0; i < 16; i++)
        {
            this.invaders.create(x, y, 'invaders.invader2')
                .setTint(0x00ff00)
                .play('invader2');
            x += xSpacing2;
            if (i === 7) { x = this.invadersBounds.x; y += ySpacing; }
        }

        // Fourth and fifth rows - cyan invaders (7 per row)
        x = this.invadersBounds.x;
        y += ySpacing;
        for (let i = 0; i < 14; i++)
        {
            this.invaders.create(x, y, 'invaders.invader3')
                .setTint(0x00ffff)
                .play('invader3');
            x += xSpacing3;
            if (i === 6) { x = this.invadersBounds.x; y += ySpacing; }
        }

        // Set up boundary markers
        this.refreshOutliers(); // Calculate initial boundaries
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

    // Handle game over state
    gameOver ()
    {
        if (this.isGameOver) return; // Prevent multiple calls
        console.log("Game Over");
        this.isGameOver = true;

        // Stop the invaders movement
        if (this.invaders) this.invaders.setVelocityX(0);

        // Hide player ship and bullet
        if (this.ship) this.ship.setVisible(false);
        if (this.bullet) this.bullet.setVisible(false);

        // Stop timers
        if (this.mothershipTimer) this.mothershipTimer.remove();

        // Add Game Over text
        this.add.text(this.currentWidth / 2, this.currentHeight / 2, 'GAME OVER', { fontSize: '32px', color: '#ff0000' }).setOrigin(0.5);

    }

    update (time, delta)
    {
        // Check for game over conditions
        if (this.isGameOver) {
            return;
        }
        // Check if topLeft/bottomRight became null unexpectedly after game started
        if (this.invaders.countActive(true) > 0 && (this.topLeft === null || this.bottomRight === null)) {
             this.refreshOutliers();
             // If still null after refresh, something is wrong, maybe game over?
             if (this.topLeft === null && this.bottomRight === null) {
                   this.gameOver();
                   return;
             }
        } else if (this.invaders.countActive(true) === 0) {
            // Handle win condition / next level
            this.gameOver(); // Or trigger a win state
            return;
        }


        // Handle player ship movement based on input
        if (this.ship && this.ship.body) { // Check if ship exists
            if (this.left.isDown) {
                this.ship.body.velocity.x = -400;
            } else if (this.right.isDown) {
                this.ship.body.velocity.x = 400;
            } else {
                this.ship.body.velocity.x = 0;
            }
        }

        // Reset bullet if it goes off the top of the screen
        if (this.bullet && this.bullet.y < -32) {
            this.launchBullet();
        }

        // Handle invaders bouncing off the sides and moving down
        let moveDown = false;

        // Ensure topLeft and bottomRight are valid before accessing properties
        if (this.topLeft && this.bottomRight && this.topLeft.body && this.bottomRight.body) {
            // Check if invaders reached the right edge
            if (this.bottomRight.body.velocity.x > 0 && this.bottomRight.x >= (this.currentWidth - 12)) {
                this.invaders.setVelocityX(-50);
                moveDown = true;
            }
            // Check if invaders reached the left edge
            else if (this.topLeft.body.velocity.x < 0 && this.topLeft.x <= 12) {
                this.invaders.setVelocityX(50);
                moveDown = true;
            }

            // Move invaders down if they hit an edge
            if (moveDown) {
                const list = this.invaders.getChildren();
                let lowest = 0;

                for (let i = 0; i < list.length; i++) {
                    const vader = list[i];
                    if (vader.body) { // Check if body exists
                        vader.body.y += 4;
                        // Track the lowest invader
                        if (vader.active && vader.body.y > lowest) {
                            lowest = vader.body.y;
                        }
                    }
                }

                // Game over if invaders get too low (adjust threshold based on height)
                if (lowest > (this.currentHeight - 80)) { // Example threshold
                    this.gameOver();
                }
            }
        } else if (this.invaders.countActive(true) > 0) {
             // If invaders exist but outliers are null, refresh them
             this.refreshOutliers();
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

        // Update physics bounds
        this.physics.world.setBounds(4, 22, newWidth - 8, newHeight - 32);
        if (this.ship) this.ship.setCollideWorldBounds(true); // Reapply bounds check

        // Scale background
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Reposition elements that depend on width/height?
        // Player start position, mothership path, invader bounds might need adjustment
        this.invadersBounds.right = newWidth - 12;
        if (this.ship && !this.isGameOver) {
            this.ship.x = Phaser.Math.Clamp(this.ship.x, 0, newWidth); // Keep ship within new bounds
            this.ship.y = newHeight - 14; // Keep ship at bottom
        }

        // Consider regenerating invaders if layout needs significant change?
        // For now, just adjust bounds and let them continue.
        // this.createInvaders(); // Optional: recreate invaders with new spacing

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

}

// Define static dimensions for use in EditorScene
Invaders.WIDTH = 408;
Invaders.HEIGHT = 326;

export default Invaders;