// Import the demo scenes (assuming they exist in the same directory)
import Eyes from './Eyes.js';
// import Juggler from './Juggler.js'; // Juggler icon now launches BossViewer
import Stars from './Stars.js';
import Invaders from './Invaders.js';
import Clock from './Clock.js';
import Boing from './Boing.js';
import LevelEditorScene from './LevelEditorScene.js';
import BossViewerScene from './bosses.js'; // Import the new Boss Viewer Scene


class EditorScene extends Phaser.Scene {

    constructor() {
        super({ key: 'title-scene' }); // Changed key to avoid conflict with potential future 'editor-scene' key
        this.count = 0; // For window handles
        this.workbench;
        this.workbenchTitle;
        this.workbenchIcons;
    }

    preload() {
        // Dynamically choose base URL
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            this.load.setBaseURL(''); // Local development
        } else {
            this.load.setBaseURL('https://easierbycode.github.io/gamelab/public'); // Production/GitHub Pages
        }

        // --- Load Assets for Editor UI and Original Demos ---
        this.load.image('disk', 'assets/phaser3/disk.png');
        this.load.image('workbenchTitle', 'assets/phaser3/workbench-title.png');
        this.load.image('workbenchIcons', 'assets/phaser3/workbench-icons.png');
        this.load.image('demosWindow', 'assets/phaser3/demos-window.png');

        // Icons for the demo window
        this.load.image('eyesIcon', 'assets/phaser3/player-icon.png'); // Was eyes, now player editor?
        this.load.image('starsIcon', 'assets/phaser3/levels-icon.png'); // Launches LevelEditorScene
        this.load.image('jugglerIcon', 'assets/phaser3/juggler-icon.png'); // <<< THIS WILL LAUNCH BOSS VIEWER
        this.load.image('invadersIcon', 'assets/phaser3/enemies-icon.png'); // Was invaders, now enemies editor?
        this.load.image('clockIcon', 'assets/phaser3/clock-icon.png'); // Example demo
        this.load.image('boingIcon', 'assets/phaser3/boing-icon.png'); // Example demo
        // this.load.image('twistIcon', 'assets/phaser3/twist-icon.png'); // Twist demo file not provided

        // Window background frames
        this.load.image('starsWindow', 'assets/phaser3/stars-window.png');
        // this.load.image('sineWindow', 'assets/phaser3/sinewave-window.png'); // Sine demo file not provided
        this.load.image('eyesWindow', 'assets/phaser3/eyes-window.png');
        this.load.image('jugglerWindow', 'assets/phaser3/juggler-window.png'); // Still load frame for potential future use
        this.load.image('invadersWindow', 'assets/phaser3/invaders-window.png');
        this.load.image('clockWindow', 'assets/phaser3/clock-window.png');
        this.load.image('levels-window', 'assets/phaser3/levels-window.png'); // Level editor frame
        // Add a frame for Boss Viewer if available, otherwise it will use a generic background
        // this.load.image('bossViewerWindow', 'assets/phaser3/boss-viewer-window.png');

        // --- Load Assets for Specific Demos ---
        this.load.atlas('boing', 'assets/phaser3/boing.png', 'assets/phaser3/boing.json');
        // this.load.spritesheet('juggler', 'assets/phaser3/juggler.png', { frameWidth: 128, frameHeight: 184 }); // Juggler animation not needed if icon launches Boss Viewer
        this.load.image('star', 'assets/phaser3/star2.png');
        this.load.image('eye', 'assets/phaser3/eye.png');

        // Assets for Invaders Demo (and potentially Level Editor / Boss Viewer if they use the same atlas)
        // It's better if LevelEditorScene and BossViewerScene load their specific assets if they differ significantly.
        // However, the 'game_asset' atlas seems common. Load it here? Or ensure LoadScene does?
        // Let's assume LevelEditorScene handles its Firebase load. BossViewer needs game.json and potentially game_asset.
        // Loading game_asset here for BossViewer.
        // Assuming 'game_asset' comes from the evil-invaders structure based on LevelEditorScene
        this.load.atlas('game_asset', 'assets/games/evil-invaders/spritesheet.png', 'assets/games/evil-invaders/spritesheet.json'); // Adjust path/filename as needed

        // Load game.json for BossViewerScene
        this.load.json('game.json', 'assets/games/evil-invaders/game.json'); // Adjust path/filename as needed

        // Original Invaders assets (might be redundant if using game_asset atlas)
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
        // --- Create Animations ---
        // (Remove juggler animation if Juggler demo isn't used directly)
        // this.anims.create({
        //     key: 'juggler',
        //     frames: this.anims.generateFrameNumbers('juggler'),
        //     frameRate: 28,
        //     repeat: -1
        // });

