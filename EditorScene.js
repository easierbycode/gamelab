// Import the demo scenes (assuming they exist in the same directory)
import Eyes from './Eyes.js';
// import Juggler from './Juggler.js'; // Juggler icon now launches BossViewer
import Stars from './Stars.js';
import Invaders from './Invaders.js';
import Clock from './Clock.js';
import Boing from './Boing.js';
import LevelEditorScene from './LevelEditorScene.js';
import BossViewerScene from './bosses.js'; // Import the new Boss Viewer Scene
import Example from './specs/Example.js'; // Import Example scene
import Example2 from './specs/Example2.js'; // Import Example2 scene
import Example3 from './specs/Example3.js'; // Import Example3 scene
// import { GameScene } from 'https://codepen.io/CodeMonkeyGames/pen/ZYYxRGY.js'; // Import MyScene
import GameScene from './specs/Example4.js'; // Import MyScene


class EditorScene extends Phaser.Scene {

    constructor() {
        super({ key: 'title-scene' }); // Changed key to avoid conflict with potential future 'editor-scene' key
        this.count = 0; // For window handles
        this.workbench;
        this.workbenchTitle;
        this.workbenchIcons;
        this.activeWindow = null; // Track the window currently being interacted with
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
        this.load.image('exampleIcon', 'assets/phaser3/story-viewer.png'); // Add an icon for Example scene
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

         // Assets for Example scene (already loaded in Example.js preload, but ensure they are available)
         this.load.image('button', 'https://play.rosebud.ai/assets/button.png'); // Needed by Example.js
         this.load.spritesheet('trump', 'https://play.rosebud.ai/assets/trump-eyes.png?QhOE', { frameWidth: 26, frameHeight: 26 }); // Needed by Example.js
         this.load.spritesheet('evogi', 'https://play.rosebud.ai/assets/evogi-face.png?4Ilr', { frameWidth: 180, frameHeight: 240, startFrame: 0, endFrame: 18 }); // Needed by Example.js
         this.load.spritesheet('ai', 'https://play.rosebud.ai/assets/ai-bg.png?DQLM', { frameWidth: 360, frameHeight: 480 }); // Needed by Example.js
         this.load.spritesheet('ai-red', 'https://play.rosebud.ai/assets/ai-bg.png?IIpx', { frameWidth: 360, frameHeight: 480 }); // Needed by Example.js
         this.load.image('font', 'https://play.rosebud.ai/assets/font.png?KXdX'); // Needed by Example.js
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
        const disk = this.add.image(16, 64, 'disk').setOrigin(0).setInteractive({ useHandCursor: true });
        const demosWindow = this.add.image(0, 0, 'demosWindow').setOrigin(0);

        // Create icons
        const eyesIcon = this.add.image(32, 34, 'eyesIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true }); // Player Editor?
        const jugglerIcon = this.add.image(48, 110, 'jugglerIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true }); // BOSS VIEWER LAUNCHER
        const starsIcon = this.add.image(230, 40, 'starsIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true }); // Level Editor
        const invadersIcon = this.add.image(120, 34, 'invadersIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true }); // Enemy Editor?
        const clockIcon = this.add.image(240, 120, 'clockIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true });
        const boingIcon = this.add.image(146, 128, 'boingIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true });
        const exampleIcon = this.add.image(190, 120, 'exampleIcon', 0).setOrigin(0).setInteractive({ useHandCursor: true }).setScale(0.5); // Added example icon

        // Assemble container
        const demosContainer = this.add.container(32, 70, [ demosWindow, eyesIcon, jugglerIcon, starsIcon, invadersIcon, clockIcon, boingIcon, exampleIcon ]);
        demosContainer.setVisible(false);

        // Add close button zone to the container
        const demosCloseButton = this.add.zone(0, 0, 28, 20).setInteractive({ useHandCursor: true }).setOrigin(0);
        demosContainer.add(demosCloseButton);

        // Make the container draggable using the background image area
        demosContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, demosWindow.width, demosWindow.height), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(demosContainer);

        demosContainer.on('dragstart', () => {
             this.children.bringToTop(demosContainer);
        });
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
        eyesIcon.on('pointerup', () => { this.createWindow(Example2); demosContainer.setVisible(false); }, this); // eyesIcon launches Example2
        jugglerIcon.on('pointerup', () => { this.createWindow(BossViewerScene); demosContainer.setVisible(false); }, this); // jugglerIcon launches BossViewer
        starsIcon.on('pointerup', () => { this.createWindow(LevelEditorScene); demosContainer.setVisible(false); }, this); // starsIcon launches LevelEditorScene
        invadersIcon.on('pointerup', () => { this.createWindow(Invaders); demosContainer.setVisible(false); }, this); // invadersIcon launches Invaders
        clockIcon.on('pointerup', () => { this.createWindow(Example3); demosContainer.setVisible(false); }, this); // clockIcon launches Example3
        boingIcon.on('pointerup', () => { this.createWindow(GameScene); demosContainer.setVisible(false); }, this); // boingIcon launches MyScene
        exampleIcon.on('pointerup', () => { this.createWindow(Example); demosContainer.setVisible(false); }, this); // exampleIcon launches Example

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
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        // Create a Container to hold all window elements (zone, handle, button, scene content)
        const windowContainer = this.add.container(startX, startY);
        windowContainer.setDepth(this.count); // Increment depth for each new window
        windowContainer.setData({
             id: handle,
             originalX: startX,
             originalY: startY,
             originalWidth: windowWidth,
             originalHeight: windowHeight,
             isFullscreen: false
        });

        // The main zone defines the area for the scene's viewport, relative to the container
        const winZone = this.add.zone(0, 0, windowWidth, windowHeight).setOrigin(0);
        windowContainer.setData('winZone', winZone); // Store zone reference

        // Drag handle (top bar), relative to the container
        const dragHandleHeight = 28; // Match close button size
        const dragHandle = this.add.zone(0, 0, windowWidth, dragHandleHeight)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true }); // Make handle draggable
        windowContainer.setData('dragHandle', dragHandle); // Store handle reference

        // Close button, relative to the container (top-left)
        const closeButtonSize = 28;
        const closeButton = this.add.zone(0, 0, closeButtonSize, 20) // 28x20 hit area
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });

        // Fullscreen button, relative to the container (top-right)
        const fullscreenButtonSizeX = 29;
        const fullscreenButtonSizeY = 22;
        const fullscreenButton = this.add.zone(windowWidth - fullscreenButtonSizeX, 0, fullscreenButtonSizeX, fullscreenButtonSizeY)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });
        windowContainer.setData('fullscreenButton', fullscreenButton); // Store reference

