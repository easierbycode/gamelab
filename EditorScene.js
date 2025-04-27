// Import the demo scenes (assuming they exist in the same directory)
// Note: Clock.js and Boing.js imports added based on available spec files.
// Twist.js and Sine.js are missing from specs.
import Eyes from './Eyes.js';
import Juggler from './Juggler.js';
import Stars from './Stars.js';
import Invaders from './Invaders.js';
import Clock from './Clock.js';
import Boing from './Boing.js';


class EditorScene extends Phaser.Scene {

    constructor() {
        super({ key: 'EditorScene' });
        this.count = 0; // For window handles
        this.workbench;
        this.workbenchTitle;
        this.workbenchIcons;
    }

    preload() {
        // Using a proxy for CORS issues if running locally without a server
        // If assets load directly, remove the proxy part.
        // const proxy = 'https://cors-anywhere.herokuapp.com/';
        // this.load.setBaseURL(proxy + 'https://cdn.phaserfiles.com/v385');
        // For simplicity assuming direct load works or running via server:
        // this.load.setBaseURL('https://cdn.phaserfiles.com/v385'); // Use local assets

        this.load.image('disk', 'assets/phaser3/disk.png');

        this.load.image('workbenchTitle', 'assets/phaser3/workbench-title.png');
        this.load.image('workbenchIcons', 'assets/phaser3/workbench-icons.png');
        this.load.image('demosWindow', 'assets/phaser3/demos-window.png');
        // this.load.image('eyesIcon', 'assets/phaser3/eyes-icon.png');
        this.load.image('eyesIcon', 'assets/phaser3/player-icon.png');
        // this.load.image('starsIcon', 'assets/phaser3/stars-icon.png');
        this.load.image('starsIcon', 'assets/phaser3/levels-icon.png');
        this.load.image('jugglerIcon', 'assets/phaser3/juggler-icon.png');
        this.load.image('twistIcon', 'assets/phaser3/twist-icon.png'); // Note: Twist demo file not provided
        // this.load.image('invadersIcon', 'assets/phaser3/invaders-icon.png');
        this.load.image('invadersIcon', 'assets/phaser3/enemies-icon.png');
        this.load.image('clockIcon', 'assets/phaser3/clock-icon.png');
        this.load.image('boingIcon', 'assets/phaser3/boing-icon.png');

        this.load.image('starsWindow', 'assets/phaser3/stars-window.png');
        this.load.image('sineWindow', 'assets/phaser3/sinewave-window.png'); // Note: Sine demo file not provided
        this.load.image('eyesWindow', 'assets/phaser3/eyes-window.png');
        this.load.image('jugglerWindow', 'assets/phaser3/juggler-window.png');
        this.load.image('invadersWindow', 'assets/phaser3/invaders-window.png');
        this.load.image('clockWindow', 'assets/phaser3/clock-window.png');

        this.load.atlas('boing', 'assets/phaser3/boing.png', 'assets/phaser3/boing.json');

        this.load.spritesheet('juggler', 'assets/phaser3/juggler.png', { frameWidth: 128, frameHeight: 184 });
        this.load.image('star', 'assets/phaser3/star2.png');
        this.load.image('eye', 'assets/phaser3/eye.png');

        this.load.image('invaders.boom', 'assets/games/multi/boom.png');
        this.load.spritesheet('invaders.bullet', 'assets/games/multi/bullet.png', { frameWidth: 12, frameHeight: 14 });
        this.load.image('invaders.bullet2', 'assets/games/multi/bullet2.png');
        this.load.image('invaders.explode', 'assets/games/multi/explode.png');
        this.load.spritesheet('invaders.invader1', 'assets/games/multi/invader1.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('invaders.invader2', 'assets/games/multi/invader2.png', { frameWidth: 22, frameHeight: 16 });
        this.load.spritesheet('invaders.invader3', 'assets/games/multi/invader3.png', { frameWidth: 24, frameHeight: 16 });
        this.load.image('invaders.mothership', 'assets/games/multi/mothership.png');
        this.load.image('invaders.ship', 'assets/games/multi/ship.png');
    }

    create() {
        // Create animations
        this.anims.create({
            key: 'juggler',
            frames: this.anims.generateFrameNumbers('juggler'),
            frameRate: 28,
            repeat: -1
        });

        this.anims.create({
            key: 'boing',
            frames: this.anims.generateFrameNames('boing', { prefix: 'boing', start: 1, end: 14 }),
            frameRate: 28,
            repeat: -1
        });

        this.anims.create({
            key: 'bullet',
            frames: this.anims.generateFrameNumbers('invaders.bullet'),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'invader1',
            frames: this.anims.generateFrameNumbers('invaders.invader1'),
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'invader2',
            frames: this.anims.generateFrameNumbers('invaders.invader2'),
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'invader3',
            frames: this.anims.generateFrameNumbers('invaders.invader3'),
            frameRate: 2,
            repeat: -1
        });

        // Setup workbench (placeholder dimensions for now)
        this.workbench = this.add.graphics({ x: 16, y: 21 });
        this.workbench.fillStyle(0xffffff);
        this.workbench.fillRect(0, 0, this.sys.game.config.width - 105, 20); // Adjust width calculation if needed

        this.workbenchTitle = this.add.image(16, 21, 'workbenchTitle').setOrigin(0);
        this.workbenchIcons = this.add.image(this.sys.game.config.width - 87, 21, 'workbenchIcons').setOrigin(0); // Adjust position if needed

        // Placeholder text removed
        // this.add.text(100, 100, 'Editor Scene - Multi Demo Implementation', { fontSize: '24px', fill: '#fff' });

        // --- Implement Demos Window ---
        const disk = this.add.image(16, 64, 'disk').setOrigin(0).setInteractive();

        const demosWindow = this.add.image(0, 0, 'demosWindow').setOrigin(0);
        const eyesIcon = this.add.image(32, 34, 'eyesIcon', 0).setOrigin(0).setInteractive();
        const jugglerIcon = this.add.image(48, 110, 'jugglerIcon', 0).setOrigin(0).setInteractive();
        const starsIcon = this.add.image(230, 40, 'starsIcon', 0).setOrigin(0).setInteractive();
        const invadersIcon = this.add.image(120, 34, 'invadersIcon', 0).setOrigin(0).setInteractive();
        const clockIcon = this.add.image(240, 120, 'clockIcon', 0).setOrigin(0).setInteractive();
        const boingIcon = this.add.image(146, 128, 'boingIcon', 0).setOrigin(0).setInteractive();
        // Note: Twist icon not added as Twist.js is missing

        const demosContainer = this.add.container(32, 70, [ demosWindow, eyesIcon, jugglerIcon, starsIcon, invadersIcon, clockIcon, boingIcon ]);

        demosContainer.setVisible(false);

        // Add a close button zone to the demos window container
        const demosCloseButton = this.add.zone(0, 0, 28, 20).setInteractive().setOrigin(0);
        demosContainer.add(demosCloseButton); // Add the close button to the container

        // Make the container draggable (using the background image as the hit area)
        demosContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, demosWindow.width, demosWindow.height), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(demosContainer);

        demosContainer.on('drag', function (pointer, dragX, dragY) {
            this.x = dragX;
            this.y = dragY;
        });

        // Add click listener to the demos window close button
        demosCloseButton.on('pointerup', () => {
            console.log('Closing demos window');
            demosContainer.setVisible(false);
        });

        disk.once('pointerup', () => { // Use arrow function to preserve 'this' context if needed later
            demosContainer.setVisible(true);
        });

        // Icon click handlers
        eyesIcon.on('pointerup', () => { this.createWindow(Eyes); }, this);
        jugglerIcon.on('pointerup', () => { this.createWindow(Juggler); }, this);
        starsIcon.on('pointerup', () => { this.createWindow(Stars); }, this);
        invadersIcon.on('pointerup', () => { this.createWindow(Invaders); }, this);
        clockIcon.on('pointerup', () => { this.createWindow(Clock); }, this);
        boingIcon.on('pointerup', () => { this.createWindow(Boing); }, this);
        // --- End Demos Window Implementation ---


        this.events.on('resize', this.resize, this);
    }