        this.anims.create({
            key: 'boing',
            frames: this.anims.generateFrameNames('boing', { prefix: 'boing', start: 1, end: 14 }),
            frameRate: 28,
            repeat: -1
        });

        // Invaders animations (check if these keys are used by BossViewer or LevelEditor)
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

        // Setup workbench UI
        this.workbench = this.add.graphics({ x: 16, y: 21 });
        this.workbench.fillStyle(0xffffff);
        this.workbench.fillRect(0, 0, this.sys.game.config.width - 105, 20);
        this.workbenchTitle = this.add.image(16, 21, 'workbenchTitle').setOrigin(0);
        this.workbenchIcons = this.add.image(this.sys.game.config.width - 87, 21, 'workbenchIcons').setOrigin(0);

        // --- Demos Window Setup ---
        const disk = this.add.image(16, 64, 'disk').setOrigin(0).setInteractive();
        const demosWindow = this.add.image(0, 0, 'demosWindow').setOrigin(0);

        // Create icons
        const eyesIcon = this.add.image(32, 34, 'eyesIcon', 0).setOrigin(0).setInteractive(); // Player Editor?
        const jugglerIcon = this.add.image(48, 110, 'jugglerIcon', 0).setOrigin(0).setInteractive(); // BOSS VIEWER LAUNCHER
        const starsIcon = this.add.image(230, 40, 'starsIcon', 0).setOrigin(0).setInteractive(); // Level Editor
        const invadersIcon = this.add.image(120, 34, 'invadersIcon', 0).setOrigin(0).setInteractive(); // Enemy Editor?
        // Keep clock and boing as examples
        // const clockIcon = this.add.image(240, 120, 'clockIcon', 0).setOrigin(0).setInteractive();
        // const boingIcon = this.add.image(146, 128, 'boingIcon', 0).setOrigin(0).setInteractive();

        // Assemble container
        const demosContainer = this.add.container(32, 70, [ demosWindow, eyesIcon, jugglerIcon, starsIcon, invadersIcon ]);
        demosContainer.setVisible(false);

        // Add close button zone to the container
        const demosCloseButton = this.add.zone(0, 0, 28, 20).setInteractive({ useHandCursor: true }).setOrigin(0);
        demosContainer.add(demosCloseButton);

