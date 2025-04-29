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

    // Grid and stage properties
    gridRows = 45;
    gridCols = 8;
    // Cell width/height might need adjustment based on window size vs content size
    cellWidth = (LevelEditorScene.WIDTH - 0) / this.gridCols; // Example: Fit width, adjust padding if needed
    cellHeight = 50; // Keep height for now, might make grid tall
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
                 this.cameras.main.width / 2, this.cameras.main.height / 2,
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
                        this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                        this.atlasLoaded = true;
                        console.log("Atlas JSON Hash added for game_asset.");
                        if (this.scene.isActive() && !this.scene.isSleeping()) {
                             console.log("Restarting scene after atlas load.");
                             this.scene.restart({ parent: this.parent }); // Pass parent again on restart
                        }
                    } catch (e) {
                        console.error("Error adding Atlas JSON Hash:", e);
                        this.atlasLoaded = false;
                        if (this.scene.isActive()) this.loadingText?.setText("Error: Failed to process atlas data.").setColor('#ffcc00');
                    }
                });

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
         // Update camera position to match the parent zone
         this.cameras.main.setPosition(this.parent.x, this.parent.y);

         // Bring this scene's display list to the top (within Phaser's scene manager)
         // This ensures it draws over scenes launched earlier, but EditorScene manages overall window overlap via zone depth.
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
               // Attempt to fetch parent zone from EditorScene if possible? Difficult. Best to stop.
               return;
          }

         // Add the window frame background image first
         this.add.image(0, 0, 'levels-window').setOrigin(0).setDepth(-100); // Set low depth within this scene

         // --- Camera and Viewport Setup ---
         // Set camera viewport to match the parent zone's position and this scene's defined size
         this.cameras.main.setViewport(this.parent.x, this.parent.y, LevelEditorScene.WIDTH, LevelEditorScene.HEIGHT);
         // Optional: Set background color for area outside the frame image (if image has transparency)
         this.cameras.main.setBackgroundColor(0x000000); // Black background
         // Ensure this scene's camera doesn't scroll with the main EditorScene camera
         this.cameras.main.setScroll(0, 0);

         // --- Dynamic Cell Width Calculation ---
         // Adjust cell width based on the final window width (e.g., leave some padding)
         const padding = 10; // Small padding inside the window frame
         const usableWidth = LevelEditorScene.WIDTH - (padding * 2);
         this.cellWidth = usableWidth / this.gridCols;
         // Cell height could also be made dynamic if needed
         // this.cellHeight = (LevelEditorScene.HEIGHT - 100) / this.gridRows; // Example: Reserve 100px for palette

         if (this.loadingText) {
             this.loadingText.destroy();
             this.loadingText = null;
         }
         if (!this.textures.exists('game_asset') || !this.atlasLoaded) {
             console.error("'game_asset' texture atlas not loaded or ready. Cannot proceed.");
             this.add.text(LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2,
                 "Error: Assets not loaded.\nPlease wait or refresh.", { fontSize: "16px", color: "#ff0000", align: "center", wordWrap: { width: LevelEditorScene.WIDTH - 40 } }).setOrigin(0.5);
             return;
         }
         if (!this.database) {
             console.error("Firebase Database not initialized. Cannot proceed.");
              this.add.text(LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2,
                 "Error: Database connection failed.", { fontSize: "16px", color: "#ff0000", align: "center", wordWrap: { width: LevelEditorScene.WIDTH - 40 } }).setOrigin(0.5);
             return;
         }

        console.log("LevelEditorScene create started within window");

        const loadingDataText = this.add.text(
            LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2, // Center within window
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

            this.drawGrid(); // Draws based on cellWidth/Height
            this.createPalettePanel(); // Creates UI relative to window size
            this.enemyGroup = this.add.group();
            this.populateGridFromEnemyList(); // Places sprites based on cellWidth/Height

            this.input.off("pointerdown", this.handlePlaceObject, this);
            this.input.on("pointerdown", this.handlePlaceObject, this);
            this.placeObjectHandler = this.input;

            if (this.gamepadEnabled) {
                this.gamepadManager = createGamepadManager(this);
                // Adjust Gamepad cursor bounds to window size
                if (this.gamepadManager) {
                     this.gamepadManager.cursor.x = LevelEditorScene.WIDTH / 2;
                     this.gamepadManager.cursor.y = LevelEditorScene.HEIGHT / 2;
                     // Need to update bounds inside gamepadManager if it uses camera directly
                     // For now, assume it uses scene dimensions which should be correct after viewport set
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
            loadingDataText?.setText("Error loading data!").setColor('#ff0000'); // Check if exists
            console.error("Error during LevelEditorScene create:", error);
              this.add.text(LevelEditorScene.WIDTH / 2, LevelEditorScene.HEIGHT / 2 + 40,
                 "Failed to load game data.", { fontSize: "16px", color: "#ffcc00", align: "center" }).setOrigin(0.5);
        }
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
    }


    update(time, delta) {
        // Pointer position relative to this scene's viewport/camera
        // activePointer gives coords relative to the game canvas origin.
        // We need to adjust for the scene's camera position (which matches the parent zone's position).
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
                this.cursorPreview.setPosition(this.mouseX, this.mouseY);
            }
        }

        if (this.gamepadManager && this.gamepadEnabled) {
            // Gamepad manager needs to know the scene's bounds (WIDTH, HEIGHT)
            // We might need to pass these or have it read them if its update depends on them.
            // Assuming gamepadManager.update() uses scene context correctly for bounds.
             this.gamepadManager.sceneWidth = LevelEditorScene.WIDTH; // Pass dimensions if needed
             this.gamepadManager.sceneHeight = LevelEditorScene.HEIGHT;
            this.gamepadManager.update();

            if (isGamepadControlling) {
                // Gamepad cursor position is already relative to its scene/bounds
                this.mouseX = this.gamepadManager.cursor.x;
                this.mouseY = this.gamepadManager.cursor.y;
                 // Gamepad manager should update the cursorPreview visual
                 if (this.cursorPreview && this.cursorPreview.active) {
                      this.cursorPreview.setPosition(this.mouseX, this.mouseY);
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
                 this.enemyList = this.enemyList.map(row => {
                     if (!Array.isArray(row)) row = [];
                     while (row.length < this.gridCols) row.push("00");
                     return row.slice(0, this.gridCols);
                 });
                 while (this.enemyList.length < this.gridRows) {
                     this.enemyList.push(Array(this.gridCols).fill("00"));
                 }
                 if (this.enemyList.length > this.gridRows) {
                      this.enemyList = this.enemyList.slice(0, this.gridRows);
                 }
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

    drawGrid() {
        if (this.gridGraphics) this.gridGraphics.destroy();
        // Draw grid lines based on cellWidth/cellHeight and window size
        // Note: The grid might extend beyond the HEIGHT if rows*cellHeight > HEIGHT
        const gridTotalWidth = this.gridCols * this.cellWidth;
        // Cap drawing height to window height to avoid drawing outside
        const gridDrawHeight = Math.min(this.gridRows * this.cellHeight, LevelEditorScene.HEIGHT);


        this.gridGraphics = this.add.graphics({
             x: 0, // Position grid relative to scene origin
             y: 0,
             lineStyle: { width: 1, color: 0xffffff, alpha: 0.2 } // Dimmer grid
        });

        for (let r = 0; r <= this.gridRows; r++) {
             const yPos = r * this.cellHeight;
             if (yPos > LevelEditorScene.HEIGHT) break; // Stop drawing lines outside window
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(0, yPos, gridTotalWidth, yPos));
        }
        for (let c = 0; c <= this.gridCols; c++) {
            const xPos = c * this.cellWidth;
            if(xPos > gridTotalWidth + 1) break; // Ensure we don't draw past the calculated width
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(xPos, 0, xPos, gridDrawHeight));
        }
         // Add bounds for the camera if needed, e.g. if grid is scrollable
         // this.cameras.main.setBounds(0, 0, gridTotalWidth, this.gridRows * this.cellHeight);

        console.log(`Grid drawn (${this.gridCols}x${this.gridRows}). Cell: ${this.cellWidth.toFixed(1)}x${this.cellHeight}`);
    }

    createPalettePanel() {
         if (this.palettePanel) this.palettePanel.destroy();
          if (this.saveButton) this.saveButton.destroy();
          if (this.saveButtonBg) this.saveButtonBg.destroy();

        const panelWidth = LevelEditorScene.WIDTH; // Use window width
        const panelHeight = 70; // Keep fixed height
        // Position palette at the top of the window
        this.palettePanel = this.add.container(0, 0).setDepth(500); // High depth within scene

        this.paletteIcons = [];

        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.8); // Slightly more transparent
        // Draw background relative to container origin (0,0)
        bg.fillRect(0, 0, panelWidth, panelHeight); // Use simple rect, rounding not needed if against edge
        this.palettePanel.add(bg);

        const iconSpacing = 65; // Adjust spacing for potentially smaller width
        let iconX = 20; // Start padding
        const paletteY = 15; // Vertical position within panel
        const buttonSize = 40; // Keep button size

        const tools = [
            { type: "enemy", label: "👽", color: 0x3498db, labelText: "Enemy" },
            { type: "powerup", label: "🍄", color: 0x2ecc71, labelText: "Items" },
            { type: "delete", label: "🗑️", color: 0xe74c3c, labelText: "Delete" },
            { type: "randomize", label: "🎲", color: 0xf39c12, labelText: "Random" }
        ];

        tools.forEach(tool => {
            // Ensure button fits within panel width
            if (iconX + buttonSize > panelWidth - iconSpacing) return; // Skip if no space

            const buttonBg = this.add.graphics();
            buttonBg.fillStyle(tool.color, 0.9);
            buttonBg.fillRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3);
            buttonBg.strokeRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            this.palettePanel.add(buttonBg);

            let uiElement = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize / 2, tool.label, {
                fontFamily: "Arial", fontSize: "20px", color: "#fff"
            }).setOrigin(0.5).setInteractive();

            const label = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize + 5, tool.labelText, {
                fontFamily: "Arial", fontSize: "10px", color: "#ffffff", stroke: "#000000", strokeThickness: 1 // Smaller label
            }).setOrigin(0.5, 0);
            this.palettePanel.add(label);

            uiElement.setData('toolButton', buttonBg);
            uiElement.setData('toolType', tool.type);
            uiElement.setData('toolColor', tool.color);
             uiElement.setData('buttonX', iconX); // Store position relative to panel
             uiElement.setData('buttonY', paletteY);
             uiElement.setData('buttonSize', buttonSize);

            uiElement.on("pointerdown", () => this.handleToolSelection(tool.type, uiElement));
            uiElement.on("pointerover", () => this.handleToolHover(uiElement, true));
            uiElement.on("pointerout", () => this.handleToolHover(uiElement, false));

            this.palettePanel.add(uiElement);
            this.paletteIcons.push(uiElement);
            iconX += iconSpacing;
        });

        // Divider (only if space allows)
        if (iconX < panelWidth - 20) {
            const divider = this.add.graphics();
            divider.lineStyle(2, 0xFFFFFF, 0.3);
            divider.lineBetween(iconX, paletteY, iconX, paletteY + buttonSize);
            this.palettePanel.add(divider);
            iconX += 15; // Space after divider
        }

        // Stage Selector (check remaining space)
        const stageTextWidthEstimate = 60;
        const stageButtonsWidthEstimate = (this.availableStages.length + 1) * 35; // Num stages + Add button
        if (iconX + stageTextWidthEstimate + stageButtonsWidthEstimate < panelWidth - 10) {
            const stageText = this.add.text(iconX, paletteY + 5, "STAGE:", {
                fontFamily: "Arial", fontSize: "14px", color: "#fff", fontStyle: 'bold' // Smaller text
            });
            this.palettePanel.add(stageText);
            iconX += stageText.width + 8;
            this.updateStageButtonsUI(iconX, paletteY); // Pass current X position
        } else {
             console.log("Not enough space for stage selector in palette.");
        }

        // Save Button (Positioned bottom-left within the window)
        const saveButtonWidth = 110; // Slightly smaller
        const saveButtonHeight = 30;
        const saveButtonX = 10; // Padding from left edge
        const saveButtonY = LevelEditorScene.HEIGHT - saveButtonHeight - 10; // Padding from bottom edge

        this.saveButtonBg = this.add.graphics().setDepth(499); // Ensure depth is relative within scene
        this.saveButtonBg.fillStyle(0x9b59b6, 0.9);
        this.saveButtonBg.fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8);

        this.saveButton = this.add.text(
            saveButtonX + saveButtonWidth / 2,
            saveButtonY + saveButtonHeight / 2,
            "SAVE", // Shorter text
            {
                fontFamily: "Arial", fontSize: "14px", fontStyle: 'bold', // Smaller text
                color: "#ffffff", padding: { x: 10, y: 4 }
            }
        )
            .setOrigin(0.5)
            .setInteractive()
            .setDepth(500);

         this.saveButton.on("pointerover", () => { this.saveButtonBg?.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
         this.saveButton.on("pointerout", () => { if(this.saveButtonBg) this.updateSaveButtonState(); }); // Use helper to reset based on state
         this.saveButton.on("pointerdown", () => this.saveLevel());

        // Note: Adding save button to paletteIcons for isOverUI check might be problematic
        // if paletteIcons is only meant for the top bar. Keep separate or use a different check.

        console.log("Palette panel created for window.");
         this.updateSaveButtonState();
    }

    updateSaveButtonState() {
         // Check required elements exist
        if (!this.saveButton || !this.saveButton.active || !this.saveButtonBg || !this.saveButtonBg.active) return;

        const saveButtonWidth = 110;
        const saveButtonHeight = 30;
        const saveButtonX = 10;
        const saveButtonY = LevelEditorScene.HEIGHT - saveButtonHeight - 10;

        // Clear previous state graphics and listeners (important for hover)
        this.saveButtonBg.clear();
        this.saveButton.off("pointerover"); // Remove old listener
        this.saveButton.off("pointerout");  // Remove old listener

        if (this.hasUnsavedChanges) {
            this.saveButton.setText("SAVE*"); // Indicate unsaved
            this.saveButtonBg.fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); // Red tint
             // Add new hover listeners for unsaved state
             this.saveButton.on("pointerover", () => { this.saveButtonBg?.clear().fillStyle(0xc0392b, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
             this.saveButton.on("pointerout", () => { this.saveButtonBg?.clear().fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
        } else {
            this.saveButton.setText("SAVE");
            this.saveButtonBg.fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); // Purple
             // Add new hover listeners for saved state
              this.saveButton.on("pointerover", () => { this.saveButtonBg?.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
              this.saveButton.on("pointerout", () => { this.saveButtonBg?.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 8); });
        }
    }


    updateStageButtonsUI(startX, startY) {
        let currentX = startX;
        const buttonSize = 28; // Slightly smaller buttons
        const buttonSpacing = 4;
        const paletteY = startY;
        const panelWidth = LevelEditorScene.WIDTH; // Use scene width for boundary check

        // Remove existing stage buttons and "+" button before recreating
        this.paletteIcons = this.paletteIcons.filter(icon => {
             if (!icon || !icon.getData) return true; // Keep if invalid or no data
            const isStageButton = icon.getData('isStageButton');
            const isAddButton = icon.getData('isAddButton');

            if (isStageButton || isAddButton) {
                 const bgKey = isStageButton ? 'stageButtonBg' : 'addButtonBg';
                 const bg = icon.getData(bgKey);
                 if (bg?.destroy) bg.destroy();
                 if (icon.destroy) icon.destroy();
                 return false; // Remove from array
            }
            return true; // Keep other icons
        });


        // Add stage number buttons based on available stages
        this.availableStages.forEach(stageNum => {
            // Check if space available
            if (currentX + buttonSize > panelWidth - 10) return; // Stop if no more space

            const stageButtonBg = this.add.graphics();
            const isActive = stageNum === this.currentStage;
            stageButtonBg.fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8);
            stageButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 14); // More rounded
            this.palettePanel.add(stageButtonBg);

            const stageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, stageNum.toString(), {
                fontFamily: "Arial", fontSize: "14px", fontStyle: 'bold', // Smaller font
                color: isActive ? "#fff" : "#ccc"
            })
                .setOrigin(0.5)
                .setInteractive()
                .setData('isStageButton', true)
                .setData('stageNumber', stageNum)
                .setData('stageButtonBg', stageButtonBg)
                .setData('buttonX', currentX) // Store position for hover updates
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
                fontFamily: "Arial", fontSize: "18px", fontStyle: 'bold', color: "#ffffff" // Slightly smaller '+'
            })
                .setOrigin(0.5)
                .setInteractive()
                .setData('isAddButton', true)
                .setData('addButtonBg', addButtonBg)
                .setData('buttonX', currentX) // Store position
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

        // Use scene dimensions for menu positioning
        if (toolType === "enemy") this.showEnemySelectMenu(LevelEditorScene.WIDTH, LevelEditorScene.HEIGHT);
        else if (toolType === "powerup") this.showItemSelectMenu(LevelEditorScene.WIDTH, LevelEditorScene.HEIGHT);
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
             this.highlightToolButton(this.activeToolButton);
        }

        const baseScale = (uiElement instanceof Phaser.GameObjects.Image) ? 0.4 : 1.0;
        const targetScale = baseScale * (isOver ? 1.1 : 1.0);

         if (this.tweens && uiElement.scale !== undefined) {
             this.tweens.killTweensOf(uiElement); // Prevent conflicting tweens
             this.tweens.add({
                 targets: uiElement,
                 scale: targetScale,
                 duration: 100,
                 ease: "Linear"
             });
         }
    }

    highlightToolButton(tool) {
        if (this.activeToolButton && this.activeToolButton !== tool && this.activeToolButton.active) { // Check if active
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

        this.activeToolButton = tool;
         const activeToolBg = tool.getData('toolButton');
         const toolColor = tool.getData('toolColor');
         const buttonX = tool.getData('buttonX');
         const buttonY = tool.getData('buttonY');
         const buttonSize = tool.getData('buttonSize');

         if (activeToolBg?.active) {
             activeToolBg.clear();
             activeToolBg.fillStyle(toolColor, 1);
             activeToolBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
             activeToolBg.lineStyle(3, 0xFFFFFF, 1);
             activeToolBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
         }
    }


    showEnemySelectMenu(containerWidth, containerHeight) { // Pass window dimensions
        if (this.menuOpen) return;
        this.menuOpen = true;
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();

        // Overlay covers the entire scene viewport
        this.enemySelectOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000);
        this.enemySelectOverlay.on("pointerdown", this.closeEnemySelectMenu, this);

        const menuWidth = Math.min(300, containerWidth - 40); // Adjust width based on container
        const numEnemies = Object.keys(this.enemyData).length;
        const contentHeight = numEnemies * 60 + 20; // Height needed for content
        const menuHeight = Math.min(contentHeight, containerHeight - 100); // Limit height, leave padding
        const menuX = (containerWidth - menuWidth) / 2; // Center horizontally
        const menuY = 80; // Position from top (below palette)

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
        const itemX = 15; // Padding inside menu
        const labelX = 75;
        for (let enemyKey in this.enemyData) {
            const enemyInfo = this.enemyData[enemyKey];
            if (!enemyInfo.texture || !enemyInfo.texture[0] || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
                console.warn(`Skipping enemy ${enemyKey} in menu: Texture missing.`);
                continue;
            }

            const yPos = 10 + i * spacing;

            const enemyImage = this.add.image(itemX, yPos, "game_asset", enemyInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            enemyImage.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            const enemyLabel = this.add.text(labelX, yPos + enemyImage.displayHeight / 2, enemyInfo.name, {
                fontFamily: "Arial", fontSize: "16px", color: "#fff", stroke: "#000", strokeThickness: 2 // Slightly smaller
            }).setOrigin(0, 0.5).setInteractive();
            enemyLabel.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            contentContainer.add(enemyImage);
            contentContainer.add(enemyLabel);
            i++;
        }

         if (contentHeight > menuHeight) {
              const scrollMask = this.make.graphics();
              scrollMask.fillStyle(0xffffff);
               // Mask position is relative to the scene, same as the menu container
              scrollMask.fillRect(menuX, menuY, menuWidth, menuHeight);
              const mask = scrollMask.createGeometryMask();
              contentContainer.setMask(mask);

             contentContainer.setData('isScrolling', false);
             contentContainer.setData('startY', 0);
             contentContainer.setData('startPointerY', 0);
             contentContainer.setData('minY', menuHeight - contentHeight);
             contentContainer.setData('maxY', 0);

             contentContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, menuWidth, contentHeight), Phaser.Geom.Rectangle.Contains);
             this.input.setDraggable(contentContainer);

             contentContainer.on('dragstart', (pointer) => {
                  contentContainer.setData('isScrolling', true);
                  contentContainer.setData('startPointerY', pointer.y); // Use global pointer Y
                  contentContainer.setData('startY', contentContainer.y);
             });

             contentContainer.on('drag', (pointer) => {
                 if (!contentContainer.getData('isScrolling')) return;
                 const startY = contentContainer.getData('startY');
                 const startPointerY = contentContainer.getData('startPointerY');
                 const deltaY = pointer.y - startPointerY; // Calculate delta from global pointer Y
                 const newY = startY + deltaY;
                 contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });

             contentContainer.on('dragend', () => { contentContainer.setData('isScrolling', false); });

             this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                  const menuBounds = new Phaser.Geom.Rectangle(menuX, menuY, menuWidth, menuHeight);
                   // Check pointer relative to scene origin
                  if (contentContainer.mask && this.enemySelectContainer?.active && Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x - this.cameras.main.x, pointer.y - this.cameras.main.y)) {
                       const currentY = contentContainer.y;
                       let newY = currentY - deltaY * 0.5;
                       newY = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
                       contentContainer.y = newY;
                  }
             });
         }
    }


    closeEnemySelectMenu() {
        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();
        this.enemySelectContainer = null;
        this.enemySelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel');
        // Clean up potential drag listeners on the content container if it exists
         if (this.enemySelectContainer?.list[1]) { // Assuming contentContainer is the second element
             this.input.setDraggable(this.enemySelectContainer.list[1], false);
             this.enemySelectContainer.list[1].off('dragstart');
             this.enemySelectContainer.list[1].off('drag');
             this.enemySelectContainer.list[1].off('dragend');
         }
    }

    selectEnemy(pointer, enemyKey, enemyInfo) {
        pointer.event.stopPropagation();

        this.selectedEnemy = enemyKey;
        this.currentTool = "enemy";
        this.selectedItem = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
         if (enemyInfo.texture && enemyInfo.texture[0] && this.textures.get('game_asset').has(enemyInfo.texture[0])) {
            // Use pointer coords relative to scene for preview positioning
            this.cursorPreview = this.add.sprite(this.mouseX, this.mouseY, "game_asset", enemyInfo.texture[0])
                .setAlpha(0.7)
                .setDepth(1000);
         } else {
              console.warn(`Cannot create cursor preview for ${enemyKey}: Texture missing.`);
              this.cursorPreview = null;
         }

        this.highlightEnemyToolButton();
        this.lastSelectionTime = Date.now();
        this.closeEnemySelectMenu();
    }

    showItemSelectMenu(containerWidth, containerHeight) { // Pass window dimensions
        if (this.menuOpen) return;
        this.menuOpen = true;
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();

        this.itemSelectOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000);
        this.itemSelectOverlay.on("pointerdown", this.closeItemSelectMenu, this);

        const menuWidth = Math.min(300, containerWidth - 40);
        const numItems = Object.keys(this.itemData).length;
        const contentHeight = numItems * 60 + 20;
        const menuHeight = Math.min(contentHeight, containerHeight - 120); // Limit height
        const menuX = (containerWidth - menuWidth) / 2;
        const menuY = 90; // Position below palette

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
             if (!itemInfo.texture || !itemInfo.texture[0] || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                 console.warn(`Skipping item ${itemId} in menu: Texture missing.`);
                 continue;
             }

            const yPos = 10 + i * spacing;

            const itemImage = this.add.image(itemX, yPos, "game_asset", itemInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            itemImage.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            const itemLabel = this.add.text(labelX, yPos + itemImage.displayHeight / 2, itemInfo.name, {
                fontFamily: "Arial", fontSize: "16px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive();
            itemLabel.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            contentContainer.add(itemImage);
            contentContainer.add(itemLabel);
            i++;
        }

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

             contentContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, menuWidth, contentHeight), Phaser.Geom.Rectangle.Contains);
             this.input.setDraggable(contentContainer);

             contentContainer.on('dragstart', (pointer) => {
                  contentContainer.setData('isScrolling', true);
                  contentContainer.setData('startPointerY', pointer.y);
                  contentContainer.setData('startY', contentContainer.y);
             });
             contentContainer.on('drag', (pointer) => {
                 if (!contentContainer.getData('isScrolling')) return;
                  const startY = contentContainer.getData('startY');
                  const startPointerY = contentContainer.getData('startPointerY');
                  const deltaY = pointer.y - startPointerY;
                  const newY = startY + deltaY;
                  contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });
             contentContainer.on('dragend', () => { contentContainer.setData('isScrolling', false); });

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
        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();
        this.itemSelectContainer = null;
        this.itemSelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel');
        // Clean up potential drag listeners
         if (this.itemSelectContainer?.list[1]) {
             this.input.setDraggable(this.itemSelectContainer.list[1], false);
             this.itemSelectContainer.list[1].off('dragstart');
             this.itemSelectContainer.list[1].off('drag');
             this.itemSelectContainer.list[1].off('dragend');
         }
    }

    selectItem(pointer, itemId, itemInfo) {
        pointer.event.stopPropagation();

        this.selectedItem = itemId;
        this.currentTool = "powerup";
        this.selectedEnemy = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null;

         if (itemInfo.texture && itemInfo.texture[0] && this.textures.get('game_asset').has(itemInfo.texture[0])) {
             const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3); // Smaller bubble
             const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6); // Smaller image
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
                         // Position based on calculated cell size
                        const x = col * this.cellWidth + this.cellWidth / 2;
                        const y = row * this.cellHeight + this.cellHeight / 2;

                        // Check if y position is outside the window view (allow buffer for palette etc)
                        // if (y > LevelEditorScene.HEIGHT + this.cellHeight) continue; // Skip drawing far off-screen elements


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
                            .setInteractive();
                        enemySprite.setData("enemyKey", enemyKey);
                        enemySprite.setData("gridPos", { row, col });
                         enemySprite.setDepth(row); // Depth based on row
                        this.enemyGroup.add(enemySprite);

                        if (powerup !== "0" && this.itemData[powerup]) {
                            const itemInfo = this.itemData[powerup];
                            if (!itemInfo.texture || itemInfo.texture.length === 0 || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                                console.warn(`Texture for powerup ${powerup} missing. Skipping visual.`);
                                 this.enemyList[row][col] = letter + "0";
                                 enemySprite.setData("powerup", null);
                            } else {
                                const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3); // Smaller
                                const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6); // Smaller
                                const powerupContainer = this.add.container(enemySprite.x + 15, enemySprite.y - 10, [bubble, powerupImage]); // Adjust position relative
                                 powerupContainer.setDepth(enemySprite.depth + 1);
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

        const x = col * this.cellWidth + this.cellWidth / 2;
        const y = row * this.cellHeight + this.cellHeight / 2;

        // Check if position is visible within window bounds before placing
         if (x < 0 || x > LevelEditorScene.WIDTH || y < 0 || y > LevelEditorScene.HEIGHT) {
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
            .setInteractive();
         enemySprite.setDepth(row);
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
        if (!currentCode || currentCode === "00") return;

        let enemySprite = this.enemyGroup.getChildren().find(sprite => {
            const pos = sprite.getData("gridPos");
            return pos && pos.row === row && pos.col === col && sprite.active;
        });

        if (!enemySprite) {
             console.error(`Sprite not found at (${row}, ${col}) despite data.`);
             // this.enemyList[row][col] = "00"; // Option: Correct data
             return;
        }

        const existingPowerupContainer = enemySprite.getData("powerupContainer");
        if (existingPowerupContainer) existingPowerupContainer.destroy();

        const itemInfo = this.itemData[itemId];
        if (!itemInfo || !itemInfo.texture || itemInfo.texture.length === 0) return;

        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
            console.warn(`Texture for powerup ${itemId} missing. Updating data only.`);
        } else {
            const bubble = this.add.circle(0, 0, 15, 0xffffff, 0.3);
            const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.6);
            // Adjust position relative to sprite
            const powerupContainer = this.add.container(enemySprite.x + 15, enemySprite.y - 10, [bubble, powerupImage]);
             powerupContainer.setDepth(enemySprite.depth + 1);
            powerupContainer.setData("itemId", itemId);
            enemySprite.setData("powerupContainer", powerupContainer);
        }

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
         // Ensure enemyGroup exists before iterating
         if (this.enemyGroup) {
            const children = this.enemyGroup.getChildren();
            for (let i = children.length - 1; i >= 0; i--) {
                const sprite = children[i];
                // Check sprite is valid before accessing data
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

         if (changed) {
            this.enemyList[row][col] = "00";
            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
         } else {
              console.warn(`Sprite not found at (${row}, ${col}) during removal attempt.`);
               if (this.enemyList[row]?.[col] !== "00") { // Check if row exists
                    this.enemyList[row][col] = "00";
                    this.hasUnsavedChanges = true;
                    this.updateSaveButtonState();
               }
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

        // Calculate grid cell based on scene-relative coordinates
        const col = Math.floor(sceneX / this.cellWidth);
        const row = Math.floor(sceneY / this.cellHeight);

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
         const checkBounds = (gameObject, x, y) => {
             // Need bounds relative to the scene origin (0,0)
             if (!gameObject || !gameObject.active || typeof gameObject.getBounds !== 'function') return false;
             // getBounds() usually gives world coords or coords relative to parent container.
             // For simplicity, let's check if sceneX, sceneY fall within the element's area,
             // assuming elements are positioned relative to scene (0,0) or within containers positioned at (0,0).
             const bounds = gameObject.getBounds(); // This might still be world bounds
             // We need to transform sceneX, sceneY back to world coords OR transform bounds to scene coords.
             // Easier: transform sceneX, sceneY to world coords for the check.
             const worldX = sceneX + this.cameras.main.x;
             const worldY = sceneY + this.cameras.main.y;
             return Phaser.Geom.Rectangle.Contains(bounds, worldX, worldY);
         };

         // Check palette panel container bounds (assuming it's at scene 0,0)
         // GetBounds() on container might work if children are simple.
         if (this.palettePanel && this.palettePanel.active) {
              // Check bounds of the palette container itself first
               // Need to define the Rect manually based on panel position/size
               const paletteRect = new Phaser.Geom.Rectangle(0, 0, LevelEditorScene.WIDTH, 70); // Assumes panel at 0,0, height 70
               if (Phaser.Geom.Rectangle.Contains(paletteRect, sceneX, sceneY)) return true;
               // Individual icon checks within palette are less reliable with getBounds() unless they are top-level
         }


         // Check save button and its background (positioned relative to scene bottom-left)
          const saveButtonWidth = 110;
          const saveButtonHeight = 30;
          const saveButtonX = 10;
          const saveButtonY = LevelEditorScene.HEIGHT - saveButtonHeight - 10;
          const saveRect = new Phaser.Geom.Rectangle(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight);
          if (Phaser.Geom.Rectangle.Contains(saveRect, sceneX, sceneY)) return true;


         // Check menu overlays (they cover the whole scene viewport when active)
         if (this.enemySelectOverlay && this.enemySelectOverlay.active) return true;
         if (this.itemSelectOverlay && this.itemSelectOverlay.active) return true;

         // Check gamepad info button (positioned bottom-right)
          const infoButtonSize = 30; // Estimate size
          const infoButtonX = LevelEditorScene.WIDTH - infoButtonSize - 5;
          const infoButtonY = LevelEditorScene.HEIGHT - infoButtonSize - 5;
          const infoRect = new Phaser.Geom.Rectangle(infoButtonX, infoButtonY, infoButtonSize, infoButtonSize);
          if (Phaser.Geom.Rectangle.Contains(infoRect, sceneX, sceneY)) return true;

          // Check help panel overlay
          if (this.gamepadHelpOverlay && this.gamepadHelpOverlay.active) return true;


        return false;
    }

    // --- Stage Management --- (Logic remains mostly the same, uses helpers)

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

        this.showTemporaryMessage(`Saving Stage ${this.currentStage}...`, '#ffffff', 0); // 0 duration = persist until success/fail

        try {
            if (!Array.isArray(this.enemyList)) throw new Error("Enemy list data is invalid.");
            this.enemyList = this.enemyList.slice(0, this.gridRows);
            while (this.enemyList.length < this.gridRows) this.enemyList.push(Array(this.gridCols).fill("00"));
             this.enemyList = this.enemyList.map(row => {
                 if (!Array.isArray(row)) row = Array(this.gridCols).fill("00");
                 row = row.slice(0, this.gridCols);
                 while (row.length < this.gridCols) row.push("00");
                 return row.map(cell => (typeof cell === 'string' ? cell : "00"));
             });

            const path = `games/evil-invaders/stage${this.currentStage}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showTemporaryMessage(`Stage ${this.currentStage} Saved!`, '#00ff00'); // Success message replaces Saving...
            console.log(`Stage ${this.currentStage} saved successfully.`);
        } catch (error) {
            console.error(`Error saving stage ${this.currentStage}:`, error);
            this.showTemporaryMessage(`Save Error: ${error.message || 'Unknown error'}`, '#ff0000', 5000); // Show error for 5s
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

        this.showTemporaryMessage(`Loading Stage ${stageNumber}...`, '#ffffff', 0); // Persistent loading message

         const previousStage = this.currentStage;

        try {
            this.currentStage = stageNumber;
            this.updateStageButtons(); // Update UI immediately
            await this.fetchEnemyList(); // Fetch new data

             // Re-populate grid visually (calls cleanup)
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
             // Consider attempting to reload previous stage data here if needed
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
            this.initializeDefaultEnemyList();

            const path = `games/evil-invaders/stage${newStageNumber}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            // Clear visual grid content
            this.cleanupGameObjects();
            // Ensure enemyGroup is recreated after cleanup
             if (!this.enemyGroup) {
                 this.enemyGroup = this.add.group();
             }

            // Recreate palette panel to include the new stage button
             if (this.palettePanel) this.palettePanel.destroy();
             if (this.saveButton) this.saveButton.destroy();
             if (this.saveButtonBg) this.saveButtonBg.destroy();
            this.createPalettePanel(); // Recreates panel, stage buttons, save button

            // Populate the (now empty) grid visually
            // this.populateGridFromEnemyList(); // Already cleaned up, grid is visually empty

            this.hasUnsavedChanges = false;
             this.updateSaveButtonState();
            this.showTemporaryMessage(`Stage ${newStageNumber} Created!`, '#00ff00');

        } catch (error) {
            console.error("Error creating new stage:", error);
            this.showTemporaryMessage("Error Creating Stage!", '#ff0000', 5000);
             // Consider reverting availableStages/currentStage changes if Firebase write failed
        }
    }


    // --- Helpers & Utilities ---

     // Centralized function for temporary messages
     showTemporaryMessage(text, color = '#ffffff', duration = 2000) {
          // Remove existing message if any
          const existingMessage = this.children.getByName('tempMessage');
          if (existingMessage) existingMessage.destroy();

          const messageText = this.add.text(
               LevelEditorScene.WIDTH / 2,
               LevelEditorScene.HEIGHT / 2, // Center within the window
               text,
               {
                    fontSize: '18px', // Slightly smaller
                    color: color,
                    backgroundColor: 'rgba(0,0,0,0.7)', // Dark semi-transparent background
                    padding: { x: 15, y: 8 },
                    align: 'center',
                    wordWrap: { width: LevelEditorScene.WIDTH * 0.8 } // Wrap text if needed
               }
          )
               .setOrigin(0.5)
               .setDepth(10003) // Ensure it's above menus/overlays
               .setName('tempMessage'); // Assign name for easy removal

          // Auto-destroy after duration, unless duration is 0 or less
          if (duration > 0) {
               this.time.delayedCall(duration, () => {
                    messageText.destroy();
               });
          }
     }

    updateStageButtons() {
         if (!this.paletteIcons || !this.palettePanel) return; // Ensure panel and icons exist

        // Iterate through children of the palette panel container
        this.palettePanel.list.forEach(icon => {
             if (icon && icon.active && icon.getData && typeof icon.getData === 'function') {
                 if (icon.getData('isStageButton')) {
                     const stageNum = icon.getData('stageNumber');
                     const bg = icon.getData('stageButtonBg');
                     const isActive = (stageNum === this.currentStage);
                     const buttonX = icon.getData('buttonX'); // Use stored relative X
                     const buttonY = icon.getData('buttonY'); // Use stored relative Y
                     const buttonSize = icon.getData('buttonSize');


                     if (typeof icon.setColor === 'function') {
                         icon.setColor(isActive ? "#fff" : "#ccc");
                     }
                     if (bg?.active && typeof bg.clear === 'function') { // Check bg exists and is active
                          bg.clear()
                              .fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8)
                              .fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 14); // Use stored coords/size
                     }
                 }
             }
        });
    }

    cleanupGameObjects() {
         console.log("Cleaning up game objects...");
         if (this.enemyGroup && typeof this.enemyGroup.getChildren === 'function') {
             this.enemyGroup.getChildren().forEach(sprite => {
                 if (sprite?.getData) { // Check sprite exists
                     const powerupContainer = sprite.getData("powerupContainer");
                     if (powerupContainer?.destroy) { // Check container exists
                         powerupContainer.destroy();
                     }
                 }
             });
              if (typeof this.enemyGroup.clear === 'function') {
                 this.enemyGroup.clear(true, true); // Destroy children and remove them
              }
         }

        if (this.cursorPreview?.destroy) { // Check preview exists
            this.cursorPreview.destroy();
            this.cursorPreview = null;
        }
        this.closeEnemySelectMenu();
        this.closeItemSelectMenu();
        this.menuOpen = false;

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
         // Position relative to bottom-right of the window
          const buttonSize = 30; // Approximate size
          const margin = 10;
         const buttonX = LevelEditorScene.WIDTH - buttonSize / 2 - margin;
         const buttonY = LevelEditorScene.HEIGHT - buttonSize / 2 - margin;


        this.gamepadInfoButton = this.add.text(buttonX, buttonY, "ℹ️",
            { fontSize: '20px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 2 }, } // Slightly smaller
        ).setOrigin(0.5).setInteractive().setDepth(501);

         this.gamepadInfoButton.on("pointerdown", () => this.showGamepadHelp(LevelEditorScene.WIDTH, LevelEditorScene.HEIGHT));
          this.gamepadInfoButton.on("pointerover", () => this.gamepadInfoButton?.setColor('#ffff00'));
          this.gamepadInfoButton.on("pointerout", () => this.gamepadInfoButton?.setColor('#ffffff'));

         if (this.tweens && this.gamepadInfoButton) {
              this.tweens.killTweensOf(this.gamepadInfoButton); // Kill previous tween if exists
             this.tweens.add({ targets: this.gamepadInfoButton, scale: { from: 1, to: 1.15 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
         }
    }


    showGamepadHelp(containerWidth, containerHeight) {
         if (this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
         if (this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();

        // Overlay covers the scene viewport
        this.gamepadHelpOverlay = this.add.rectangle(0, 0, containerWidth, containerHeight, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(10001);

        // Panel centered within the viewport
        this.gamepadHelpPanel = this.add.container(containerWidth / 2, containerHeight / 2)
            .setDepth(10002);

        const panelWidth = Math.min(450, containerWidth - 40); // Adjust size based on container
        const panelHeight = Math.min(360, containerHeight - 60);
        const bg = this.add.graphics();
         bg.fillStyle(0x333333, 0.95);
         bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
         bg.lineStyle(2, 0xAAAAAA);
         bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
        this.gamepadHelpPanel.add(bg);


        const title = this.add.text(0, -panelHeight / 2 + 25, "GAMEPAD CONTROLS", {
            fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#FFFFFF" // Smaller title
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
        const textStyle = { fontFamily: "monospace", fontSize: "15px", color: "#E0E0E0", align: 'left'}; // Smaller font
         const textX = -panelWidth / 2 + 25;

        instructions.forEach(line => {
              if (y > panelHeight / 2 - 30) return; // Prevent text overflowing panel
             const txt = this.add.text(textX, y, line, textStyle).setOrigin(0, 0);
            this.gamepadHelpPanel.add(txt);
            y += 24; // Adjust line spacing
        });

        this.gamepadHelpOverlay.on("pointerdown", () => {
            if(this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
            if(this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();
             this.gamepadHelpPanel = null;
             this.gamepadHelpOverlay = null;
        });
    }

    // --- Static Dimensions for EditorScene ---
    // Define dimensions for the window frame. Adjust these if 'levels-window.png' has different dimensions.
    // static WIDTH = 408; // Example width (same as Invaders)
    // static HEIGHT = 326; // Example height (same as Invaders)
    static WIDTH = 800; // Example width (same as Invaders)
    static HEIGHT = 600;
}