// File: LevelEditorScene.js
// Adapted from specs/LevelEditorScene.ts
// import Phaser from 'phaser';

// ESM Firebase web import
// Make sure you have configured Firebase correctly in your project.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Import gamepad manager (adjust path from root)
import { createGamepadManager } from "./gamepadManager.js";

// Import layout generator functions (from root directory)
import {
    analyzeEnemyList,
    generateAestheticLayout,
    shuffleArray,
} from "./layoutGenerator.js";

// Import firebase config (path is correct from root)
import { firebaseConfig } from "./firebase-config.js";


export default class LevelEditorScene extends Phaser.Scene {
    // --- Window Properties ---
    parent; // Reference to the parent zone in EditorScene
    currentWidth = LevelEditorScene.WIDTH; // Store current dimensions
    currentHeight = LevelEditorScene.HEIGHT;

    // Grid and stage properties
    gridRows = 45;
    gridCols = 8;
    // Cell width/height will be calculated dynamically
    cellWidth = 50;
    cellHeight = 50;
    enemyList = [];
    currentStage = 0;
    availableStages = [];

    // Tools and selection state
    currentTool = null;
    selectedEnemy = null;
    selectedItem = null;
    lastSelectionTime = 0;
    SELECTION_COOLDOWN = 500; // ms
    lastRandomizeTime = 0;
    RANDOMIZE_COOLDOWN = 1000; // ms
    menuOpen = false; // Flag to track if a selection menu is open

    // Firebase properties
    app;
    database;

    // Game data
    enemyData = {};
    itemData = { // Use 'const' if it doesn't change after initialization
        '1': { name: "SHOOT_NAME_BIG", texture: ["powerupBig0.png", "powerupBig1.png"] },
        '2': { name: "SHOOT_NAME_3WAY", texture: ["powerup3way0.png", "powerup3way1.png"] },
        '3': { name: "SHOOT_SPEED_HIGH", texture: ["speedupItem0.png", "speedupItem1.png"] },
        '9': { name: "BARRIER", texture: ["barrierItem0.png", "barrierItem1.png"] }
    };
    hasUnsavedChanges = false;

    // Phaser specific properties
    bg = null; // Background frame image
    palettePanel;
    paletteIcons = [];
    enemyGroup;
    saveButton;
    saveButtonBg; // Added for consistency
    gridGraphics; // Added for consistency
    cursorPreview = null;
    enemySelectContainer = null;
    enemySelectOverlay = null;
    itemSelectContainer = null;
    itemSelectOverlay = null;
    activeToolButton = null;
    loadingText = null; // Added for consistency
    gamepadInfoButton = null; // Added for consistency
    gamepadHelpPanel = null; // Added for consistency
    gamepadHelpOverlay = null; // Added for consistency
    tempMessageText = null; // For save/load messages


    // Input properties
    mouseX = 0;
    mouseY = 0;
    placeObjectHandler = null;

    // Gamepad properties
    gamepadEnabled = true; // Can be controlled via config or setting
    gamepadManager;

    // Atlas loading flag
    atlasLoaded = false;

    // Add a handler property for the beforeunload listener
    beforeUnloadHandler = null;

    // --- Constructor for Window Scene ---
    constructor(handle, parent) {
         super({ key: handle }); // Use the handle passed by EditorScene
         this.parent = parent; // Store the parent zone reference

        // Initialize Firebase App - Moved here to ensure it happens once per instance
        try {
             this.app = initializeApp(firebaseConfig);
             this.database = getDatabase(this.app);
        } catch (error) {
             console.error("Firebase initialization failed:", error);
             // Handle initialization error appropriately
             this.app = null;
             this.database = null;
        }
    }

    preload() {
        // Atlas loading logic remains the same, triggered when scene starts
        if (!this.database) {
            console.error("Firebase Database not initialized. Cannot load assets.");
             this.add.text(
                 LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2, // Use initial static size for preload text
                 "Error: Cannot connect to database.", { fontSize: "20px", color: "#ff0000" }
             ).setOrigin(0.5);
            return;
        }
        // Load the necessary 'game_asset' atlas from Firebase
        const atlasRef = ref(this.database, "atlases/evil-invaders");
        get(atlasRef).then(atlasesSnapshot => {
            if (atlasesSnapshot.exists()) {
                const atlasVal = atlasesSnapshot.val();
                if (!atlasVal.png || !atlasVal.json) {
                    console.error("Atlas data from Firebase is incomplete (missing png or json).");
                    this.atlasLoaded = false;
                     if (this.scene.isActive()) {
                         this.loadingText?.setText("Error: Incomplete atlas data.").setColor('#ffcc00');
                     }
                    return;
                }
                const base64PNG = "data:image/png;base64," + atlasVal.png;
                const atlasJSON = JSON.parse(atlasVal.json);

                this.textures.addBase64('game_asset', base64PNG);
                this.textures.once('onload', () => {
                    console.log("Base64 texture loaded for game_asset.");
                    try {
                         // Check if texture still exists before adding hash (might have been removed on restart)
                         if (this.textures.exists('game_asset')) {
                              this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                              this.atlasLoaded = true;
                              console.log("Atlas JSON Hash added for game_asset.");
                              if (this.scene.isActive() && !this.scene.isSleeping()) {
                                   console.log("Restarting scene after atlas load.");
                                   this.scene.restart({ parent: this.parent }); // Pass parent again on restart
                              }
                         } else {
                              console.warn("Texture 'game_asset' removed before hash could be added.");
                              this.atlasLoaded = false;
                         }
                    } catch (e) {
                        console.error("Error adding Atlas JSON Hash:", e);
                        this.atlasLoaded = false;
                        if (this.scene.isActive()) this.loadingText?.setText("Error: Failed to process atlas data.").setColor('#ffcc00');
                    }
                });

                 // Fallback / Redundancy - If texture exists but hash adding failed initially
                 if (this.textures.exists('game_asset') && !this.atlasLoaded) {
                     console.log("Texture exists, attempting to add atlas hash directly.");
                     try {
                         this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                         this.atlasLoaded = true;
                          console.log("Atlas JSON Hash added directly for game_asset.");
                         if (this.scene.isActive() && !this.scene.isSleeping()) {
                              console.log("Restarting scene after direct atlas hash addition.");
                              this.scene.restart({ parent: this.parent });
                         }
                     } catch (e) {
                         console.error("Error adding Atlas JSON Hash directly:", e);
                         this.atlasLoaded = false;
                         if (this.scene.isActive()) this.loadingText?.setText("Error: Failed to process atlas data.").setColor('#ffcc00');
                     }
                 }

                // Timeout fallback (less reliable, might cause issues if restart happens late)
                // Consider removing if the above logic is sufficient
                /*
                setTimeout(() => {
                    if (!this.atlasLoaded && this.textures.exists('game_asset')) {
                        console.log("Fallback timeout: Adding atlas hash.");
                        try {
                            this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                            this.atlasLoaded = true;
                            console.log("Atlas JSON Hash added via fallback timeout.");
                             if (this.scene.isActive() && !this.scene.isSleeping()) {
                                 console.log("Restarting scene after fallback atlas load.");
                                 this.scene.restart({ parent: this.parent });
                             }
                        } catch (e) {
                            console.error("Error adding Atlas JSON Hash in fallback:", e);
                            this.atlasLoaded = false;
                            if (this.scene.isActive()) this.loadingText?.setText("Error: Failed to process atlas data (timeout).").setColor('#ffcc00');
                        }
                    } else if (!this.textures.exists('game_asset')) {
                         console.warn("Fallback timeout: Texture 'game_asset' still doesn't exist.");
                         if (this.scene.isActive()) this.loadingText?.setText("Error: Texture load timed out.").setColor('#ffcc00');
                    }
                }, 1500); // Increased timeout
                */

            } else {
                console.error("Atlas 'evil-invaders' not found in Firebase!");
                this.atlasLoaded = false;
                 if (this.scene.isActive()) {
                      this.loadingText?.setText("Error: Atlas not found in database.").setColor('#ffcc00');
                 }
            }
        }).catch(error => {
            console.error("Error loading atlas from Firebase:", error);
             this.atlasLoaded = false;
             if (this.scene.isActive()) {
                  this.loadingText?.setText("Error: Could not load atlas.").setColor('#ffcc00');
             }
        });

        // Use static dimensions for initial loading text position
        this.loadingText = this.add.text(
            LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2,
            "Loading Assets...", { fontSize: "20px", color: "#fff", align: "center" }
        ).setOrigin(0.5);
        this.events.once('shutdown', () => { if (this.loadingText) this.loadingText.destroy(); });
    }

     // Method called by EditorScene when the parent zone is dragged
     refresh ()
     {
         if (!this.parent) return;
         // Update camera position to match the parent zone
         this.cameras.main.setPosition(this.parent.x, this.parent.y);

         // Bring this scene's display list to the top (within Phaser's scene manager)
         if (this.sys && this.sys.bringToTop) {
              this.sys.bringToTop();
         }
         // console.log(`Refreshed ${this.scene.key} position to ${this.parent.x}, ${this.parent.y}`);
     }