        // Add zones to the container
        // Order: Main zone, drag handle, close button, fullscreen button
        windowContainer.add([winZone, dragHandle, closeButton, fullscreenButton]);

        // Instantiate the scene class, passing handle and the *windowContainer*
        const demo = new SceneClass(handle, windowContainer);
        windowContainer.setData('sceneInstance', demo); // Store scene instance reference

        // Make the dragHandle zone draggable
        this.input.setDraggable(dragHandle);

        dragHandle.on('pointerdown', () => {
            if (windowContainer.getData('isFullscreen')) return; // Don't bring to top if fullscreen
            this.children.bringToTop(windowContainer);
            this.activeWindow = windowContainer;
        });

        dragHandle.on('drag', (pointer, dragX, dragY) => {
             if (windowContainer.getData('isFullscreen')) return; // Prevent dragging when fullscreen

             // dragX/dragY are the coordinates where the handle is being dragged *to* in the world.
             windowContainer.x = dragX;
             windowContainer.y = dragY;

            // Clamp position within game bounds
             const currentWidth = windowContainer.getData('winZone').width; // Use zone width
             const currentHeight = windowContainer.getData('winZone').height; // Use zone height
             const maxX = gameWidth - currentWidth;
             const maxY = gameHeight - currentHeight;
             windowContainer.x = Phaser.Math.Clamp(windowContainer.x, 0, maxX);
             windowContainer.y = Phaser.Math.Clamp(windowContainer.y, 0, maxY);

            // Notify the child scene to update its camera position
            if (demo && typeof demo.refresh === 'function') {
                demo.refresh();
            }
        });

        // Close button listener
        closeButton.on('pointerup', () => {
            console.log(`Closing window: ${handle}`);
            const sceneInstance = windowContainer.getData('sceneInstance');
            // Stop and remove the scene instance
            if (sceneInstance && this.scene.isActive(handle)) {
                 this.scene.stop(handle);
            }
            // Check if scene exists before removing
            if (this.scene.get(handle)) {
                 this.scene.remove(handle);
            } else {
                 console.warn(`Scene ${handle} not found or already removed.`);
            }
            // Destroy the entire container and its children
            windowContainer.destroy();
            if (this.activeWindow === windowContainer) {
                 this.activeWindow = null;
            }
        });