        // Make the container draggable using the background image area
        demosContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, demosWindow.width, demosWindow.height), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(demosContainer);

        demosContainer.on('drag', function (pointer, dragX, dragY) {
            // Prevent dragging outside game bounds (optional)
            const maxX = this.scene.sys.game.config.width - this.width;
            const maxY = this.scene.sys.game.config.height - this.height;
            this.x = Phaser.Math.Clamp(dragX, 0, maxX);
            this.y = Phaser.Math.Clamp(dragY, 0, maxY);
        });

        demosCloseButton.on('pointerup', () => {
            demosContainer.setVisible(false);
        });

        disk.on('pointerup', () => {
            demosContainer.setVisible(true);
            // Bring demos window to top when opened
            this.children.bringToTop(demosContainer);
        });

        // --- Icon Click Handlers ---
        eyesIcon.on('pointerup', () => { this.createWindow(Eyes); demosContainer.setVisible(false); }, this); // Example: Launch Eyes
        jugglerIcon.on('pointerup', () => { this.createWindow(BossViewerScene); demosContainer.setVisible(false); }, this); // <<< LAUNCH BOSS VIEWER
        starsIcon.on('pointerup', () => { this.createWindow(LevelEditorScene); demosContainer.setVisible(false); }, this); // Launch Level Editor
        invadersIcon.on('pointerup', () => { this.createWindow(Invaders); demosContainer.setVisible(false); }, this); // Example: Launch Invaders
        clockIcon.on('pointerup', () => { this.createWindow(Clock); demosContainer.setVisible(false); }, this); // Example: Launch Clock
        boingIcon.on('pointerup', () => { this.createWindow(Boing); demosContainer.setVisible(false); }, this); // Example: Launch Boing

        // Bring demos window to top initially if it were visible
        // this.children.bringToTop(demosContainer);

        this.events.on('resize', this.resize, this);
    }

    update() {
        // Game loop logic here if needed
    }

    createWindow (SceneClass)
    {
        // Check if SceneClass and its dimensions are defined
        if (!SceneClass || typeof SceneClass.WIDTH === 'undefined' || typeof SceneClass.HEIGHT === 'undefined') {
            console.error("Cannot create window: Scene class or static dimensions (WIDTH, HEIGHT) missing.", SceneClass);
            return;
        }

        // Ensure dimensions are numbers
        const windowWidth = Number(SceneClass.WIDTH);
        const windowHeight = Number(SceneClass.HEIGHT);

        if (isNaN(windowWidth) || isNaN(windowHeight) || windowWidth <= 0 || windowHeight <= 0) {
            console.error(`Cannot create window: Invalid dimensions (${SceneClass.WIDTH}x${SceneClass.HEIGHT}) for Scene`, SceneClass);
            return;
        }

        // Position windows more centrally initially, avoiding overlap
        const offsetX = (this.count % 5) * 30; // Cascade slightly
        const offsetY = (this.count % 5) * 30;
        const startX = Phaser.Math.Clamp(100 + offsetX, 50, this.sys.game.config.width - windowWidth - 50);
        const startY = Phaser.Math.Clamp(80 + offsetY, 50, this.sys.game.config.height - windowHeight - 50);

        const handle = 'window' + this.count++;

        // Create a Container to hold all window elements (zone, handle, button, scene content)
        // This makes depth management easier.
        const windowContainer = this.add.container(startX, startY);
        windowContainer.setDepth(this.count); // Increment depth for each new window

        // The main zone defines the area for the scene's viewport, relative to the container
        const winZone = this.add.zone(0, 0, windowWidth, windowHeight).setOrigin(0);
        // Note: The 'winZone' is passed to the scene constructor, its x/y relative to the container are 0,0.
        // The scene sets its camera viewport based on the *world* coordinates of the winZone (container.x, container.y).

        // Drag handle (top bar), relative to the container
        const dragHandleHeight = 28; // Match close button size
        const dragHandle = this.add.zone(0, 0, windowWidth, dragHandleHeight)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true }); // Make handle draggable

        // Close button, relative to the container
        const closeButtonSize = 28;
        const closeButton = this.add.zone(0, 0, closeButtonSize, closeButtonSize) // Top-left corner
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });

        // Add zones to the container
        windowContainer.add([winZone, dragHandle, closeButton]); // Order matters for potential hit detection, though depth is primary

        // Instantiate the scene class, passing handle and the *windowContainer*
        // The scene will use container.x/y for its viewport position.
        const demo = new SceneClass(handle, windowContainer);

        // Make the dragHandle zone draggable
        this.input.setDraggable(dragHandle);

        dragHandle.on('drag', (pointer, dragX, dragY) => {
             // dragX/dragY are the coordinates where the handle is being dragged *to* in the world.
             // Update the container's position.
             windowContainer.x = dragX;
             windowContainer.y = dragY;

            // Clamp position within game bounds (optional)
             const maxX = this.sys.game.config.width - windowWidth;
             const maxY = this.sys.game.config.height - windowHeight;
             windowContainer.x = Phaser.Math.Clamp(windowContainer.x, 0, maxX);
             windowContainer.y = Phaser.Math.Clamp(windowContainer.y, 0, maxY);

            // The scene's refresh method should read the container's updated x/y
            if (demo && typeof demo.refresh === 'function') {
                demo.refresh();
            }
        });

         // Bring window to top when drag starts
         dragHandle.on('pointerdown', () => {
             this.children.bringToTop(windowContainer);
         });

        // Add click listener to the close button zone
        closeButton.on('pointerup', () => {
            console.log(`Closing window: ${handle}`);
            // Stop and remove the scene instance
            if (this.scene.isActive(handle)) { // Use isActive for check
                 this.scene.stop(handle);
            }
            // Check if scene exists before removing (it might already be stopped/removed)
            if (this.scene.get(handle)) {
                 this.scene.remove(handle);
            } else {
                 console.warn(`Scene ${handle} not found or already removed.`);
            }
            // Destroy the entire container and its children
            windowContainer.destroy();
        });

        // Add the scene to Phaser's scene manager and start it
        try {
            this.scene.add(handle, demo, true); // Start the scene automatically
            console.log(`Launched window scene: ${handle}`);
        } catch (e) {
            console.error(`Error adding or starting scene ${handle}:`, e);
            // Cleanup container if scene add fails
            windowContainer.destroy();
        }
    }


    resize (width, height)
    {
        if (width === undefined) { width = this.sys.game.config.width; }
        if (height === undefined) { height = this.sys.game.config.height; }

        // Phaser 4 cameras typically adjust automatically, but UI elements need manual update.
        // this.cameras.resize(width, height); // Usually not needed

        this.workbench.clear();
        this.workbench.fillStyle(0xffffff);
        this.workbench.fillRect(0, 0, width - 105, 20);

        this.workbenchIcons.x = (width - 87);
    }
}

export default EditorScene;