    async create(data) {
         // Handle restart: Get parent reference if passed during restart
          if (data && data.parent) {
              this.parent = data.parent;
              console.log(`Scene restarted, using parent zone from data.`);
          }

          // Ensure parent zone reference exists
          if (!this.parent) {
               console.error(`${this.scene.key}: Parent zone reference is missing. Cannot create scene correctly.`);
               this.loadingText?.setText("Initialization Error!").setColor('#ff0000');
               return;
          }

         // --- Camera and Viewport Setup ---
         // Set camera viewport to match the parent zone's position and this scene's defined size
         this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
         // Optional: Set background color for area outside the frame image (if image has transparency)
         this.cameras.main.setBackgroundColor(0x000000); // Black background
         // Ensure this scene's camera doesn't scroll with the main EditorScene camera
         this.cameras.main.setScroll(0, 0);

         if (this.loadingText) {
             this.loadingText.destroy();
             this.loadingText = null;
         }
         if (!this.textures.exists('game_asset') || !this.atlasLoaded) {
             console.error("'game_asset' texture atlas not loaded or ready. Cannot proceed.");
             this.add.text(this.currentWidth / 2, this.currentHeight / 2,
                 "Error: Assets not loaded.\nPlease wait or refresh.", { fontSize: "16px", color: "#ff0000", align: "center", wordWrap: { width: this.currentWidth - 40 } }).setOrigin(0.5);
             return;
         }
         if (!this.database) {
             console.error("Firebase Database not initialized. Cannot proceed.");
              this.add.text(this.currentWidth / 2, this.currentHeight / 2,
                 "Error: Database connection failed.", { fontSize: "16px", color: "#ff0000", align: "center", wordWrap: { width: this.currentWidth - 40 } }).setOrigin(0.5);
             return;
         }

        console.log("LevelEditorScene create started within window");

        const loadingDataText = this.add.text(
            this.currentWidth / 2, this.currentHeight / 2, // Center within window
            "Loading level data...",
            { fontSize: "20px", color: "#fff", backgroundColor: '#000a', padding: { x: 10, y: 5 } }
        ).setOrigin(0.5).setDepth(2000); // High depth within this scene

        try {
            await this.fetchGameStructure();
            await Promise.all([this.fetchEnemyData(), this.fetchEnemyList()]);
            loadingDataText.destroy();

            if (!this.enemyList || this.enemyList.length === 0) {
                this.initializeDefaultEnemyList();
            } else {
                 if (!Array.isArray(this.enemyList) || !this.enemyList.every(row => Array.isArray(row))) {
                     console.warn(`Invalid enemyList structure loaded for stage ${this.currentStage}. Resetting.`);
                     this.initializeDefaultEnemyList();
                 }
            }

            // Calculate cell size *before* drawing grid or placing enemies
            this.calculateCellSize();

            this.drawGrid(); // Draws based on cellWidth/Height
            this.createPalettePanel(); // Creates UI relative to window size
            this.enemyGroup = this.add.group();
            this.populateGridFromEnemyList(); // Places sprites based on cellWidth/Height

            this.input.off("pointerdown", this.handlePlaceObject, this);
            this.input.on("pointerdown", this.handlePlaceObject, this);
            this.placeObjectHandler = this.input;

            if (this.gamepadEnabled) {
                this.gamepadManager = createGamepadManager(this);
                if (this.gamepadManager) {
                     this.gamepadManager.cursor.x = this.currentWidth / 2;
                     this.gamepadManager.cursor.y = this.currentHeight / 2;
                     this.gamepadManager.sceneWidth = this.currentWidth; // Pass initial dimensions
                     this.gamepadManager.sceneHeight = this.currentHeight;
                }
                this.createGamepadInstructions(); // Creates button relative to window size
            }

             window.removeEventListener("beforeunload", this.beforeUnloadHandler);
             this.beforeUnloadHandler = (e) => {
                 if (this.hasUnsavedChanges) {
                     e.preventDefault();
                     e.returnValue = "Unsaved changes will be lost!";
                 }
             };
             window.addEventListener("beforeunload", this.beforeUnloadHandler);

            console.log("LevelEditorScene creation complete within window.");

        } catch (error) {
            loadingDataText?.destroy(); // Check if exists
            console.error("Error during LevelEditorScene create:", error);
              this.add.text(this.currentWidth / 2, this.currentHeight / 2 + 40,
                 "Failed to load game data.", { fontSize: "16px", color: "#ffcc00", align: "center" }).setOrigin(0.5);
        }

        // Add the window frame background image last
        this.bg = this.add.image(0, 0, 'levels-window').setOrigin(0).setDepth(2000);
        this.bg.setDisplaySize(this.currentWidth, this.currentHeight); // Scale frame initially
    }


    // Cleanup on shutdown
    shutdown() {
        console.log(`LevelEditorScene (${this.scene.key}) shutdown.`);
        if (this.beforeUnloadHandler) {
            window.removeEventListener("beforeunload", this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        this.input?.off("pointerdown", this.handlePlaceObject, this);
        this.input?.off('wheel');
         this.textures?.off('onload');
         this.events?.off('shutdown');
        this.gamepadManager?.destroyCursorVisual();
        this.cleanupGameObjects();

         // Explicitly destroy UI elements created directly on the scene
         if (this.saveButton && this.saveButton.destroy) this.saveButton.destroy();
         if (this.saveButtonBg && this.saveButtonBg.destroy) this.saveButtonBg.destroy();
         if (this.gridGraphics && this.gridGraphics.destroy) this.gridGraphics.destroy();
         if (this.gamepadInfoButton && this.gamepadInfoButton.destroy) this.gamepadInfoButton.destroy();
         if (this.gamepadHelpPanel && this.gamepadHelpPanel.destroy) this.gamepadHelpPanel.destroy();
         if (this.gamepadHelpOverlay && this.gamepadHelpOverlay.destroy) this.gamepadHelpOverlay.destroy();
         if (this.palettePanel && this.palettePanel.destroy) this.palettePanel.destroy(); // Palette container
         if (this.bg && this.bg.destroy) this.bg.destroy(); // Destroy background frame
         if (this.tempMessageText && this.tempMessageText.destroy) this.tempMessageText.destroy(); // Destroy message

         // Nullify references
         this.palettePanel = null;
         this.saveButton = null;
         this.saveButtonBg = null;
         this.gridGraphics = null;
         this.gamepadInfoButton = null;
         this.gamepadHelpPanel = null;
         this.gamepadHelpOverlay = null;
         this.enemyGroup = null; // Group is likely destroyed in cleanup, but nullify ref
         this.loadingText = null;
         this.bg = null;
         this.tempMessageText = null;
    }


    update(time, delta) {
        // Pointer position relative to this scene's viewport/camera
        const pointer = this.input.activePointer;
        const scenePointerX = pointer.x - this.cameras.main.x;
        const scenePointerY = pointer.y - this.cameras.main.y;

        const isGamepadControlling = this.gamepadManager?.isEnabled && this.gamepadManager?.connected;

        if (!isGamepadControlling) {
            // Use pointer position relative to this scene's viewport
            this.mouseX = scenePointerX;
            this.mouseY = scenePointerY;

            // Update cursor preview position if it exists
            if (this.cursorPreview && this.cursorPreview.active) {
                 if (this.cursorPreview.setPosition) {
                     this.cursorPreview.setPosition(this.mouseX, this.mouseY);
                 } else {
                     this.cursorPreview.x = this.mouseX;
                     this.cursorPreview.y = this.mouseY;
                 }
            }
        }

        if (this.gamepadManager && this.gamepadEnabled) {
             this.gamepadManager.sceneWidth = this.currentWidth; // Keep dimensions updated
             this.gamepadManager.sceneHeight = this.currentHeight;
             this.gamepadManager.update();

            if (isGamepadControlling) {
                // Gamepad cursor position is already relative to its scene/bounds
                this.mouseX = this.gamepadManager.cursor.x;
                this.mouseY = this.gamepadManager.cursor.y;
                 // Gamepad manager should update the cursorPreview visual
                 if (this.cursorPreview && this.cursorPreview.active) {
                      if (this.cursorPreview.setPosition) {
                          this.cursorPreview.setPosition(this.mouseX, this.mouseY);
                      } else {
                          this.cursorPreview.x = this.mouseX;
                          this.cursorPreview.y = this.mouseY;
                      }
                 }
            }
        }
    }

    // --- Data Fetching --- (No changes needed here)

    async fetchGameStructure() {
         if (!this.database) throw new Error("Database not available for fetchGameStructure");
        const snapshot = await get(ref(this.database, "games/evil-invaders"));
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            this.availableStages = Object.keys(gameData)
                .filter(k => /^stage\d+$/.test(k))
                .map(k => parseInt(k.slice(5), 10))
                .sort((a, b) => a - b);

            if (this.availableStages.length === 0) {
                this.availableStages = [0];
            }
             this.currentStage = this.availableStages.includes(this.currentStage) ? this.currentStage : this.availableStages[0];
            console.log("Available stages:", this.availableStages, "Current:", this.currentStage);
        } else {
            this.availableStages = [0];
            this.currentStage = 0;
            console.log("No game data found, defaulting to stage 0.");
        }
    }

    async fetchEnemyData() {
         if (!this.database) throw new Error("Database not available for fetchEnemyData");
        const snapshot = await get(ref(this.database, "games/evil-invaders/enemyData"));
        this.enemyData = snapshot.exists() ? snapshot.val() : {};
        console.log("Enemy data fetched:", Object.keys(this.enemyData).length, "entries");
    }

    async fetchEnemyList() {
         if (!this.database) throw new Error("Database not available for fetchEnemyList");
        const path = `games/evil-invaders/stage${this.currentStage}/enemylist`;
        console.log(`Fetching enemy list from: ${path}`);
        const snapshot = await get(ref(this.database, path));
        if (snapshot.exists()) {
            this.enemyList = snapshot.val();
            if (!Array.isArray(this.enemyList) || !this.enemyList.every(row => Array.isArray(row))) {
                console.warn(`Invalid enemyList structure loaded for stage ${this.currentStage}. Resetting.`);
                this.initializeDefaultEnemyList();
            } else {
                 // Validate and pad/trim rows/cols based on current grid dimensions
                 this.enemyList = this.enemyList.slice(0, this.gridRows); // Trim rows
                 while (this.enemyList.length < this.gridRows) { // Pad rows
                     this.enemyList.push(Array(this.gridCols).fill("00"));
                 }
                 this.enemyList = this.enemyList.map(row => {
                     if (!Array.isArray(row)) row = [];
                     row = row.slice(0, this.gridCols); // Trim cols
                     while (row.length < this.gridCols) row.push("00"); // Pad cols
                     return row.map(cell => (typeof cell === 'string' && cell.length === 2) ? cell : "00"); // Validate cell format
                 });
                console.log(`Enemy list for stage ${this.currentStage} fetched and validated successfully.`);
            }
        } else {
            console.log(`No enemy list found for stage ${this.currentStage}. Initializing default.`);
            this.initializeDefaultEnemyList();
        }
    }

    initializeDefaultEnemyList() {
        this.enemyList = Array.from({ length: this.gridRows }, () =>
            Array(this.gridCols).fill("00")
        );
    }

    // --- UI Creation ---

     calculateCellSize() {
         const paletteHeight = 70; // Height reserved for the top palette
         const padding = 10; // Padding inside the window frame
         const usableWidth = this.currentWidth - (padding * 2);
         const usableHeight = this.currentHeight - paletteHeight - padding; // Available height for the grid itself

         this.cellWidth = usableWidth / this.gridCols;
         // Adjust cell height based on available space, but keep a minimum reasonable height
         this.cellHeight = Math.max(20, usableHeight / this.gridRows);
          console.log(`Calculated cell size: ${this.cellWidth.toFixed(1)}x${this.cellHeight.toFixed(1)} for ${this.currentWidth}x${this.currentHeight} window`);
     }

    drawGrid() {
        if (this.gridGraphics) this.gridGraphics.destroy();

        const paletteHeight = 70;
        const gridTotalWidth = this.gridCols * this.cellWidth;
        // Cap drawing height to window height minus palette
        const gridDrawHeight = Math.min(this.gridRows * this.cellHeight, this.currentHeight - paletteHeight);
        const gridStartY = paletteHeight; // Start grid below palette

        this.gridGraphics = this.add.graphics({
             x: 0, // Position grid relative to scene origin
             y: gridStartY,
             lineStyle: { width: 1, color: 0xffffff, alpha: 0.2 } // Dimmer grid
        }).setDepth(1); // Behind enemies

        for (let r = 0; r <= this.gridRows; r++) {
             const yPos = r * this.cellHeight;
             if (yPos > gridDrawHeight) break; // Stop drawing lines outside grid area
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(0, yPos, gridTotalWidth, yPos));
        }
        for (let c = 0; c <= this.gridCols; c++) {
            const xPos = c * this.cellWidth;
            if(xPos > gridTotalWidth + 1) break; // Ensure we don't draw past the calculated width
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(xPos, 0, xPos, gridDrawHeight));
        }
        // Add camera scroll? Maybe later if grid height exceeds display area significantly.
        // this.cameras.main.setBounds(0, 0, gridTotalWidth, paletteHeight + this.gridRows * this.cellHeight);
        // this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        //      this.cameras.main.scrollY += deltaY * 0.5;
        // });