    update() {
        // Game loop logic here
    }

    createWindow (SceneClass) // Changed func to SceneClass for clarity
    {
        // Check if SceneClass and its dimensions are defined
        if (!SceneClass || typeof SceneClass.WIDTH === 'undefined' || typeof SceneClass.HEIGHT === 'undefined') {
            console.error("Cannot create window: Scene class or dimensions missing.", SceneClass);
            return;
        }

        const x = Phaser.Math.Between(400, 600);
        const y = Phaser.Math.Between(64, 128);

        const handle = 'window' + this.count++;

        // Create a zone for the window background and dragging
        const win = this.add.zone(x, y, SceneClass.WIDTH, SceneClass.HEIGHT).setInteractive().setOrigin(0);

        // Add a close button zone in the upper left corner
        const closeButton = this.add.zone(x, y, 28, 20).setInteractive().setOrigin(0);

        // Instantiate the scene class
        // Note: Phaser 4 scene management might differ. This assumes direct instantiation works.
        // We might need to use this.scene.add() differently or manage scene instances.
        const demo = new SceneClass(handle, win); // Pass handle and zone reference

        this.input.setDraggable(win);

        win.on('drag', function (pointer, dragX, dragY) {
            this.x = dragX;
            this.y = dragY;
            // Update the close button position as the window is dragged
            closeButton.setPosition(dragX, dragY);

            // If the demo scene has a refresh method, call it
            if (demo && typeof demo.refresh === 'function') {
                demo.refresh();
            }
        });

        // Add click listener to the close button
        closeButton.on('pointerup', () => {
            console.log(`Closing window: ${handle}`);
            // Stop and remove the scene
            this.scene.stop(handle);
            this.scene.remove(handle);
            // Destroy the interactive zones
            win.destroy();
            closeButton.destroy();
        });


        // Add the scene to Phaser's scene manager
        // Check Phaser 4 docs for the correct way to add/run scenes dynamically like this.
        // This might need adjustment based on P4 architecture.
        try {
            this.scene.add(handle, demo, true); // Attempt to add and start the scene
        } catch (e) {
            console.error(`Error adding scene ${handle}:`, e);
            // Fallback or alternative scene management might be needed
        }
    }


    resize (width, height)
    {
        if (width === undefined) { width = this.sys.game.config.width; }
        if (height === undefined) { height = this.sys.game.config.height; }

        // Phaser 4 might handle camera resizing differently, check docs if needed
        // this.cameras.resize(width, height);

        this.workbench.clear();
        this.workbench.fillStyle(0xffffff);
        this.workbench.fillRect(0, 0, width - 105, 20); // Adjust width calculation

        this.workbenchIcons.x = (width - 87); // Adjust position
    }
}

export default EditorScene;
