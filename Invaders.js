class Invaders extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone
        this.parent = parent;

        // Input keys
        this.left;
        this.right;

        // Game objects
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

        // Boundaries for the invaders formation
        this.invadersBounds = { x: 12, y: 62, right: 152 };
    }

    create ()
    {
        // Set up keyboard input
        this.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        // Set up physics world
        this.physics.world.setBounds(4, 22, 400, 300);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Invaders.WIDTH, Invaders.HEIGHT);
        this.cameras.main.setBackgroundColor('#000');
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create the invaders formation
        this.createInvaders();

        // Create player bullet
        this.bullet = this.physics.add.image(200, 290, 'invaders.bullet2');

        // Create mothership that periodically flies across the screen
        this.mothership = this.physics.add.image(500, 40, 'invaders.mothership');

        // Create player ship
        this.ship = this.physics.add.image(200, 312, 'invaders.ship');

        // Add the window frame over everything else
        const bg = this.add.image(0, 0, 'invadersWindow').setOrigin(0);

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
    }

    // Launch the mothership from the right side of the screen
    launchMothership ()
    {
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
        this.mothership.body.reset(500, 40);
    }

    // Recalculate the leftmost and rightmost invaders after one is destroyed
    refreshOutliers ()
    {
        const list = this.invaders.getChildren();

        let first = this.invaders.getFirst(true);
        let last = this.invaders.getLast(true);

        // Find the leftmost and rightmost active invaders
        for (let i = 0; i < list.length; i++)
        {
            const vader = list[i];

            if (vader.active)
            {
                if (vader.x < first.x)
                {
                    first = vader;
                }
                else if (vader.x > last.x)
                {
                    last = vader;
                }
            }
        }

        // Check if all invaders are destroyed
        if (this.topLeft === null && this.bottomRight === null)
        {
            this.gameOver();
        }

        // Update the boundary markers
        this.topLeft = first;
        this.bottomRight = last;
    }

    // Reset and launch the player's bullet
    launchBullet ()
    {
        this.bullet.body.reset(this.ship.x, this.ship.y);
        this.bullet.body.velocity.y = -400;
    }

    // Create the formation of invaders
    createInvaders ()
    {
        this.invaders = this.physics.add.group();

        // First row - red invaders
        let x = this.invadersBounds.x;
        let y = this.invadersBounds.y;

        for (let i = 0; i < 10; i++)
        {
            this.invaders.create(x, y, 'invaders.invader1')
                .setTint(0xff0000)
                .play('invader1');

            x += 26;
        }

        // Second and third rows - green invaders
        x = this.invadersBounds.x;
        y += 28;

        for (let i = 0; i < 16; i++)
        {
            this.invaders.create(x, y, 'invaders.invader2')
                .setTint(0x00ff00)
                .play('invader2');

            x += 33;

            // Wrap to the next row after 8 invaders
            if (i === 7)
            {
                x = this.invadersBounds.x;
                y += 28;
            }
        }

        // Fourth and fifth rows - cyan invaders
        x = this.invadersBounds.x;
        y += 28;

        for (let i = 0; i < 14; i++)
        {
            this.invaders.create(x, y, 'invaders.invader3')
                .setTint(0x00ffff)
                .play('invader3');

            x += 38;

            // Wrap to the next row after 7 invaders
            if (i === 6)
            {
                x = this.invadersBounds.x;
                y += 28;
            }
        }

        // Set up boundary markers
        this.topLeft = this.invaders.getFirst(true);
        this.bottomRight = this.invaders.getLast(true);
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

    // Handle game over state
    gameOver ()
    {
        // Stop the invaders movement
        this.invaders.setVelocityX(0);

        // Hide player ship and bullet
        this.ship.setVisible(false);
        this.bullet.setVisible(false);

        // Set game over flag
        this.isGameOver = true;
    }

    update ()
    {
        // Check for game over conditions
        if (this.isGameOver || (this.bottomRight === null && this.topLeft === null))
        {
            return;
        }

        // Handle player ship movement based on input
        if (this.left.isDown)
        {
            this.ship.body.velocity.x = -400;
        }
        else if (this.right.isDown)
        {
            this.ship.body.velocity.x = 400;
        }
        else
        {
            this.ship.body.velocity.x = 0;
        }

        // Reset bullet if it goes off the top of the screen
        if (this.bullet.y < -32)
        {
            this.launchBullet();
        }

        // Handle invaders bouncing off the sides and moving down
        let moveDown = false;

        // Check if invaders reached the right edge
        if (this.bottomRight.body.velocity.x > 0 && this.bottomRight.x >= 390)
        {
            this.invaders.setVelocityX(-50);
            moveDown = true;
        }
        // Check if invaders reached the left edge
        else if (this.topLeft.body.velocity.x < 0 && this.topLeft.x <= 12)
        {
            this.invaders.setVelocityX(50);
            moveDown = true;
        }

        // Move invaders down if they hit an edge
        if (moveDown)
        {
            const list = this.invaders.getChildren();
            let lowest = 0;

            for (let i = 0; i < list.length; i++)
            {
                const vader = list[i];
                vader.body.y += 4;

                // Track the lowest invader
                if (vader.active && vader.body.y > lowest)
                {
                    lowest = vader.body.y;
                }
            }

            // Game over if invaders get too low
            if (lowest > 240)
            {
                this.gameOver();
            }
        }
    }
}

// Define static dimensions for use in EditorScene
Invaders.WIDTH = 408;
Invaders.HEIGHT = 326;

export default Invaders;