        // Fullscreen button listener
        fullscreenButton.on('pointerup', () => {
            const isFullscreen = windowContainer.getData('isFullscreen');
            const sceneInstance = windowContainer.getData('sceneInstance');
            const winZoneRef = windowContainer.getData('winZone');
            const dragHandleRef = windowContainer.getData('dragHandle');
            const fsButtonRef = windowContainer.getData('fullscreenButton');

            if (!sceneInstance || !winZoneRef || !dragHandleRef || !fsButtonRef) {
                console.error("Window container data missing for fullscreen toggle.");
                return;
            }

            if (isFullscreen) {
                // --- Exit Fullscreen ---
                const { originalX, originalY, originalWidth, originalHeight } = windowContainer.getData();

                // Restore container position
                windowContainer.setPosition(originalX, originalY);

                // Restore zone size
                winZoneRef.setSize(originalWidth, originalHeight);
                 winZoneRef.input.hitArea.setSize(originalWidth, originalHeight); // Update hit area if zone is interactive

                // Restore drag handle size and interactivity
                 dragHandleRef.setSize(originalWidth, dragHandleHeight);
                 dragHandleRef.input.hitArea.setSize(originalWidth, dragHandleHeight);
                 dragHandleRef.setInteractive(); // Re-enable dragging

                 // Reposition fullscreen button
                 fsButtonRef.setPosition(originalWidth - fullscreenButtonSizeX, 0);

                // Notify scene to resize camera and internal elements
                 if (typeof sceneInstance.resizeScene === 'function') {
                     sceneInstance.resizeScene(originalWidth, originalHeight);
                 }
                // Refresh position (important AFTER resize)
                 if (typeof sceneInstance.refresh === 'function') {
                      sceneInstance.refresh();
                 }


                windowContainer.setData('isFullscreen', false);
                console.log(`${handle} exited fullscreen`);

            } else {
                // --- Enter Fullscreen ---
                 // Store current position before moving (in case it wasn't the original)
                 windowContainer.setData('originalX', windowContainer.x);
                 windowContainer.setData('originalY', windowContainer.y);

                // Move container to top-left
                windowContainer.setPosition(0, 0);

                // Resize zone to game dimensions
                winZoneRef.setSize(gameWidth, gameHeight);
                 winZoneRef.input?.hitArea.setSize(gameWidth, gameHeight); // Update hit area if zone is interactive

                 // Resize drag handle (make it cover top) and disable dragging
                 dragHandleRef.setSize(gameWidth, dragHandleHeight);
                 dragHandleRef.input?.hitArea.setSize(gameWidth, dragHandleHeight);
                 dragHandleRef.disableInteractive(); // Disable dragging

                 // Reposition fullscreen button
                 fsButtonRef.setPosition(gameWidth - fullscreenButtonSizeX, 0);

                // Notify scene to resize camera and internal elements
                 if (typeof sceneInstance.resizeScene === 'function') {
                     sceneInstance.resizeScene(gameWidth, gameHeight);
                 }
                 // Refresh position (important AFTER resize)
                 if (typeof sceneInstance.refresh === 'function') {
                      sceneInstance.refresh();
                 }

                 // Bring this window to the very top
                 this.children.bringToTop(windowContainer);

                windowContainer.setData('isFullscreen', true);
                console.log(`${handle} entered fullscreen`);
            }
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

        // Handle resizing of fullscreen windows
        this.children.each(child => {
             if (child instanceof Phaser.GameObjects.Container && child.getData('isFullscreen')) {
                 const sceneInstance = child.getData('sceneInstance');
                 const winZoneRef = child.getData('winZone');
                 const dragHandleRef = child.getData('dragHandle');
                 const fsButtonRef = child.getData('fullscreenButton');
                 const dragHandleHeight = 28;
                 const fullscreenButtonSizeX = 29;


                 if (sceneInstance && winZoneRef && dragHandleRef && fsButtonRef) {
                     // Resize zone
                     winZoneRef.setSize(width, height);
                     winZoneRef.input?.hitArea.setSize(width, height);

                     // Resize drag handle
                     dragHandleRef.setSize(width, dragHandleHeight);
                     dragHandleRef.input?.hitArea.setSize(width, dragHandleHeight);

                     // Reposition fullscreen button
                     fsButtonRef.setPosition(width - fullscreenButtonSizeX, 0);

                     // Notify scene
                     if (typeof sceneInstance.resizeScene === 'function') {
                         sceneInstance.resizeScene(width, height);
                     }
                     if (typeof sceneInstance.refresh === 'function') {
                          sceneInstance.refresh(); // Ensure camera position is updated (should be 0,0)
                     }
                 }
             }
        });
    }
}

export default EditorScene;