        console.log(`Grid drawn (${this.gridCols}x${this.gridRows}). Cell: ${this.cellWidth.toFixed(1)}x${this.cellHeight}`);
    }

    createPalettePanel() {
         // Destroy previous elements first
         if (this.palettePanel) this.palettePanel.destroy();
         if (this.saveButton) this.saveButton.destroy();
         if (this.saveButtonBg) this.saveButtonBg.destroy();
         if (this.gamepadInfoButton) this.gamepadInfoButton.destroy(); // Destroy old gamepad button too

         this.palettePanel = this.add.container(0, 0).setDepth(500); // High depth within scene
         this.paletteIcons = []; // Clear icon references

        const panelWidth = this.currentWidth; // Use window width
        const panelHeight = 70; // Fixed height
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.8);
        bg.fillRect(0, 0, panelWidth, panelHeight);
        this.palettePanel.add(bg);

        const iconSpacing = 65;
        let iconX = 20;
        const paletteY = 15;
        const buttonSize = 40;

        const tools = [
            { type: "enemy", label: "👽", color: 0x3498db, labelText: "Enemy" },
            { type: "powerup", label: "🍄", color: 0x2ecc71, labelText: "Items" },
            { type: "delete", label: "🗑️", color: 0xe74c3c, labelText: "Delete" },
            { type: "randomize", label: "🎲", color: 0xf39c12, labelText: "Random" }
        ];

        tools.forEach(tool => {
            if (iconX + buttonSize > panelWidth - iconSpacing) return;

            const buttonBg = this.add.graphics();
            buttonBg.fillStyle(tool.color, 0.9);
            buttonBg.fillRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3);
            buttonBg.strokeRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            this.palettePanel.add(buttonBg);

            let uiElement = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize / 2, tool.label, {
                fontFamily: "Arial", fontSize: "20px", color: "#fff"
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            const label = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize + 5, tool.labelText, {
                fontFamily: "Arial", fontSize: "10px", color: "#ffffff", stroke: "#000000", strokeThickness: 1
            }).setOrigin(0.5, 0);
            this.palettePanel.add(label);

            uiElement.setData('toolButton', buttonBg);
            uiElement.setData('toolType', tool.type);
            uiElement.setData('toolColor', tool.color);
             uiElement.setData('buttonX', iconX);
             uiElement.setData('buttonY', paletteY);
             uiElement.setData('buttonSize', buttonSize);

            uiElement.on("pointerdown", () => this.handleToolSelection(tool.type, uiElement));
            uiElement.on("pointerover", () => this.handleToolHover(uiElement, true));
            uiElement.on("pointerout", () => this.handleToolHover(uiElement, false));

            this.palettePanel.add(uiElement);
            this.paletteIcons.push(uiElement);
            iconX += iconSpacing;
        });

        if (iconX < panelWidth - 20) {
            const divider = this.add.graphics();
            divider.lineStyle(2, 0xFFFFFF, 0.3);
            divider.lineBetween(iconX, paletteY, iconX, paletteY + buttonSize);
            this.palettePanel.add(divider);
            iconX += 15;
        }

        // Stage Selector
        const stageTextWidthEstimate = 60;
        const stageButtonsWidthEstimate = (this.availableStages.length + 1) * 35;
        if (iconX + stageTextWidthEstimate + stageButtonsWidthEstimate < panelWidth - 10) {
            const stageText = this.add.text(iconX, paletteY + 5, "STAGE:", {
                fontFamily: "Arial", fontSize: "14px", color: "#fff", fontStyle: 'bold'
            });
            this.palettePanel.add(stageText);
            iconX += stageText.width + 8;
            this.updateStageButtonsUI(iconX, paletteY); // Create/update stage buttons
        } else {
             console.log("Not enough space for stage selector in palette.");
        }

        // Save Button (Positioned bottom-left)
        const saveButtonWidth = 110;
        const saveButtonHeight = 30;
        const saveButtonX = 10;
        const saveButtonY = this.currentHeight - saveButtonHeight - 10;

        this.saveButtonBg = this.add.graphics().setDepth(499);
        this.saveButton = this.add.text(
            saveButtonX + saveButtonWidth / 2,
            saveButtonY + saveButtonHeight / 2,
            "SAVE",
            { fontFamily: "Arial", fontSize: "14px", fontStyle: 'bold', color: "#ffffff", padding: { x: 10, y: 4 } }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(500);
        this.saveButton.on("pointerdown", () => this.saveLevel());

         // Gamepad Info Button (bottom-right) - Recreate it here
         if (this.gamepadEnabled) {
             this.createGamepadInstructions();
         }

         this.updateSaveButtonState(); // Set initial appearance/listeners
         console.log("Palette panel created/updated for window.");
    }

    updateSaveButtonState() {
        if (!this.saveButton || !this.saveButton.active || !this.saveButtonBg || !this.saveButtonBg.active) return;

        const saveButtonWidth = 110;
        const saveButtonHeight = 30;
        const saveButtonX = 10;
        const saveButtonY = this.currentHeight - saveButtonHeight - 10; // Use current height

        this.saveButtonBg.clear();
        this.saveButton.off("pointerover");
        this.saveButton.off("pointerout");
        this.saveButton.setPosition(saveButtonX + saveButtonWidth / 2, saveButtonY + saveButtonHeight / 2); // Update position

        if (this.hasUnsavedChanges) {
            this.saveButton.setText("SAVE*");
            this.saveButtonBg.fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8);
             this.saveButton.on("pointerover", () => { this.saveButtonBg?.clear().fillStyle(0xc0392b, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
             this.saveButton.on("pointerout", () => { this.saveButtonBg?.clear().fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
        } else {
            this.saveButton.setText("SAVE");
            this.saveButtonBg.fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8);
              this.saveButton.on("pointerover", () => { this.saveButtonBg?.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
              this.saveButton.on("pointerout", () => { this.saveButtonBg?.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
        }
    }


    updateStageButtonsUI(startX, startY) {
        let currentX = startX;
        const buttonSize = 28;
        const buttonSpacing = 4;
        const paletteY = startY;
        const panelWidth = this.currentWidth;

        // Remove existing stage buttons and "+" button before recreating
        if (this.palettePanel) {
             const childrenToRemove = [];
             this.palettePanel.list.forEach(icon => {
                  if (!icon || !icon.getData) return;
                  const isStageButton = icon.getData('isStageButton');
                  const isAddButton = icon.getData('isAddButton');
                  if (isStageButton || isAddButton) {
                       const bgKey = isStageButton ? 'stageButtonBg' : 'addButtonBg';
                       const bg = icon.getData(bgKey);
                       if (bg?.destroy) bg.destroy();
                       childrenToRemove.push(icon);
                  }
             });
             childrenToRemove.forEach(child => child.destroy());
        }
         // Filter internal tracking array too
         this.paletteIcons = this.paletteIcons.filter(icon => !icon.getData('isStageButton') && !icon.getData('isAddButton'));


        // Add stage number buttons based on available stages
        this.availableStages.forEach(stageNum => {
            if (currentX + buttonSize > panelWidth - 10) return;

            const stageButtonBg = this.add.graphics();
            const isActive = stageNum === this.currentStage;
            stageButtonBg.fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8);
            stageButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14);
            this.palettePanel.add(stageButtonBg);

            const stageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, stageNum.toString(), {
                fontFamily: "Arial", fontSize: "14px", fontStyle: 'bold',
                color: isActive ? "#fff" : "#ccc"
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setData('isStageButton', true)
                .setData('stageNumber', stageNum)
                .setData('stageButtonBg', stageButtonBg)
                .setData('buttonX', currentX)
                .setData('buttonY', paletteY + 5)
                .setData('buttonSize', buttonSize);

            stageBtn.on("pointerover", () => {
                 const bg = stageBtn.getData('stageButtonBg');
                 if (bg?.active) {
                    bg.clear().fillStyle(stageBtn.getData('stageNumber') === this.currentStage ? 0xf1c40f : 0x777777, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14);
                 }
            });
            stageBtn.on("pointerout", () => {
                 const bg = stageBtn.getData('stageButtonBg');
                 if (bg?.active) {
                     bg.clear().fillStyle(stageBtn.getData('stageNumber') === this.currentStage ? 0xf39c12 : 0x555555, 0.8).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14);
                 }
            });
            stageBtn.on("pointerdown", () => { this.changeStage(stageNum); });

            this.palettePanel.add(stageBtn);
            this.paletteIcons.push(stageBtn);
            currentX += buttonSize + buttonSpacing;
        });

        // Add "+" button (only if space available)
         if (currentX + buttonSize <= panelWidth - 10) {
            const addButtonBg = this.add.graphics();
            addButtonBg.fillStyle(0x27ae60, 0.9); // Green
            addButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14);
            this.palettePanel.add(addButtonBg);

            const addStageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, "+", {
                fontFamily: "Arial", fontSize: "18px", fontStyle: 'bold', color: "#ffffff"
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setData('isAddButton', true)
                .setData('addButtonBg', addButtonBg)
                .setData('buttonX', currentX)
                .setData('buttonY', paletteY + 5)
                .setData('buttonSize', buttonSize);


            addStageBtn.on("pointerover", () => {
                 const bg = addStageBtn.getData('addButtonBg');
                 if (bg?.active) { bg.clear().fillStyle(0x2ecc71, 1).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14); }
            });
            addStageBtn.on("pointerout", () => {
                  const bg = addStageBtn.getData('addButtonBg');
                   if (bg?.active) { bg.clear().fillStyle(0x27ae60, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14); }
            });
            addStageBtn.on("pointerdown", () => { this.createNewStage(); });

            this.palettePanel.add(addStageBtn);
            this.paletteIcons.push(addStageBtn);
         }
    }

    handleToolSelection(toolType, uiElement) {
        this.currentTool = toolType;
        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null;
        this.highlightToolButton(uiElement);

        this.selectedEnemy = null;
        this.selectedItem = null;

        // Use current dimensions for menu positioning
        if (toolType === "enemy") this.showEnemySelectMenu(this.currentWidth, this.currentHeight);
        else if (toolType === "powerup") this.showItemSelectMenu(this.currentWidth, this.currentHeight);
        else if (toolType === "delete") {
            console.log("Selected tool:", toolType);
        } else if (toolType === "randomize") this.randomizeLevel();
    }

    handleToolHover(uiElement, isOver) {
        const buttonBg = uiElement.getData('toolButton');
        if (!buttonBg || !buttonBg.active) return;

        const toolColor = uiElement.getData('toolColor');
        const buttonX = uiElement.getData('buttonX');
        const buttonY = uiElement.getData('buttonY');
        const buttonSize = uiElement.getData('buttonSize');

        buttonBg.clear();
        if (isOver) {
            buttonBg.fillStyle(toolColor, 1);
            buttonBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.7);
            buttonBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
        } else if (this.activeToolButton !== uiElement) {
            buttonBg.fillStyle(toolColor, 0.9);
            buttonBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3);
            buttonBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
        } else {
             // If it's the active button, re-apply highlight style
             this.highlightToolButton(this.activeToolButton);
        }

        // Tooltip/Scale effect (optional)
        // const baseScale = (uiElement instanceof Phaser.GameObjects.Image) ? 0.4 : 1.0;
        // const targetScale = baseScale * (isOver ? 1.1 : 1.0);
        // if (this.tweens && uiElement.scale !== undefined) {
        //     this.tweens.killTweensOf(uiElement);
        //     this.tweens.add({ targets: uiElement, scale: targetScale, duration: 100, ease: "Linear" });
        // }
    }

    highlightToolButton(tool) {
        if (!tool || !tool.getData) return; // Guard
         // Deselect previous button
        if (this.activeToolButton && this.activeToolButton !== tool && this.activeToolButton.active && this.activeToolButton.getData) {
             const prevTool = this.activeToolButton;
             const prevBg = prevTool.getData('toolButton');
              const prevToolColor = prevTool.getData('toolColor');
              const prevButtonX = prevTool.getData('buttonX');
              const prevButtonY = prevTool.getData('buttonY');
              const prevButtonSize = prevTool.getData('buttonSize');

             if (prevBg?.active) {
                 prevBg.clear();
                 prevBg.fillStyle(prevToolColor, 0.9);
                 prevBg.fillRoundedRect(prevButtonX, prevButtonY, prevButtonSize, prevButtonSize, 10);
                 prevBg.lineStyle(2, 0xFFFFFF, 0.3);
                 prevBg.strokeRoundedRect(prevButtonX, prevButtonY, prevButtonSize, prevButtonSize, 10);
             }
        }

         // Select new button
        this.activeToolButton = tool;
         const activeToolBg = tool.getData('toolButton');
         const toolColor = tool.getData('toolColor');
         const buttonX = tool.getData('buttonX');
         const buttonY = tool.getData('buttonY');
         const buttonSize = tool.getData('buttonSize');

         if (activeToolBg?.active) {
             activeToolBg.clear();
             activeToolBg.fillStyle(toolColor, 1); // Full opacity
             activeToolBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
             activeToolBg.lineStyle(3, 0xFFFFFF, 1); // Brighter border
             activeToolBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
         }
    }


    showEnemySelectMenu(containerWidth, containerHeight) {
        if (this.menuOpen) return;
        this.menuOpen = true;
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();

        this.enemySelectOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000);
        this.enemySelectOverlay.on("pointerdown", () => this.closeEnemySelectMenu()); // Use arrow func to maintain scope

        const menuWidth = Math.min(300, containerWidth - 40);
        const numEnemies = Object.keys(this.enemyData).length;
        const paletteHeight = 70;
        const contentHeight = numEnemies * 60 + 20;
        const menuHeight = Math.min(contentHeight, containerHeight - paletteHeight - 20); // Below palette
        const menuX = (containerWidth - menuWidth) / 2;
        const menuY = paletteHeight + 10; // Position below palette

        this.enemySelectContainer = this.add.container(menuX, menuY).setDepth(1001);

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.enemySelectContainer.add(bg);

         const contentContainer = this.add.container(0, 0);
         this.enemySelectContainer.add(contentContainer);

        let i = 0;
        const spacing = 60;
        const itemX = 15;
        const labelX = 75;
        for (let enemyKey in this.enemyData) {
            const enemyInfo = this.enemyData[enemyKey];
            if (!enemyInfo.texture || !enemyInfo.texture[0] || !this.textures.exists('game_asset') || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
                console.warn(`Skipping enemy ${enemyKey} in menu: Texture missing or atlas not ready.`);
                continue;
            }

            const yPos = 10 + i * spacing;

            const enemyImage = this.add.image(itemX, yPos, "game_asset", enemyInfo.texture[0])
                .setOrigin(0, 0).setInteractive({ useHandCursor: true });
            enemyImage.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            const enemyLabel = this.add.text(labelX, yPos + 15, enemyInfo.name, { // Adjust Y for image size
                fontFamily: "Arial", fontSize: "16px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
            enemyLabel.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            contentContainer.add(enemyImage);
            contentContainer.add(enemyLabel);
            i++;
        }

         // Scrolling setup
         if (contentHeight > menuHeight) {
              const scrollMask = this.make.graphics();
              scrollMask.fillStyle(0xffffff);
              scrollMask.fillRect(menuX, menuY, menuWidth, menuHeight); // Mask position relative to scene
              const mask = scrollMask.createGeometryMask();
              contentContainer.setMask(mask);

             contentContainer.setData('isScrolling', false);
             contentContainer.setData('startY', 0);
             contentContainer.setData('startPointerY', 0);
             contentContainer.setData('minY', menuHeight - contentHeight); // Min Y relative to container parent
             contentContainer.setData('maxY', 0); // Max Y relative to container parent

             // Use a larger invisible rectangle for drag interaction to capture the whole menu area
             const dragArea = this.add.zone(0, 0, menuWidth, menuHeight).setOrigin(0);
             this.enemySelectContainer.add(dragArea); // Add to menu container
             dragArea.setInteractive();
             this.input.setDraggable(dragArea);


             dragArea.on('dragstart', (pointer) => {
                  contentContainer.setData('isScrolling', true);
                  contentContainer.setData('startPointerY', pointer.y);
                  contentContainer.setData('startY', contentContainer.y);
             });

             dragArea.on('drag', (pointer) => {
                 if (!contentContainer.getData('isScrolling')) return;
                 const startY = contentContainer.getData('startY');
                 const startPointerY = contentContainer.getData('startPointerY');
                 const deltaY = pointer.y - startPointerY;
                 const newY = startY + deltaY;
                 contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });

             dragArea.on('dragend', () => { contentContainer.setData('isScrolling', false); });

             // Wheel scroll
             this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                  const menuBounds = new Phaser.Geom.Rectangle(menuX, menuY, menuWidth, menuHeight);
                  if (contentContainer.mask && this.enemySelectContainer?.active && Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x - this.cameras.main.x, pointer.y - this.cameras.main.y)) {
                       const currentY = contentContainer.y;
                       let newY = currentY - deltaY * 0.5; // Adjust scroll speed
                       newY = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
                       contentContainer.y = newY;
                  }
             });
         }
    }


    closeEnemySelectMenu() {
        if (!this.menuOpen || !this.enemySelectContainer) return; // Prevent multiple closes

         if (this.enemySelectContainer?.list?.length > 1 && this.enemySelectContainer.list[1]) { // Content container is likely index 1
             const contentContainer = this.enemySelectContainer.list[1];
             // Clean up drag/scroll listeners if they were added
              const dragArea = this.enemySelectContainer.list.find(c => c instanceof Phaser.GameObjects.Zone);
              if (dragArea) {
                   this.input.setDraggable(dragArea, false);
                   dragArea.off('dragstart');
                   dragArea.off('drag');
                   dragArea.off('dragend');
              }
         }

        this.input.off('wheel'); // Turn off wheel listener

        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();
        this.enemySelectContainer = null;
        this.enemySelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;

    }

    selectEnemy(pointer, enemyKey, enemyInfo) {
        pointer.event.stopPropagation(); // Prevent overlay click

        this.selectedEnemy = enemyKey;
        this.currentTool = "enemy";
        this.selectedItem = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
         if (enemyInfo.texture && enemyInfo.texture[0] && this.textures.exists('game_asset') && this.textures.get('game_asset').has(enemyInfo.texture[0])) {
            // Use scene pointer coords for preview positioning
            this.cursorPreview = this.add.sprite(this.mouseX, this.mouseY, "game_asset", enemyInfo.texture[0])
                .setAlpha(0.7)
                .setDepth(1000); // High depth
         } else {
              console.warn(`Cannot create cursor preview for ${enemyKey}: Texture missing.`);
              this.cursorPreview = null;
         }

        this.highlightEnemyToolButton();
        this.lastSelectionTime = Date.now();
        this.closeEnemySelectMenu();
    }

    showItemSelectMenu(containerWidth, containerHeight) {
        if (this.menuOpen) return;
        this.menuOpen = true;
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();

        this.itemSelectOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000);
        this.itemSelectOverlay.on("pointerdown", () => this.closeItemSelectMenu()); // Use arrow func

        const menuWidth = Math.min(300, containerWidth - 40);
        const numItems = Object.keys(this.itemData).length;
        const paletteHeight = 70;
        const contentHeight = numItems * 60 + 20;
        const menuHeight = Math.min(contentHeight, containerHeight - paletteHeight - 20);
        const menuX = (containerWidth - menuWidth) / 2;
        const menuY = paletteHeight + 10;

        this.itemSelectContainer = this.add.container(menuX, menuY).setDepth(1001);

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.itemSelectContainer.add(bg);

         const contentContainer = this.add.container(0, 0);
         this.itemSelectContainer.add(contentContainer);

        let i = 0;
        const spacing = 60;
         const itemX = 15;
         const labelX = 75;
        for (let itemId in this.itemData) {
            const itemInfo = this.itemData[itemId];
             if (!itemInfo.texture || !itemInfo.texture[0] || !this.textures.exists('game_asset') || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                 console.warn(`Skipping item ${itemId} in menu: Texture missing or atlas not ready.`);
                 continue;
             }

            const yPos = 10 + i * spacing;

            const itemImage = this.add.image(itemX, yPos, "game_asset", itemInfo.texture[0])
                .setOrigin(0, 0).setInteractive({ useHandCursor: true });
            itemImage.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            const itemLabel = this.add.text(labelX, yPos + 15, itemInfo.name, { // Adjust Y
                fontFamily: "Arial", fontSize: "16px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
            itemLabel.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            contentContainer.add(itemImage);
            contentContainer.add(itemLabel);
            i++;
        }

         // Scrolling setup
         if (contentHeight > menuHeight) {
             const scrollMask = this.make.graphics();
             scrollMask.fillStyle(0xffffff);
             scrollMask.fillRect(menuX, menuY, menuWidth, menuHeight);
             const mask = scrollMask.createGeometryMask();
             contentContainer.setMask(mask);

             contentContainer.setData('isScrolling', false);
             contentContainer.setData('startY', 0);
             contentContainer.setData('startPointerY', 0);
             contentContainer.setData('minY', menuHeight - contentHeight);
             contentContainer.setData('maxY', 0);

             const dragArea = this.add.zone(0, 0, menuWidth, menuHeight).setOrigin(0);
             this.itemSelectContainer.add(dragArea); // Add to menu container
             dragArea.setInteractive();
             this.input.setDraggable(dragArea);

             dragArea.on('dragstart', (pointer) => {
                  contentContainer.setData('isScrolling', true);
                  contentContainer.setData('startPointerY', pointer.y);
                  contentContainer.setData('startY', contentContainer.y);
             });
             dragArea.on('drag', (pointer) => {
                 if (!contentContainer.getData('isScrolling')) return;
                  const startY = contentContainer.getData('startY');
                  const startPointerY = contentContainer.getData('startPointerY');
                  const deltaY = pointer.y - startPointerY;
                  const newY = startY + deltaY;
                  contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });
             dragArea.on('dragend', () => { contentContainer.setData('isScrolling', false); });

             this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                  const menuBounds = new Phaser.Geom.Rectangle(menuX, menuY, menuWidth, menuHeight);
                 if (contentContainer.mask && this.itemSelectContainer?.active && Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x - this.cameras.main.x, pointer.y - this.cameras.main.y)) {
                     const currentY = contentContainer.y;
                     let newY = currentY - deltaY * 0.5;
                     newY = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
                     contentContainer.y = newY;
                 }
             });
         }
    }


    closeItemSelectMenu() {
        if (!this.menuOpen || !this.itemSelectContainer) return;

         if (this.itemSelectContainer?.list?.length > 1 && this.itemSelectContainer.list[1]) {
             const contentContainer = this.itemSelectContainer.list[1];
             const dragArea = this.itemSelectContainer.list.find(c => c instanceof Phaser.GameObjects.Zone);
             if (dragArea) {
                 this.input.setDraggable(dragArea, false);
                 dragArea.off('dragstart');
                 dragArea.off('drag');
                 dragArea.off('dragend');
             }
         }

        this.input.off('wheel');

        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();
        this.itemSelectContainer = null;
        this.itemSelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;

    }

    selectItem(pointer, itemId, itemInfo) {
        pointer.event.stopPropagation(); // Prevent overlay click

        this.selectedItem = itemId;
        this.currentTool = "powerup";
        this.selectedEnemy = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null;

         if (itemInfo.texture && itemInfo.texture[0] && this.textures.exists('game_asset') && this.textures.get('game_asset').has(itemInfo.texture[0])) {
             const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3);
             const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6);
             // Use scene relative coords
             this.cursorPreview = this.add.container(this.mouseX, this.mouseY, [bubble, powerupImage]).setDepth(1000);
         } else {
              console.warn(`Cannot create cursor preview for item ${itemId}: Texture missing.`);
         }

        this.highlightPowerupToolButton();
        this.lastSelectionTime = Date.now();
        this.closeItemSelectMenu();
    }

    // --- Grid Population and Manipulation ---

    populateGridFromEnemyList() {
        this.cleanupGameObjects(); // Clears enemyGroup, previews, menus

        console.log(`Populating grid for stage ${this.currentStage}. List length: ${this.enemyList?.length}`);
        if (!this.enemyList || !Array.isArray(this.enemyList)) {
            console.error("Cannot populate grid: enemyList is invalid.");
            this.initializeDefaultEnemyList();
             if (!this.enemyList || !Array.isArray(this.enemyList)) {
                 console.error("Failed to initialize default enemy list. Aborting population.");
                 return;
             }
        }
         // Ensure enemyGroup exists after cleanup
         if (!this.enemyGroup) {
             this.enemyGroup = this.add.group();
         }

        const gridStartY = 70; // Start grid below palette

        for (let row = 0; row < this.gridRows; row++) {
            if (!this.enemyList[row] || !Array.isArray(this.enemyList[row])) {
                console.warn(`Row ${row} missing or invalid in enemyList. Fixing.`);
                 this.enemyList[row] = Array(this.gridCols).fill("00");
            }

            for (let col = 0; col < this.gridCols; col++) {
                if (this.enemyList[row][col] === undefined || typeof this.enemyList[row][col] !== 'string') {
                    console.warn(`Cell (${row}, ${col}) missing or invalid type. Setting to '00'.`);
                    this.enemyList[row][col] = "00";
                }

                const code = this.enemyList[row][col];
                if (code !== "00") {
                    const letter = code.charAt(0);
                    const powerup = code.charAt(1);
                    const enemyKey = "enemy" + letter;

                    if (this.enemyData[enemyKey]) {
                        const enemyInfo = this.enemyData[enemyKey];
                         // Position based on calculated cell size and grid start Y
                        const x = col * this.cellWidth + this.cellWidth / 2;
                        const y = gridStartY + row * this.cellHeight + this.cellHeight / 2;

                        // Check if y position is outside the window view
                        // if (y > this.currentHeight + this.cellHeight) continue; // Skip drawing far off-screen elements


                        if (!enemyInfo.texture || enemyInfo.texture.length === 0) {
                            console.warn(`Enemy ${enemyKey} has no texture. Skipping.`);
                            continue;
                        }
                        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
                            console.warn(`Texture '${enemyInfo.texture[0]}' not found for enemy ${enemyKey}. Skipping.`);
                            this.enemyList[row][col] = "00";
                            continue;
                        }

                        const enemySprite = this.add.sprite(x, y, "game_asset", enemyInfo.texture[0])
                             .setInteractive({ useHandCursor: true }) // Make sprite interactive for potential future features
                             .setDepth(10 + row); // Depth based on row, above grid
                        enemySprite.setData("enemyKey", enemyKey);
                        enemySprite.setData("gridPos", { row, col });
                         // Scale sprite to fit cell size? (Optional)
                         // const scale = Math.min(this.cellWidth / enemySprite.width, this.cellHeight / enemySprite.height) * 0.8;
                         // enemySprite.setScale(scale);
                        this.enemyGroup.add(enemySprite);

                        if (powerup !== "0" && this.itemData[powerup]) {
                            const itemInfo = this.itemData[powerup];
                            if (!itemInfo.texture || itemInfo.texture.length === 0 || !this.textures.exists('game_asset') || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                                console.warn(`Texture for powerup ${powerup} missing. Skipping visual.`);
                                 this.enemyList[row][col] = letter + "0";
                                 enemySprite.setData("powerup", null);
                            } else {
                                const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3);
                                const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6);
                                const powerupContainer = this.add.container(enemySprite.x + 15, enemySprite.y - 10, [bubble, powerupImage]);
                                 powerupContainer.setDepth(enemySprite.depth + 1); // Above enemy
                                powerupContainer.setData("itemId", powerup);
                                enemySprite.setData("powerup", powerup);
                                enemySprite.setData("powerupContainer", powerupContainer);
                            }
                        } else if (powerup !== "0") {
                             console.warn(`Item data missing for powerup ${powerup}. Removing.`);
                             this.enemyList[row][col] = letter + "0";
                             enemySprite.setData("powerup", null);
                        }
                    } else {
                        console.warn(`Enemy data missing for key: ${enemyKey} at (${row}, ${col}). Clearing cell.`);
                         this.enemyList[row][col] = "00";
                    }
                }
            }
        }
        console.log("Grid population complete.");
    }


    placeEnemy(row, col, enemyKey) {
        console.log(`Placing ${enemyKey} at (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return;

        const gridStartY = 70;
        const x = col * this.cellWidth + this.cellWidth / 2;
        const y = gridStartY + row * this.cellHeight + this.cellHeight / 2;

        // Check if position is visible within window bounds before placing
         if (x < 0 || x > this.currentWidth || y < gridStartY || y > this.currentHeight) {
              console.warn(`Skipping placement at (${row}, ${col}): Outside window bounds.`);
              return;
         }

        this.removeEnemyAtCell(row, col);

         if (!enemyKey || typeof enemyKey !== 'string' || !enemyKey.startsWith('enemy')) {
              console.error(`Invalid enemyKey: ${enemyKey}`);
              return;
         }
        const letter = enemyKey.replace("enemy", "");
        const enemyInfo = this.enemyData[enemyKey];

        if (!enemyInfo || !enemyInfo.texture || enemyInfo.texture.length === 0) return;
        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(enemyInfo.texture[0])) return;

        const enemySprite = this.add.sprite(x, y, "game_asset", enemyInfo.texture[0])
            .setInteractive({ useHandCursor: true })
            .setDepth(10 + row);
        enemySprite.setData("enemyKey", enemyKey);
        enemySprite.setData("gridPos", { row, col });
        this.enemyGroup.add(enemySprite);

        if (!this.enemyList[row]) this.enemyList[row] = Array(this.gridCols).fill("00");
        this.enemyList[row][col] = letter + "0";
        this.hasUnsavedChanges = true;
         this.updateSaveButtonState();

        return enemySprite;
    }

    placePowerup(row, col, itemId) {
        console.log(`Placing powerup ${itemId} at (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return;

        const currentCode = this.enemyList[row]?.[col];
        if (!currentCode || currentCode === "00") return; // No enemy here

        let enemySprite = this.enemyGroup.getChildren().find(sprite => {
            const pos = sprite.getData("gridPos");
            return pos && pos.row === row && pos.col === col && sprite.active;
        });

        if (!enemySprite) {
             console.error(`Sprite not found at (${row}, ${col}) despite data.`);
             return;
        }

        // Remove existing powerup visual if present
        const existingPowerupContainer = enemySprite.getData("powerupContainer");
        if (existingPowerupContainer) existingPowerupContainer.destroy();

        const itemInfo = this.itemData[itemId];
        if (!itemInfo || !itemInfo.texture || itemInfo.texture.length === 0) {
             console.warn(`Item info missing for ID: ${itemId}`);
             return;
        }

        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
            console.warn(`Texture for powerup ${itemId} missing. Updating data only.`);
        } else {
            const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3);
            const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6);
            const powerupContainer = this.add.container(enemySprite.x + 15, enemySprite.y - 10, [bubble, powerupImage]);
             powerupContainer.setDepth(enemySprite.depth + 1);
            powerupContainer.setData("itemId", itemId);
            enemySprite.setData("powerupContainer", powerupContainer);
        }

        // Update data
        enemySprite.setData("powerup", itemId);
        const letter = currentCode.charAt(0);
        this.enemyList[row][col] = letter + itemId;
        this.hasUnsavedChanges = true;
         this.updateSaveButtonState();
    }


    removeEnemyAtCell(row, col) {
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols || !this.enemyList[row] || this.enemyList[row][col] === "00") {
            return;
        }

        console.log(`Removing entity at (${row}, ${col})`);
        let changed = false;
         if (this.enemyGroup) {
            const children = this.enemyGroup.getChildren();
            for (let i = children.length - 1; i >= 0; i--) {
                const sprite = children[i];
                if (!sprite || !sprite.getData) continue;
                const pos = sprite.getData("gridPos");
                if (pos && pos.row === row && pos.col === col) {
                    const powerupContainer = sprite.getData("powerupContainer");
                    if (powerupContainer) powerupContainer.destroy();
                    sprite.destroy();
                     changed = true;
                    break;
                }
            }
         } else {
              console.warn("removeEnemyAtCell called but enemyGroup does not exist.");
         }

         if (changed || this.enemyList[row]?.[col] !== "00") { // If sprite was removed OR data needs clearing
            this.enemyList[row][col] = "00";
            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
         } else {
              console.warn(`Sprite not found at (${row}, ${col}) during removal attempt, data was already '00'.`);
         }
    }


    handlePlaceObject(pointer) {
        const now = Date.now();
        if (now - this.lastSelectionTime < this.SELECTION_COOLDOWN) return;
        if (this.menuOpen) return;

        // Use scene-relative pointer coordinates
        const sceneX = pointer.x - this.cameras.main.x;
        const sceneY = pointer.y - this.cameras.main.y;

        // Check if pointer is over UI relative to the scene viewport
        if (this.isOverUI(sceneX, sceneY)) {
            console.log("Placement blocked: Pointer over UI.");
            return;
        }

        if (!this.currentTool) return;

        console.log(`Handle place object. Tool: ${this.currentTool}, Pos: (${sceneX.toFixed(0)}, ${sceneY.toFixed(0)})`);

        // Calculate grid cell based on scene-relative coordinates and grid start position
        const gridStartY = 70;
        const col = Math.floor(sceneX / this.cellWidth);
        const row = Math.floor((sceneY - gridStartY) / this.cellHeight);

        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            console.log("Click outside grid bounds.");
            return;
        }

        switch (this.currentTool) {
            case "enemy":
                if (this.selectedEnemy) this.placeEnemy(row, col, this.selectedEnemy);
                break;
            case "powerup":
                if (this.selectedItem) this.placePowerup(row, col, this.selectedItem);
                break;
            case "delete":
                this.removeEnemyAtCell(row, col);
                break;
        }
    }

    isOverUI(sceneX, sceneY) { // Takes scene-relative coordinates
         // Check palette panel bounds (top area)
         const paletteHeight = 70;
         const paletteRect = new Phaser.Geom.Rectangle(0, 0, this.currentWidth, paletteHeight);
         if (Phaser.Geom.Rectangle.Contains(paletteRect, sceneX, sceneY)) return true;

         // Check save button (bottom-left)
          const saveButtonWidth = 110;
          const saveButtonHeight = 30;
          const saveButtonX = 10;
          const saveButtonY = this.currentHeight - saveButtonHeight - 10;
          const saveRect = new Phaser.Geom.Rectangle(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight);
          if (Phaser.Geom.Rectangle.Contains(saveRect, sceneX, sceneY)) return true;

         // Check menu overlays (they cover the whole scene viewport when active)
         if (this.enemySelectOverlay && this.enemySelectOverlay.active) return true;
         if (this.itemSelectOverlay && this.itemSelectOverlay.active) return true;

         // Check gamepad info button (bottom-right)
          if (this.gamepadInfoButton && this.gamepadInfoButton.active) {
               const infoButtonSize = 30; // Approximate size
               const margin = 10;
               const infoButtonX = this.currentWidth - infoButtonSize - margin; // Adjusted X
               const infoButtonY = this.currentHeight - infoButtonSize - margin; // Adjusted Y
               const infoRect = new Phaser.Geom.Rectangle(infoButtonX, infoButtonY, infoButtonSize, infoButtonSize);
               if (Phaser.Geom.Rectangle.Contains(infoRect, sceneX, sceneY)) return true;
          }

          // Check help panel overlay
          if (this.gamepadHelpOverlay && this.gamepadHelpOverlay.active) return true;


        return false;
    }

    // --- Stage Management ---

    async saveLevel() {
         if (!this.hasUnsavedChanges) {
              console.log("No changes to save.");
              this.showTemporaryMessage(`Stage ${this.currentStage} - No Changes`, '#00ff00');
              return;
         }
         if (!this.database) {
             console.error("Database not available. Cannot save.");
             this.showTemporaryMessage(`Save Error: No Database Connection`, '#ff0000');
             return;
         }

        this.showTemporaryMessage(`Saving Stage ${this.currentStage}...`, '#ffffff', 0); // Persistent

        try {
            if (!Array.isArray(this.enemyList)) throw new Error("Enemy list data is invalid.");
            // Ensure list matches current grid dimensions before saving
            this.enemyList = this.enemyList.slice(0, this.gridRows);
            while (this.enemyList.length < this.gridRows) this.enemyList.push(Array(this.gridCols).fill("00"));
             this.enemyList = this.enemyList.map(row => {
                 if (!Array.isArray(row)) row = Array(this.gridCols).fill("00");
                 row = row.slice(0, this.gridCols);
                 while (row.length < this.gridCols) row.push("00");
                 return row.map(cell => (typeof cell === 'string' && cell.length === 2 ? cell : "00"));
             });

            const path = `games/evil-invaders/stage${this.currentStage}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showTemporaryMessage(`Stage ${this.currentStage} Saved!`, '#00ff00'); // Success replaces Saving...
            console.log(`Stage ${this.currentStage} saved successfully.`);
        } catch (error) {
            console.error(`Error saving stage ${this.currentStage}:`, error);
            this.showTemporaryMessage(`Save Error: ${error.message || 'Unknown error'}`, '#ff0000', 5000);
        }
    }


    async changeStage(stageNumber) {
        if (this.currentStage === stageNumber) return;

        if (this.hasUnsavedChanges && !window.confirm(`Unsaved changes in stage ${this.currentStage}. Discard changes and load stage ${stageNumber}?`)) {
            return;
        }
         if (!this.database) {
             console.error("Database not available. Cannot change stage.");
             this.showTemporaryMessage(`Error: No Database Connection`, '#ff0000');
             return;
         }

        this.showTemporaryMessage(`Loading Stage ${stageNumber}...`, '#ffffff', 0); // Persistent

         const previousStage = this.currentStage;

        try {
            this.currentStage = stageNumber;
            // Update UI immediately (find the button and highlight it)
            this.updateStageButtons(); // Will re-evaluate highlights based on new currentStage

            await this.fetchEnemyList(); // Fetch new data (validates/pads list)

            // Re-populate grid visually (calls cleanup first)
            this.populateGridFromEnemyList();

            this.hasUnsavedChanges = false;
             this.updateSaveButtonState();
            this.showTemporaryMessage(`Loaded Stage ${stageNumber}`, '#00ff00'); // Replace loading message
            console.log(`Changed to stage ${stageNumber}.`);
        } catch (error) {
            console.error(`Error changing to stage ${stageNumber}:`, error);
            this.showTemporaryMessage(`Error Loading Stage ${stageNumber}!`, '#ff0000', 5000);
             this.currentStage = previousStage; // Revert stage number
             this.updateStageButtons(); // Update UI back
        }
    }

    async createNewStage() {
        if (this.hasUnsavedChanges && !window.confirm("Unsaved changes. Discard and create new stage?")) return;
         if (!this.database) {
             console.error("Database not available. Cannot create new stage.");
             this.showTemporaryMessage(`Error: No Database Connection`, '#ff0000');
             return;
         }

        this.showTemporaryMessage("Creating New Stage...", '#ffffff', 0);

        try {
            const newStageNumber = this.availableStages.length > 0 ? Math.max(...this.availableStages.map(Number)) + 1 : 0;
            console.log(`Creating new stage ${newStageNumber}`);

            this.currentStage = newStageNumber;
            this.availableStages.push(newStageNumber);
            this.availableStages.sort((a, b) => a - b);
            this.initializeDefaultEnemyList(); // Creates empty list matching grid dimensions

            const path = `games/evil-invaders/stage${newStageNumber}/enemylist`;
            await set(ref(this.database, path), this.enemyList); // Save the empty list

            // Clear visual grid content
            this.cleanupGameObjects();
             if (!this.enemyGroup) { // Ensure group exists after cleanup
                 this.enemyGroup = this.add.group();
             }

            // Recreate palette panel to include the new stage button
             // This is needed because updateStageButtonsUI assumes palettePanel exists
             this.createPalettePanel(); // Recreates panel, stage buttons, save button

            this.hasUnsavedChanges = false; // New stage starts clean
             this.updateSaveButtonState();
            this.showTemporaryMessage(`Stage ${newStageNumber} Created!`, '#00ff00');

        } catch (error) {
            console.error("Error creating new stage:", error);
            this.showTemporaryMessage("Error Creating Stage!", '#ff0000', 5000);
             // Consider removing new stage number from availableStages if save failed
             const index = this.availableStages.indexOf(this.currentStage);
             if(index > -1) this.availableStages.splice(index, 1);
             // Revert to previous stage? Difficult without knowing what it was.
        }
    }


    // --- Helpers & Utilities ---

     showTemporaryMessage(text, color = '#ffffff', duration = 2000) {
          if (this.tempMessageText) this.tempMessageText.destroy(); // Remove existing

          this.tempMessageText = this.add.text(
               this.currentWidth / 2, // Use current width
               this.currentHeight / 2, // Use current height
               text,
               {
                    fontSize: '18px',
                    color: color,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: { x: 15, y: 8 },
                    align: 'center',
                    wordWrap: { width: this.currentWidth * 0.8 }
               }
          ).setOrigin(0.5).setDepth(10003);

          if (duration > 0) {
               this.time.delayedCall(duration, () => {
                    if (this.tempMessageText) this.tempMessageText.destroy();
                    this.tempMessageText = null;
               });
          }
     }

    updateStageButtons() {
         if (!this.paletteIcons || !this.palettePanel) return;

        this.palettePanel.list.forEach(icon => {
             if (icon && icon.active && icon.getData && typeof icon.getData === 'function') {
                 if (icon.getData('isStageButton')) {
                     const stageNum = icon.getData('stageNumber');
                     const bg = icon.getData('stageButtonBg');
                     const isActive = (stageNum === this.currentStage);
                     const buttonX = icon.getData('buttonX');
                     const buttonY = icon.getData('buttonY');
                     const buttonSize = icon.getData('buttonSize');

                     if (typeof icon.setColor === 'function') {
                         icon.setColor(isActive ? "#fff" : "#ccc");
                     }
                     if (bg?.active && typeof bg.clear === 'function') {
                          bg.clear()
                              .fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8)
                              .fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 14);
                     }
                 }
             }
        });
    }

    cleanupGameObjects() {
         console.log("Cleaning up game objects...");
         if (this.enemyGroup && typeof this.enemyGroup.getChildren === 'function') {
             this.enemyGroup.getChildren().forEach(sprite => {
                 if (sprite?.getData) {
                     const powerupContainer = sprite.getData("powerupContainer");
                     if (powerupContainer?.destroy) {
                         powerupContainer.destroy();
                     }
                 }
             });
              if (typeof this.enemyGroup.clear === 'function') {
                 this.enemyGroup.clear(true, true);
              }
         } else {
             // If group doesn't exist, ensure it's null
              this.enemyGroup = null;
         }

        if (this.cursorPreview?.destroy) {
            this.cursorPreview.destroy();
            this.cursorPreview = null;
        }
        this.closeEnemySelectMenu();
        this.closeItemSelectMenu();
        this.menuOpen = false; // Ensure menu flag is reset

        console.log("Game objects cleanup finished.");
    }

    highlightEnemyToolButton() {
         if (!this.paletteIcons) return;
        const enemyToolIcon = this.paletteIcons.find(icon => icon?.getData('toolType') === 'enemy');
        if (enemyToolIcon) this.highlightToolButton(enemyToolIcon);
    }

    highlightPowerupToolButton() {
         if (!this.paletteIcons) return;
        const powerupToolIcon = this.paletteIcons.find(icon => icon?.getData('toolType') === 'powerup');
        if (powerupToolIcon) this.highlightToolButton(powerupToolIcon);
    }

    highlightDeleteToolButton() {
         if (!this.paletteIcons) return;
        const deleteToolIcon = this.paletteIcons.find(icon => icon?.getData('toolType') === 'delete');
        if (deleteToolIcon) this.highlightToolButton(deleteToolIcon);
    }

    analyzeLevelDistribution() {
        return analyzeEnemyList(this.enemyList);
    }

    async randomizeLevel() {
        const now = Date.now();
        if (now - this.lastRandomizeTime < this.RANDOMIZE_COOLDOWN) return;
        this.lastRandomizeTime = now;

        if (this.hasUnsavedChanges && !window.confirm("Unsaved changes. Randomize anyway?")) return;

        this.showTemporaryMessage("Randomizing...", '#ffffff', 0);

        try {
            const gridConfig = { gridRows: this.gridRows, gridCols: this.gridCols };
            const distribution = this.analyzeLevelDistribution();

            if (!distribution || Object.keys(distribution.enemies || {}).length === 0) {
                 console.warn("No enemies in current distribution. Initializing empty list.");
                  this.initializeDefaultEnemyList();
            } else {
                this.enemyList = generateAestheticLayout(gridConfig, distribution);
            }

             // Validate generated list
             if (!Array.isArray(this.enemyList) || this.enemyList.length !== this.gridRows || !this.enemyList.every(r => Array.isArray(r) && r.length === this.gridCols)) {
                  console.error("Generated enemy list is invalid. Re-initializing default.");
                  this.initializeDefaultEnemyList();
                  throw new Error("Layout generation failed validation.");
             }

            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
            this.populateGridFromEnemyList(); // Cleans up and redraws

            this.showTemporaryMessage("Level Randomized!", '#00ff00');
        } catch (error) {
            console.error("Error randomizing level:", error);
            this.showTemporaryMessage("Randomize Error!", '#ff0000', 5000);
        }
    }

    // --- Gamepad Instructions ---
    createGamepadInstructions() {
          // Destroy existing button if present
          if (this.gamepadInfoButton) this.gamepadInfoButton.destroy();

          const buttonSize = 30;
          const margin = 10;
         // Use current dimensions for positioning
         const buttonX = this.currentWidth - buttonSize / 2 - margin;
         const buttonY = this.currentHeight - buttonSize / 2 - margin;

        this.gamepadInfoButton = this.add.text(buttonX, buttonY, "ℹ️",
            { fontSize: '20px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 2 } }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(501);

         this.gamepadInfoButton.on("pointerdown", () => this.showGamepadHelp(this.currentWidth, this.currentHeight));
          this.gamepadInfoButton.on("pointerover", () => this.gamepadInfoButton?.setColor('#ffff00'));
          this.gamepadInfoButton.on("pointerout", () => this.gamepadInfoButton?.setColor('#ffffff'));

         // Restart tween
         if (this.tweens && this.gamepadInfoButton) {
              this.tweens.killTweensOf(this.gamepadInfoButton);
             this.tweens.add({ targets: this.gamepadInfoButton, scale: { from: 1, to: 1.15 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
         }
    }


    showGamepadHelp(containerWidth, containerHeight) {
         if (this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
         if (this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();

        this.gamepadHelpOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(10001);

        this.gamepadHelpPanel = this.add.container(containerWidth / 2, containerHeight / 2)
            .setDepth(10002);

        const panelWidth = Math.min(450, containerWidth - 40);
        const panelHeight = Math.min(360, containerHeight - 60);
        const bg = this.add.graphics();
         bg.fillStyle(0x333333, 0.95);
         bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
         bg.lineStyle(2, 0xAAAAAA);
         bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
        this.gamepadHelpPanel.add(bg);

        const title = this.add.text(0, -panelHeight / 2 + 25, "GAMEPAD CONTROLS", {
            fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#FFFFFF"
        }).setOrigin(0.5);
        this.gamepadHelpPanel.add(title);

        const instructions = [
            "Left Stick: Move cursor",
            "A Button  : Place / Select",
            "B Button  : Delete tool",
            "X Button  : Enemy tool menu",
            "Y Button  : Item tool menu",
            "Start     : Save level",
            "Select    : Randomize level",
            "LB / RB   : Prev / Next stage",
            "",
            "Tap overlay to close"
        ];
        let y = -panelHeight / 2 + 60;
        const textStyle = { fontFamily: "monospace", fontSize: "15px", color: "#E0E0E0", align: 'left'};
         const textX = -panelWidth / 2 + 25;

        instructions.forEach(line => {
              if (y > panelHeight / 2 - 30) return;
             const txt = this.add.text(textX, y, line, textStyle).setOrigin(0, 0);
            this.gamepadHelpPanel.add(txt);
            y += 24;
        });

        this.gamepadHelpOverlay.on("pointerdown", () => {
            if(this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
            if(this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();
             this.gamepadHelpPanel = null;
             this.gamepadHelpOverlay = null;
        });
    }

    // Called by EditorScene when the window is resized (fullscreen toggle)
    resizeScene(newWidth, newHeight)
    {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return;

        // Update the camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // Scale background frame
        if (this.bg) {
             this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Recalculate cell size for the new dimensions
        this.calculateCellSize();

        // Redraw the grid based on new cell sizes
        this.drawGrid();

        // Recreate the palette panel to fit the new width and reposition buttons
        this.createPalettePanel(); // Also recreates save button and gamepad button

        // Repopulate the grid to reposition all enemies/items correctly
        this.populateGridFromEnemyList(); // Cleans up old sprites and places new ones

        // Update gamepad manager dimensions if it exists
        if (this.gamepadManager) {
            this.gamepadManager.sceneWidth = newWidth;
            this.gamepadManager.sceneHeight = newHeight;
            // Maybe reset cursor position to center?
            // this.gamepadManager.cursor.x = newWidth / 2;
            // this.gamepadManager.cursor.y = newHeight / 2;
        }

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

    // --- Static Dimensions for EditorScene ---
    static WIDTH = 800; // Default width
    static HEIGHT = 600; // Default height
}