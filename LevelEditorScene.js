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
    // Grid and stage properties
    gridRows = 45;
    gridCols = 8;
    cellWidth = 100;
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

    constructor() {
        super({ key: "LevelEditorScene" }); // Use a unique key

        // Initialize Firebase App
        try {
             this.app = initializeApp(firebaseConfig);
             this.database = getDatabase(this.app);
        } catch (error) {
             console.error("Firebase initialization failed:", error);
             // Handle initialization error appropriately (e.g., show message, disable features)
             this.app = null;
             this.database = null;
        }
    }

    preload() {
        if (!this.database) {
            console.error("Firebase Database not initialized. Cannot load assets.");
            // Display an error message on screen
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
                    this.atlasLoaded = false; // Ensure flag is false
                    // Consider restarting or showing error
                     if (this.scene.isActive()) {
                         // Optionally show error text
                         this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 30,
                             "Incomplete atlas data.", { fontSize: "18px", color: "#ffcc00" }).setOrigin(0.5);
                         // Maybe don't restart, let create handle the missing atlas
                     }
                    return;
                }
                const base64PNG = "data:image/png;base64," + atlasVal.png;
                const atlasJSON = JSON.parse(atlasVal.json);

                // Add the atlas image as a base64 texture
                this.textures.addBase64('game_asset', base64PNG);

                // Wait for the base64 texture to be added before adding the atlas frames
                this.textures.once('onload', () => {
                    console.log("Base64 texture loaded for game_asset.");
                    try {
                        this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                        this.atlasLoaded = true;
                        console.log("Atlas JSON Hash added for game_asset.");
                        // Only restart if the scene is actually running and intended to restart
                        if (this.scene.isActive() && !this.scene.isSleeping()) {
                             console.log("Restarting scene after atlas load.");
                             this.scene.restart();
                        } else {
                             console.log("Scene not active or restarting skipped.");
                        }
                    } catch (e) {
                        console.error("Error adding Atlas JSON Hash:", e);
                        this.atlasLoaded = false;
                    }
                });

                 // Check immediately if the texture exists (sometimes onload might not fire as expected)
                 if (this.textures.exists('game_asset') && !this.atlasLoaded) {
                     console.log("Texture exists, attempting to add atlas hash directly.");
                     try {
                         this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                         this.atlasLoaded = true;
                          console.log("Atlas JSON Hash added directly for game_asset.");
                         if (this.scene.isActive() && !this.scene.isSleeping()) {
                              console.log("Restarting scene after direct atlas hash addition.");
                              this.scene.restart();
                         } else {
                              console.log("Scene not active or restarting skipped after direct add.");
                         }
                     } catch (e) {
                         console.error("Error adding Atlas JSON Hash directly:", e);
                         this.atlasLoaded = false;
                     }
                 }


                // Fallback: If 'onload' doesn't fire, set a timeout to add the atlas after a short delay
                setTimeout(() => {
                    if (!this.atlasLoaded && this.textures.exists('game_asset')) {
                        console.log("Fallback timeout: Adding atlas hash.");
                        try {
                            this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                            this.atlasLoaded = true;
                            console.log("Atlas JSON Hash added via fallback timeout.");
                             if (this.scene.isActive() && !this.scene.isSleeping()) {
                                 console.log("Restarting scene after fallback atlas load.");
                                 this.scene.restart();
                             } else {
                                 console.log("Scene not active or restarting skipped after fallback.");
                             }
                        } catch (e) {
                            console.error("Error adding Atlas JSON Hash in fallback:", e);
                            this.atlasLoaded = false;
                        }
                    } else if (!this.textures.exists('game_asset')) {
                         console.warn("Fallback timeout: Texture 'game_asset' still doesn't exist.");
                    }
                }, 500); // Increased timeout slightly

            } else {
                console.error("Atlas 'evil-invaders' not found in Firebase!");
                this.atlasLoaded = false;
                 if (this.scene.isActive()) {
                     // Show error text
                     this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 30,
                         "Atlas not found in database.", { fontSize: "18px", color: "#ffcc00" }).setOrigin(0.5);
                 }
            }
        }).catch(error => {
            console.error("Error loading atlas from Firebase:", error);
             this.atlasLoaded = false;
             if (this.scene.isActive()) {
                 // Show error text
                 this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 30,
                     "Error loading atlas.", { fontSize: "18px", color: "#ffcc00" }).setOrigin(0.5);
             }
        });

        // Indicate loading via text while atlas loads async
        const loadingText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Loading Assets...", { fontSize: "24px", color: "#fff" }
        ).setOrigin(0.5);
        // Remove loading text when scene restarts (atlas loaded) or shuts down
        this.events.once('shutdown', () => { if (loadingText) loadingText.destroy(); });
        // Also remove if create fails and we don't restart
         this.loadingText = loadingText; // Store reference to remove later if needed
    }

    async create() {
         // Remove the initial loading text if it exists
         if (this.loadingText) {
             this.loadingText.destroy();
             this.loadingText = null;
         }
        // Wait for atlas to be loaded before proceeding
        if (!this.textures.exists('game_asset') || !this.atlasLoaded) {
             console.error("'game_asset' texture atlas not loaded or ready. Cannot proceed with create.");
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                "Error: Required assets not loaded. Please wait or refresh.", { fontSize: "20px", color: "#ff0000" }).setOrigin(0.5);
            // Don't proceed until atlas is loaded; scene will restart when ready (or user refreshes)
            return;
        }
        if (!this.database) {
             console.error("Firebase Database not initialized. Cannot proceed with create.");
             this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                 "Error: Database connection failed.", { fontSize: "20px", color: "#ff0000" }
             ).setOrigin(0.5);
             return;
         }


        console.log("LevelEditorScene create started");

        const loadingDataText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "Loading level data...",
            { fontSize: "24px", color: "#fff" } // Use 'color' instead of 'fill'
        ).setOrigin(0.5);

        try {
            await this.fetchGameStructure();
            await Promise.all([this.fetchEnemyData(), this.fetchEnemyList()]);
            loadingDataText.destroy();

            if (!this.enemyList || this.enemyList.length === 0) {
                this.initializeDefaultEnemyList();
                console.log("Initialized default empty enemy list.");
            } else {
                console.log(`Loaded enemy list for stage ${this.currentStage} with ${this.enemyList.length} rows.`);
                 // Basic validation after load
                 if (!Array.isArray(this.enemyList) || !this.enemyList.every(row => Array.isArray(row))) {
                     console.warn(`Invalid enemyList structure loaded for stage ${this.currentStage} during create. Resetting.`);
                     this.initializeDefaultEnemyList();
                 }
            }

            this.drawGrid();
            this.createPalettePanel(); // Ensure this uses loaded assets
            this.enemyGroup = this.add.group();
            this.populateGridFromEnemyList(); // Ensure this uses loaded assets

            // Use Scene's input manager for pointerdown
            this.input.off("pointerdown", this.handlePlaceObject, this); // Ensure no duplicates
            this.input.on("pointerdown", this.handlePlaceObject, this);
            this.placeObjectHandler = this.input; // Reference input manager

            // Initialize gamepad manager
            if (this.gamepadEnabled) {
                this.gamepadManager = createGamepadManager(this);
                this.createGamepadInstructions();
            }

            // Remove previous listener if it exists
             window.removeEventListener("beforeunload", this.beforeUnloadHandler);
             // Add new listener
             this.beforeUnloadHandler = (e) => {
                 if (this.hasUnsavedChanges) {
                     e.preventDefault();
                     e.returnValue = "Unsaved changes will be lost!";
                 }
             };
             window.addEventListener("beforeunload", this.beforeUnloadHandler);

            console.log("LevelEditorScene creation complete.");

        } catch (error) {
            loadingDataText.setText("Error loading data. Check console.");
            console.error("Error during LevelEditorScene create:", error);
             // Optionally add more specific error text on screen
             this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 40,
                 "Failed to load game data.", { fontSize: "18px", color: "#ffcc00" }).setOrigin(0.5);
        }
    }


    // Cleanup on shutdown
    shutdown() {
        console.log("LevelEditorScene shutdown.");
        // Remove the window event listener
        if (this.beforeUnloadHandler) {
            window.removeEventListener("beforeunload", this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        // Clean up Phaser listeners
        this.input?.off("pointerdown", this.handlePlaceObject, this);
        this.input?.off('wheel'); // Ensure wheel listener is off
         this.textures?.off('onload'); // Clean up texture listeners if any persist
         this.events?.off('shutdown'); // Clean up self listener
        // Destroy gamepad manager resources if necessary (e.g., visuals)
        this.gamepadManager?.destroyCursorVisual();
        // Call cleanup for Phaser objects
        this.cleanupGameObjects();
         // Ensure all containers/overlays are destroyed
         if (this.enemySelectContainer) this.enemySelectContainer.destroy();
         if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();
         if (this.itemSelectContainer) this.itemSelectContainer.destroy();
         if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();
         if (this.palettePanel) this.palettePanel.destroy();
         // Destroy buttons and graphics explicitly if not part of containers
          if (this.saveButton && this.saveButton.destroy) this.saveButton.destroy();
          if (this.saveButtonBg && this.saveButtonBg.destroy) this.saveButtonBg.destroy();
          if (this.gridGraphics && this.gridGraphics.destroy) this.gridGraphics.destroy();
          if (this.gamepadInfoButton && this.gamepadInfoButton.destroy) this.gamepadInfoButton.destroy();
          if (this.gamepadHelpPanel && this.gamepadHelpPanel.destroy) this.gamepadHelpPanel.destroy();
          if (this.gamepadHelpOverlay && this.gamepadHelpOverlay.destroy) this.gamepadHelpOverlay.destroy();
    }


    update(time, delta) { // Add time and delta params
        // Pointer position update logic
        const pointer = this.input.activePointer;
        const isGamepadControlling = this.gamepadManager?.isEnabled && this.gamepadManager?.connected;

        if (!isGamepadControlling) {
            this.mouseX = pointer.x;
            this.mouseY = pointer.y;

            // Update cursor preview position if it exists and is not controlled by gamepad
            if (this.cursorPreview && this.cursorPreview.active) { // Check if active
                if (this.cursorPreview instanceof Phaser.GameObjects.Container || this.cursorPreview instanceof Phaser.GameObjects.Sprite) {
                    this.cursorPreview.setPosition(this.mouseX, this.mouseY);
                }
            }
        }
        // Update gamepad manager (it handles its own cursor updates)
        if (this.gamepadManager && this.gamepadEnabled) {
            this.gamepadManager.update(); // Pass time and delta if needed by gamepad logic
            // If gamepad is controlling, mouseX/mouseY are updated inside gamepadManager
            if (isGamepadControlling) {
                this.mouseX = this.gamepadManager.cursor.x;
                this.mouseY = this.gamepadManager.cursor.y;
                // GamepadManager's update should handle moving the cursorPreview
            }
        }
    }

    // --- Data Fetching ---

    async fetchGameStructure() {
         if (!this.database) throw new Error("Database not available for fetchGameStructure");
        const snapshot = await get(ref(this.database, "games/evil-invaders"));
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            // Filter keys that match the pattern "stage" followed by digits
            this.availableStages = Object.keys(gameData)
                .filter(k => /^stage\d+$/.test(k))
                .map(k => parseInt(k.slice(5), 10)) // Extract number after "stage"
                .sort((a, b) => a - b); // Sort numerically

            if (this.availableStages.length === 0) {
                this.availableStages = [0]; // Default to stage 0 if none found
            }
            // Ensure currentStage is valid, default to first available stage
             this.currentStage = this.availableStages.includes(this.currentStage) ? this.currentStage : this.availableStages[0];
            console.log("Available stages:", this.availableStages, "Current:", this.currentStage);
        } else {
            this.availableStages = [0]; // Default if no game data
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
            // Basic validation: ensure it's an array of arrays
            if (!Array.isArray(this.enemyList) || !this.enemyList.every(row => Array.isArray(row))) {
                console.warn(`Invalid enemyList structure loaded for stage ${this.currentStage}. Resetting.`);
                this.initializeDefaultEnemyList();
            } else {
                 // Further validation: Ensure correct number of rows and columns
                 this.enemyList = this.enemyList.map(row => {
                     if (!Array.isArray(row)) row = []; // Fix non-array rows
                     while (row.length < this.gridCols) row.push("00"); // Pad columns
                     return row.slice(0, this.gridCols); // Trim columns
                 });
                 while (this.enemyList.length < this.gridRows) { // Pad rows
                     this.enemyList.push(Array(this.gridCols).fill("00"));
                 }
                 if (this.enemyList.length > this.gridRows) { // Trim rows
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
        if (this.gridGraphics) this.gridGraphics.destroy(); // Clear previous grid if redrawing
        this.gridGraphics = this.add.graphics({ lineStyle: { width: 1, color: 0xffffff, alpha: 0.3 } }); // Store reference
        const gridTotalWidth = this.gridCols * this.cellWidth;
        const gridTotalHeight = this.gridRows * this.cellHeight;

        for (let r = 0; r <= this.gridRows; r++) {
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(0, r * this.cellHeight, gridTotalWidth, r * this.cellHeight));
        }
        for (let c = 0; c <= this.gridCols; c++) {
            this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(c * this.cellWidth, 0, c * this.cellWidth, gridTotalHeight));
        }
        console.log("Grid drawn.");
    }

    createPalettePanel() {
         if (this.palettePanel) this.palettePanel.destroy(); // Destroy existing before creating new
          if (this.saveButton) this.saveButton.destroy(); // Destroy old save button
          if (this.saveButtonBg) this.saveButtonBg.destroy(); // Destroy old save button background

        const panelWidth = this.cameras.main.width; // Use camera width
        const panelHeight = 70;
        this.palettePanel = this.add.container(0, 0).setDepth(500); // Ensure panel is above grid/enemies
        this.paletteIcons = []; // Reset icons array

        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.7);
        bg.fillRoundedRect(0, 0, panelWidth, panelHeight, 15);
        this.palettePanel.add(bg);

        const iconSpacing = 70;
        let iconX = 25;
        const paletteY = 15;
        const buttonSize = 40;

        // Define tools - ensure icon keys match loaded assets
        const tools = [
             // Use placeholder text/emoji if specific icons aren't guaranteed
            { type: "enemy", label: "👽", color: 0x3498db, labelText: "Enemy" }, // Emoji placeholder
            { type: "powerup", label: "🍄", color: 0x2ecc71, labelText: "Items" },
            { type: "delete", label: "🗑️", color: 0xe74c3c, labelText: "Delete" },
            { type: "randomize", label: "🎲", color: 0xf39c12, labelText: "Random" }
        ];


        tools.forEach(tool => {
            const buttonBg = this.add.graphics();
            buttonBg.fillStyle(tool.color, 0.9);
            buttonBg.fillRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3);
            buttonBg.strokeRoundedRect(iconX, paletteY, buttonSize, buttonSize, 10);
            this.palettePanel.add(buttonBg);

            let uiElement;
            // Simplified: Always use label text/emoji for tool buttons
            uiElement = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize / 2, tool.label, {
                fontFamily: "Arial", fontSize: "20px", color: "#fff"
            }).setOrigin(0.5).setInteractive();

            const label = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize + 5, tool.labelText, {
                fontFamily: "Arial", fontSize: "12px", color: "#ffffff", stroke: "#000000", strokeThickness: 1
            }).setOrigin(0.5, 0);
            this.palettePanel.add(label);

            // Store references and data on the uiElement itself
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
            this.paletteIcons.push(uiElement); // Add button icon to the list
            iconX += iconSpacing;
        });

        // Divider
        const divider = this.add.graphics();
        divider.lineStyle(2, 0xFFFFFF, 0.3);
        divider.lineBetween(iconX, paletteY, iconX, paletteY + buttonSize);
        this.palettePanel.add(divider);
        iconX += 20;

        // Stage Selector
        const stageText = this.add.text(iconX, paletteY + 5, "STAGE:", {
            fontFamily: "Arial", fontSize: "16px", color: "#fff", fontStyle: 'bold'
        });
        this.palettePanel.add(stageText);
        // Note: Stage text is not interactive, not added to paletteIcons for interaction checks
        iconX += stageText.width + 10; // Adjust spacing based on text width

        this.updateStageButtonsUI(iconX, paletteY); // Call helper to create stage buttons

        // Save Button (Positioned relative to panel/camera)
        const saveButtonWidth = 130;
        const saveButtonHeight = 35;
        const saveButtonX = 20; // Position from left edge
        const saveButtonY = this.cameras.main.height - saveButtonHeight - 10; // Position from bottom edge

        this.saveButtonBg = this.add.graphics().setDepth(499); // Below panel but above other things
        this.saveButtonBg.fillStyle(0x9b59b6, 0.9); // Purple
        this.saveButtonBg.fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
        // this.add.existing(this.saveButtonBg); // Graphics objects are added automatically

        this.saveButton = this.add.text(
            saveButtonX + saveButtonWidth / 2,
            saveButtonY + saveButtonHeight / 2,
            "SAVE LEVEL",
            {
                fontFamily: "Arial", fontSize: "16px", fontStyle: 'bold',
                color: "#ffffff", padding: { x: 15, y: 5 }
            }
        )
            .setOrigin(0.5)
            .setInteractive()
            .setDepth(500); // Ensure button text is above its bg

         this.saveButton.on("pointerover", () => {
             this.saveButtonBg.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
         });
         this.saveButton.on("pointerout", () => {
             this.saveButtonBg.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
             // Reset if unsaved changes exist
             if(this.hasUnsavedChanges) this.updateSaveButtonState();
         });
         this.saveButton.on("pointerdown", () => this.saveLevel());

        this.paletteIcons.push(this.saveButton); // Add save button for bounds checking

        console.log("Palette panel created.");
         this.updateSaveButtonState(); // Set initial state
    }

    updateSaveButtonState() {
        if (!this.saveButton || !this.saveButton.active) return; // Check if button exists

        const saveButtonWidth = 130;
        const saveButtonHeight = 35;
        const saveButtonX = 20;
        const saveButtonY = this.cameras.main.height - saveButtonHeight - 10;

        if (this.hasUnsavedChanges) {
            this.saveButton.setText("SAVE*");
            this.saveButtonBg.clear().fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); // Red tint
             this.saveButton.on("pointerover", () => { this.saveButtonBg.clear().fillStyle(0xc0392b, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); });
             this.saveButton.on("pointerout", () => { this.saveButtonBg.clear().fillStyle(0xe74c3c, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); });

        } else {
            this.saveButton.setText("SAVE");
             this.saveButtonBg.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); // Purple
              this.saveButton.on("pointerover", () => { this.saveButtonBg.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); });
              this.saveButton.on("pointerout", () => { this.saveButtonBg.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10); });
        }
    }


    updateStageButtonsUI(startX, startY) {
        let currentX = startX;
        const buttonSize = 30;
        const buttonSpacing = 5;
        const paletteY = startY; // Use the passed Y position

        // Remove existing stage buttons and "+" button before recreating
        // Filter paletteIcons AND destroy the associated game objects
        this.paletteIcons = this.paletteIcons.filter(icon => {
            const isStageButton = icon.getData && icon.getData('isStageButton');
            const isAddButton = icon.getData && icon.getData('isAddButton');

            if (isStageButton) {
                 const bg = icon.getData('stageButtonBg');
                 if (bg && bg.destroy) bg.destroy(); // Check destroy exists
                 if (icon.destroy) icon.destroy(); // Check destroy exists
                 return false; // Remove from array
            }
            if (isAddButton) {
                  const bg = icon.getData('addButtonBg');
                  if (bg && bg.destroy) bg.destroy();
                  if (icon.destroy) icon.destroy();
                 return false; // Remove from array
            }
            return true; // Keep other icons
        });


        // Add stage number buttons based on available stages
        this.availableStages.forEach(stageNum => {
            const stageButtonBg = this.add.graphics();
            const isActive = stageNum === this.currentStage;
            stageButtonBg.fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8);
            stageButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
            this.palettePanel.add(stageButtonBg);

            const stageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, stageNum.toString(), {
                fontFamily: "Arial", fontSize: "16px", fontStyle: 'bold',
                color: isActive ? "#fff" : "#ccc"
            })
                .setOrigin(0.5)
                .setInteractive()
                .setData('isStageButton', true) // Mark as stage button
                .setData('stageNumber', stageNum)
                .setData('stageButtonBg', stageButtonBg); // Store ref

            stageBtn.on("pointerover", () => {
                 // Check if bg still exists before modifying
                 const bg = stageBtn.getData('stageButtonBg');
                 if (bg && bg.active) {
                    bg.clear().fillStyle(stageBtn.getData('stageNumber') === this.currentStage ? 0xf1c40f : 0x777777, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
                 }
            });
            stageBtn.on("pointerout", () => {
                 const bg = stageBtn.getData('stageButtonBg');
                 if (bg && bg.active) {
                     bg.clear().fillStyle(stageBtn.getData('stageNumber') === this.currentStage ? 0xf39c12 : 0x555555, 0.8).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
                 }
            });
            stageBtn.on("pointerdown", () => {
                this.changeStage(stageNum);
            });

            this.palettePanel.add(stageBtn);
            this.paletteIcons.push(stageBtn); // Add to main list for bounds check
            currentX += buttonSize + buttonSpacing;
        });

        // Add "+" button to create a new stage
        const addButtonBg = this.add.graphics();
        addButtonBg.fillStyle(0x27ae60, 0.9); // Green
        addButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
        this.palettePanel.add(addButtonBg);

        const addStageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, "+", {
            fontFamily: "Arial", fontSize: "20px", fontStyle: 'bold', color: "#ffffff"
        })
            .setOrigin(0.5)
            .setInteractive()
            .setData('isAddButton', true) // Mark as add button
            .setData('addButtonBg', addButtonBg); // Store ref

        addStageBtn.on("pointerover", () => {
             const bg = addStageBtn.getData('addButtonBg');
             if (bg && bg.active) {
                 bg.clear().fillStyle(0x2ecc71, 1).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
             }
        });
        addStageBtn.on("pointerout", () => {
              const bg = addStageBtn.getData('addButtonBg');
              if (bg && bg.active) {
                 bg.clear().fillStyle(0x27ae60, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
              }
        });
        addStageBtn.on("pointerdown", () => {
            this.createNewStage();
        });

        this.palettePanel.add(addStageBtn);
        this.paletteIcons.push(addStageBtn); // Add to main list
    }

    handleToolSelection(toolType, uiElement) {
        this.currentTool = toolType;
        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null;
        this.highlightToolButton(uiElement); // Pass the element itself

        this.selectedEnemy = null; // Reset selections by default
        this.selectedItem = null;

        if (toolType === "enemy") this.showEnemySelectMenu();
        else if (toolType === "powerup") this.showItemSelectMenu();
        else if (toolType === "delete") {
            console.log("Selected tool:", toolType);
        } else if (toolType === "randomize") this.randomizeLevel();
    }

    handleToolHover(uiElement, isOver) {
        const buttonBg = uiElement.getData('toolButton'); // Use getData
        // const tool = uiElement; // uiElement already has the data via getData

        if (!buttonBg || !buttonBg.active) return; // Safety check if bg was destroyed

        const toolColor = uiElement.getData('toolColor');
        const buttonX = uiElement.getData('buttonX');
        const buttonY = uiElement.getData('buttonY');
        const buttonSize = uiElement.getData('buttonSize');


        buttonBg.clear();
        if (isOver) {
            buttonBg.fillStyle(toolColor, 1); // Full opacity on hover
            buttonBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.7); // Brighter border
            buttonBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
        } else if (this.activeToolButton !== uiElement) { // Only reset if not the active button
            buttonBg.fillStyle(toolColor, 0.9); // Default opacity
            buttonBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3); // Default border
            buttonBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
        } else {
            // Redraw active state if pointer moves out but it's still active
             this.highlightToolButton(this.activeToolButton); // Re-apply highlight visuals
        }

        // Scale animation - check if uiElement supports scale (e.g., Image or Text)
        const baseScale = (uiElement instanceof Phaser.GameObjects.Image) ? 0.4 : 1.0; // Example check
        const targetScale = baseScale * (isOver ? 1.1 : 1.0);

        // Check if tween manager exists and uiElement has scale property
         if (this.tweens && uiElement.scale !== undefined) {
             this.tweens.add({
                 targets: uiElement,
                 scale: targetScale,
                 duration: 100,
                 ease: "Linear"
             });
         }
    }

    highlightToolButton(tool) {
        // Reset previous active tool
        if (this.activeToolButton && this.activeToolButton !== tool) {
             const prevTool = this.activeToolButton;
             const prevBg = prevTool.getData('toolButton'); // Use getData
              const prevToolColor = prevTool.getData('toolColor');
              const prevButtonX = prevTool.getData('buttonX');
              const prevButtonY = prevTool.getData('buttonY');
              const prevButtonSize = prevTool.getData('buttonSize');

             if (prevBg && prevBg.active) { // Check if background exists and is active
                 prevBg.clear();
                 prevBg.fillStyle(prevToolColor, 0.9);
                 prevBg.fillRoundedRect(prevButtonX, prevButtonY, prevButtonSize, prevButtonSize, 10);
                 prevBg.lineStyle(2, 0xFFFFFF, 0.3);
                 prevBg.strokeRoundedRect(prevButtonX, prevButtonY, prevButtonSize, prevButtonSize, 10);
             }
        }

        // Highlight new active tool
        this.activeToolButton = tool;
         const activeToolBg = tool.getData('toolButton');
         const toolColor = tool.getData('toolColor');
         const buttonX = tool.getData('buttonX');
         const buttonY = tool.getData('buttonY');
         const buttonSize = tool.getData('buttonSize');

         if (activeToolBg && activeToolBg.active) { // Check if background exists and is active
             activeToolBg.clear();
             activeToolBg.fillStyle(toolColor, 1); // Full opacity
             activeToolBg.fillRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
             activeToolBg.lineStyle(3, 0xFFFFFF, 1); // Thicker, brighter border
             activeToolBg.strokeRoundedRect(buttonX, buttonY, buttonSize, buttonSize, 10);
         }
    }


    showEnemySelectMenu() {
        if (this.menuOpen) return; // Prevent opening multiple menus
        this.menuOpen = true;
        // Turn off main pointer handler
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();

        this.enemySelectOverlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000); // High depth
        this.enemySelectOverlay.on("pointerdown", this.closeEnemySelectMenu, this);

        const menuWidth = 300;
        const numEnemies = Object.keys(this.enemyData).length;
        const contentHeight = numEnemies * 60 + 20;
        const menuHeight = Math.min(contentHeight, this.cameras.main.height - 120); // Limit height
        const menuX = (this.cameras.main.width - menuWidth) / 2; // Center horizontally
        const menuY = 100; // Position from top

        this.enemySelectContainer = this.add.container(menuX, menuY).setDepth(1001); // Above overlay

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.enemySelectContainer.add(bg);

        // Container for scrollable content
         const contentContainer = this.add.container(0, 0);
         this.enemySelectContainer.add(contentContainer);


        // Add content to the inner container
        let i = 0;
        const spacing = 60;
        const itemX = 10;
        const labelX = 70;
        for (let enemyKey in this.enemyData) {
            const enemyInfo = this.enemyData[enemyKey];
            // Ensure texture exists before trying to display
            if (!enemyInfo.texture || !enemyInfo.texture[0] || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
                console.warn(`Skipping enemy ${enemyKey} in menu: Texture '${enemyInfo.texture?.[0]}' not found.`);
                continue; // Skip this enemy
            }

            const yPos = 10 + i * spacing;

            const enemyImage = this.add.image(itemX, yPos, "game_asset", enemyInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            enemyImage.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            const enemyLabel = this.add.text(labelX, yPos + enemyImage.displayHeight / 2, enemyInfo.name, { // Use displayHeight
                fontFamily: "Arial", fontSize: "18px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive(); // Align to middle
            enemyLabel.on("pointerdown", (p) => this.selectEnemy(p, enemyKey, enemyInfo));

            contentContainer.add(enemyImage);
            contentContainer.add(enemyLabel);
            i++;
        }

         // Add a scrollable mask ONLY if content exceeds menu height
         if (contentHeight > menuHeight) {
              const scrollMask = this.make.graphics();
              scrollMask.fillStyle(0xffffff);
              // Position mask relative to the main container (enemySelectContainer)
              scrollMask.fillRect(menuX, menuY, menuWidth, menuHeight);
              const mask = scrollMask.createGeometryMask();
              contentContainer.setMask(mask); // Apply mask to the inner content container

             // Store necessary info for scrolling
             contentContainer.setData('isScrolling', false);
             contentContainer.setData('startY', 0);
             contentContainer.setData('startPointerY', 0);
             contentContainer.setData('minY', menuHeight - contentHeight); // Max scroll up amount (negative)
             contentContainer.setData('maxY', 0); // Max scroll down amount (initial position)

             // Simple Drag Scrolling on the content container
             contentContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, menuWidth, contentHeight), Phaser.Geom.Rectangle.Contains);
             this.input.setDraggable(contentContainer);

             contentContainer.on('dragstart', (pointer) => {
                  contentContainer.setData('isScrolling', true);
                  contentContainer.setData('startPointerY', pointer.y);
                  contentContainer.setData('startY', contentContainer.y);
             });

             contentContainer.on('drag', (pointer, dragX, dragY) => {
                 if (!contentContainer.getData('isScrolling')) return;
                 const startY = contentContainer.getData('startY');
                 const startPointerY = contentContainer.getData('startPointerY');
                 const newY = startY + (pointer.y - startPointerY);
                 // Clamp position within bounds
                 contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });

             contentContainer.on('dragend', (pointer) => {
                  contentContainer.setData('isScrolling', false);
             });


             // Optional: Add wheel scrolling listener
             this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                  // Check if the pointer is over the menu container bounds
                  const menuBounds = this.enemySelectContainer.getBounds();
                  if (this.enemySelectContainer && this.enemySelectContainer.active && Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y)) {
                       const currentY = contentContainer.y;
                       let newY = currentY - deltaY * 0.5; // Adjust scroll speed as needed

                       // Clamp scroll position
                       newY = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
                       contentContainer.y = newY;
                  }
             });
         } else {
              // No mask or scrolling needed if content fits
              console.log("Enemy menu content fits, no scrolling needed.");
         }
    }


    closeEnemySelectMenu() {
        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();
        this.enemySelectContainer = null;
        this.enemySelectOverlay = null;
        // Re-enable main pointer handler
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel'); // Turn off wheel listener specifically added for this menu
         // Turn off drag listeners if added
         this.input.off('dragstart');
         this.input.off('drag');
         this.input.off('dragend');
    }

    selectEnemy(pointer, enemyKey, enemyInfo) {
        pointer.event.stopPropagation(); // Prevent overlay click

        this.selectedEnemy = enemyKey;
        this.currentTool = "enemy";
        this.selectedItem = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
        // Ensure texture exists before creating preview
         if (enemyInfo.texture && enemyInfo.texture[0] && this.textures.get('game_asset').has(enemyInfo.texture[0])) {
            this.cursorPreview = this.add.sprite(this.mouseX, this.mouseY, "game_asset", enemyInfo.texture[0])
                .setAlpha(0.7)
                // .setScale(0.5) // Scaling might depend on original sprite size, adjust as needed
                .setDepth(1000);
         } else {
              console.warn(`Cannot create cursor preview for ${enemyKey}: Texture missing.`);
              this.cursorPreview = null;
         }

        this.highlightEnemyToolButton();
        this.lastSelectionTime = Date.now();
        this.closeEnemySelectMenu();
    }

    showItemSelectMenu() {
        if (this.menuOpen) return;
        this.menuOpen = true;
        if (this.placeObjectHandler) this.placeObjectHandler.off("pointerdown", this.handlePlaceObject, this);

        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();

        this.itemSelectOverlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.5)
            .setOrigin(0).setInteractive().setDepth(1000);
        this.itemSelectOverlay.on("pointerdown", this.closeItemSelectMenu, this);

        const menuWidth = 300;
        const numItems = Object.keys(this.itemData).length;
        const contentHeight = numItems * 60 + 20;
        const menuHeight = Math.min(contentHeight, this.cameras.main.height - 170); // Limit height
        const menuX = (this.cameras.main.width - menuWidth) / 2; // Center horizontally
        const menuY = 150; // Position from top

        this.itemSelectContainer = this.add.container(menuX, menuY).setDepth(1001); // Above overlay

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.itemSelectContainer.add(bg);

         // Container for scrollable content
         const contentContainer = this.add.container(0, 0);
         this.itemSelectContainer.add(contentContainer);

        let i = 0;
        const spacing = 60;
         const itemX = 10;
         const labelX = 70;
        for (let itemId in this.itemData) {
            const itemInfo = this.itemData[itemId];
             // Ensure texture exists
             if (!itemInfo.texture || !itemInfo.texture[0] || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                 console.warn(`Skipping item ${itemId} in menu: Texture '${itemInfo.texture?.[0]}' not found.`);
                 continue; // Skip this item
             }

            const yPos = 10 + i * spacing;

            const itemImage = this.add.image(itemX, yPos, "game_asset", itemInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            itemImage.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            const itemLabel = this.add.text(labelX, yPos + itemImage.displayHeight / 2, itemInfo.name, { // Use displayHeight
                fontFamily: "Arial", fontSize: "18px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive();
            itemLabel.on("pointerdown", (p) => this.selectItem(p, itemId, itemInfo));

            contentContainer.add(itemImage);
            contentContainer.add(itemLabel);
            i++;
        }

         // Add mask and scrolling if needed
         if (contentHeight > menuHeight) {
             const scrollMask = this.make.graphics();
             scrollMask.fillStyle(0xffffff);
             scrollMask.fillRect(menuX, menuY, menuWidth, menuHeight); // Position relative to camera/scene
             const mask = scrollMask.createGeometryMask();
             contentContainer.setMask(mask); // Apply mask to inner container

             // Store scroll data
             contentContainer.setData('isScrolling', false);
             contentContainer.setData('startY', 0);
             contentContainer.setData('startPointerY', 0);
             contentContainer.setData('minY', menuHeight - contentHeight);
             contentContainer.setData('maxY', 0);

             // Drag Scrolling
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
                  const newY = startY + (pointer.y - startPointerY);
                  contentContainer.y = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
             });
             contentContainer.on('dragend', () => { contentContainer.setData('isScrolling', false); });

             // Wheel scrolling
             this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                 const menuBounds = this.itemSelectContainer.getBounds();
                 if (this.itemSelectContainer && this.itemSelectContainer.active && Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y)) {
                     const currentY = contentContainer.y;
                     let newY = currentY - deltaY * 0.5;
                     newY = Phaser.Math.Clamp(newY, contentContainer.getData('minY'), contentContainer.getData('maxY'));
                     contentContainer.y = newY;
                 }
             });
         } else {
              console.log("Item menu content fits, no scrolling needed.");
         }
    }


    closeItemSelectMenu() {
        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();
        this.itemSelectContainer = null;
        this.itemSelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel'); // Turn off specific wheel listener
         // Turn off drag listeners if added
         this.input.off('dragstart');
         this.input.off('drag');
         this.input.off('dragend');
    }

    selectItem(pointer, itemId, itemInfo) {
        pointer.event.stopPropagation();

        this.selectedItem = itemId;
        this.currentTool = "powerup";
        this.selectedEnemy = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null; // Reset preview

         // Ensure texture exists before creating preview
         if (itemInfo.texture && itemInfo.texture[0] && this.textures.get('game_asset').has(itemInfo.texture[0])) {
             const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.3);
             const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.75);
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
        this.cleanupGameObjects(); // Use the dedicated cleanup method

        console.log(`Populating grid for stage ${this.currentStage}. List length: ${this.enemyList?.length}`);

        if (!this.enemyList || !Array.isArray(this.enemyList)) {
            console.error("Cannot populate grid: enemyList is invalid.");
            this.initializeDefaultEnemyList(); // Attempt to fix
            // If initialization doesn't help, maybe return or throw error
             if (!this.enemyList || !Array.isArray(this.enemyList)) {
                 console.error("Failed to initialize default enemy list. Aborting population.");
                 return;
             }
        }

        for (let row = 0; row < this.gridRows; row++) {
            // Ensure the row exists and is an array
            if (!this.enemyList[row] || !Array.isArray(this.enemyList[row])) {
                console.warn(`Row ${row} missing or invalid in enemyList. Fixing.`);
                // Fix the row:
                 this.enemyList[row] = Array(this.gridCols).fill("00"); // Create/reset row
            }

            for (let col = 0; col < this.gridCols; col++) {
                // Ensure the cell exists
                if (this.enemyList[row][col] === undefined || typeof this.enemyList[row][col] !== 'string') {
                    console.warn(`Cell (${row}, ${col}) missing or invalid type. Setting to '00'.`);
                    this.enemyList[row][col] = "00";
                }

                const code = this.enemyList[row][col];
                if (code !== "00") {
                    const letter = code.charAt(0);
                    const powerup = code.charAt(1);
                    const enemyKey = "enemy" + letter; // Assuming format like "enemyA", "enemyB"

                    if (this.enemyData[enemyKey]) {
                        const enemyInfo = this.enemyData[enemyKey];
                        const x = col * this.cellWidth + this.cellWidth / 2;
                        const y = row * this.cellHeight + this.cellHeight / 2;

                        if (!enemyInfo.texture || enemyInfo.texture.length === 0) {
                            console.warn(`Enemy ${enemyKey} has no texture defined. Skipping placement.`);
                            continue;
                        }

                        // Ensure the texture frame exists in the atlas
                        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
                            console.warn(`Texture frame '${enemyInfo.texture[0]}' not found in 'game_asset' atlas for enemy ${enemyKey}. Skipping placement.`);
                            this.enemyList[row][col] = "00"; // Correct data if sprite cannot be placed
                            continue;
                        }

                        const enemySprite = this.add.sprite(x, y, "game_asset", enemyInfo.texture[0])
                            .setInteractive(); // Draggable can be added later if needed
                        enemySprite.setData("enemyKey", enemyKey);
                        enemySprite.setData("gridPos", { row, col });
                         // Set sprite depth to be based on row, for slight overlap effect if needed
                         enemySprite.setDepth(row);
                        this.enemyGroup.add(enemySprite);

                        if (powerup !== "0" && this.itemData[powerup]) {
                            const itemInfo = this.itemData[powerup];

                            // Ensure item texture frame exists
                            if (!itemInfo.texture || itemInfo.texture.length === 0 || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                                console.warn(`Texture frame for powerup ${powerup} ('${itemInfo.texture?.[0]}') not found. Skipping powerup visual.`);
                                // Correct data if visual cannot be placed
                                 this.enemyList[row][col] = letter + "0";
                                 enemySprite.setData("powerup", null); // Clear powerup data on sprite
                            } else {
                                const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.3);
                                const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.75);
                                // Position relative to enemy sprite
                                const powerupContainer = this.add.container(enemySprite.x + 20, enemySprite.y, [bubble, powerupImage]);
                                 powerupContainer.setDepth(enemySprite.depth + 1); // Ensure powerup is above enemy
                                powerupContainer.setData("itemId", powerup);
                                enemySprite.setData("powerup", powerup);
                                enemySprite.setData("powerupContainer", powerupContainer); // Store reference directly
                            }
                        } else if (powerup !== "0") {
                             console.warn(`Item data not found for powerup code ${powerup}. Removing from enemy ${enemyKey}.`);
                             this.enemyList[row][col] = letter + "0"; // Correct data
                             enemySprite.setData("powerup", null); // Clear powerup data on sprite
                        }


                    } else {
                        console.warn(`Enemy data not found for key: ${enemyKey} at (${row}, ${col}). Cell value: ${code}. Clearing cell.`);
                         this.enemyList[row][col] = "00"; // Correct data
                    }
                }
            }
        }
        console.log("Grid population complete.");
    }


    placeEnemy(row, col, enemyKey) {
        console.log(`Attempting to place ${enemyKey} at grid cell (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
            console.warn("Placement outside grid bounds.");
            return;
        }

        const x = col * this.cellWidth + this.cellWidth / 2;
        const y = row * this.cellHeight + this.cellHeight / 2;

        this.removeEnemyAtCell(row, col); // Clear cell first

        // Check if enemyKey looks valid before proceeding
         if (!enemyKey || typeof enemyKey !== 'string' || !enemyKey.startsWith('enemy')) {
              console.error(`Invalid enemyKey format provided: ${enemyKey}`);
              return;
         }
        const letter = enemyKey.replace("enemy", ""); // Assumes format "enemyA", "enemyB" etc.
        const enemyInfo = this.enemyData[enemyKey];

        if (!enemyInfo || !enemyInfo.texture || enemyInfo.texture.length === 0) {
            console.error(`Missing or invalid enemy info for ${enemyKey}`);
            return;
        }
        // Ensure texture frame exists
        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(enemyInfo.texture[0])) {
            console.warn(`Texture frame '${enemyInfo.texture[0]}' not found for enemy ${enemyKey}. Cannot place.`);
            return;
        }

        const enemySprite = this.add.sprite(x, y, "game_asset", enemyInfo.texture[0])
            .setInteractive();
         enemySprite.setDepth(row); // Set depth based on row
        enemySprite.setData("enemyKey", enemyKey);
        enemySprite.setData("gridPos", { row, col });
        this.enemyGroup.add(enemySprite);

        // Ensure the row exists in the list before assigning
        if (!this.enemyList[row]) {
             console.warn(`Enemy list row ${row} did not exist. Creating.`);
             this.enemyList[row] = Array(this.gridCols).fill("00");
        }
        this.enemyList[row][col] = letter + "0"; // Default no powerup
        this.hasUnsavedChanges = true;
         this.updateSaveButtonState(); // Update button visual

        console.log(`Enemy ${enemyKey} placed.`);
        return enemySprite;
    }

    placePowerup(row, col, itemId) {
        console.log(`Attempting to place powerup ${itemId} at grid cell (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return;

        // Check if an enemy exists at the target cell
        const currentCode = this.enemyList[row]?.[col]; // Optional chaining
        if (!currentCode || currentCode === "00") {
            console.log("No enemy at this position to attach powerup to.");
            return;
        }

        // Find the enemy sprite
        let enemySprite = null;
        for (const sprite of this.enemyGroup.getChildren()) {
            const pos = sprite.getData("gridPos");
            if (pos && pos.row === row && pos.col === col) {
                enemySprite = sprite; // Found it
                break;
            }
        }

        if (!enemySprite || !enemySprite.active) { // Check if sprite exists and is active
            console.error(`Enemy list indicates an enemy at (${row}, ${col}) but no active sprite was found.`);
            // Optional: Try to reconcile data?
             // this.enemyList[row][col] = "00"; // Example: Clear data if sprite missing
            return;
        }

        // Remove existing powerup visual if present
        const existingPowerupContainer = enemySprite.getData("powerupContainer");
        if (existingPowerupContainer) {
            existingPowerupContainer.destroy();
             enemySprite.setData("powerupContainer", null); // Clear reference
        }

        // Create new powerup visual
        const itemInfo = this.itemData[itemId];
        if (!itemInfo || !itemInfo.texture || itemInfo.texture.length === 0) {
            console.error(`Missing item info for ${itemId}`);
            return;
        }
        // Ensure item texture frame exists
        if (!this.textures.exists('game_asset') || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
            console.warn(`Texture frame '${itemInfo.texture[0]}' not found for powerup ${itemId}. Cannot place visual.`);
            // Still update the data below, just without the visual
        } else {
            const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.3);
            const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.75);
            // Position relative to enemy sprite
            const powerupContainer = this.add.container(enemySprite.x + 20, enemySprite.y, [bubble, powerupImage]);
             powerupContainer.setDepth(enemySprite.depth + 1); // Ensure powerup is above enemy
            powerupContainer.setData("itemId", itemId);
            enemySprite.setData("powerupContainer", powerupContainer);
        }

        // Update sprite data and main enemy list
        enemySprite.setData("powerup", itemId);
        const letter = currentCode.charAt(0);
        this.enemyList[row][col] = letter + itemId;
        this.hasUnsavedChanges = true;
         this.updateSaveButtonState();

        console.log(`Powerup ${itemId} attached.`);
    }


    removeEnemyAtCell(row, col) {
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols || !this.enemyList[row] || this.enemyList[row][col] === "00") {
            return; // Nothing to remove
        }

        console.log(`Removing entity at cell (${row}, ${col})`);
        // Find and remove sprite and its powerup container
        const children = this.enemyGroup.getChildren();
        let changed = false;
        for (let i = children.length - 1; i >= 0; i--) {
            const sprite = children[i];
            const pos = sprite.getData("gridPos");
            if (pos && pos.row === row && pos.col === col) {
                const powerupContainer = sprite.getData("powerupContainer");
                if (powerupContainer) {
                    powerupContainer.destroy();
                }
                sprite.destroy(); // This also removes it from the group
                 changed = true;
                break; // Assuming only one sprite per cell
            }
        }

         // Only update data and flag if something was actually removed visually
         if (changed) {
            this.enemyList[row][col] = "00"; // Update data
            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
         } else {
              console.warn(`Attempted to remove at (${row}, ${col}), but no sprite found.`);
              // Optionally sync data if sprite was missing but data indicated otherwise
               if (this.enemyList[row][col] !== "00") {
                    this.enemyList[row][col] = "00";
                    this.hasUnsavedChanges = true; // Data was corrected
                    this.updateSaveButtonState();
               }
         }
    }


    handlePlaceObject(pointer) {
        // Cooldown check
        const now = Date.now();
        if (now - this.lastSelectionTime < this.SELECTION_COOLDOWN) return;

        // Prevent action if a menu is open
        if (this.menuOpen) {
            console.log("Placement blocked: Menu is open.");
            return;
        }

        // Check if pointer is over any UI element (palette, save button, menus)
        if (this.isOverUI(pointer)) {
            console.log("Placement blocked: Pointer over UI.");
            return;
        }

        if (!this.currentTool) return;

        console.log("Handle place object triggered. Tool:", this.currentTool);

        // Calculate grid cell based on pointer position relative to the camera scroll
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const col = Math.floor(worldX / this.cellWidth);
        const row = Math.floor(worldY / this.cellHeight);


        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            console.log("Click outside grid bounds.");
            return;
        }

        // Perform action based on tool
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
            // Randomize is handled by its button directly
        }
    }

    isOverUI(pointer) {
         const checkBounds = (gameObject) => {
             // Check if gameObject exists, has getBounds, and pointer is within
             return gameObject && gameObject.active && typeof gameObject.getBounds === 'function' && Phaser.Geom.Rectangle.Contains(gameObject.getBounds(), pointer.x, pointer.y);
         };

         // Check palette panel background bounds
         if (this.palettePanel && this.palettePanel.active) {
             // Check individual icons within the palette container
              for(const icon of this.paletteIcons) {
                   if(checkBounds(icon)) return true;
                   // Check the background graphic associated with the icon too
                   const bg = icon.getData ? icon.getData('toolButton') || icon.getData('stageButtonBg') || icon.getData('addButtonBg') : null;
                   if(checkBounds(bg)) return true;
              }
              // Check the main background graphic of the panel itself
              if (this.palettePanel.list[0] && checkBounds(this.palettePanel.list[0])) return true; // Assuming first element is bg
         }

         // Check save button and its background
         if (checkBounds(this.saveButton)) return true;
         if (checkBounds(this.saveButtonBg)) return true;

         // Check enemy select menu overlay bounds (if it exists and is active)
         if (checkBounds(this.enemySelectOverlay)) return true;
         // Check item select menu overlay bounds (if it exists and is active)
         if (checkBounds(this.itemSelectOverlay)) return true;

         // Check gamepad help button
         if (this.gamepadInfoButton && checkBounds(this.gamepadInfoButton)) return true;

        return false;
    }

    // --- Stage Management ---

    async saveLevel() {
         if (!this.hasUnsavedChanges) {
              console.log("No changes to save.");
              // Optional: Show brief message
              const noChangesText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                  `Stage ${this.currentStage} - No Changes`, { fontSize: '20px', color: '#00ff00', backgroundColor: '#000a', padding: { x: 10, y: 5 } }
              ).setOrigin(0.5).setDepth(10000);
              setTimeout(() => noChangesText.destroy(), 1500);
              return;
         }
         if (!this.database) {
             console.error("Database not available. Cannot save.");
              const errorText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                  `Save Error: No Database Connection`, { fontSize: '20px', color: '#ff0000', backgroundColor: '#000a', padding: { x: 10, y: 5 } }
              ).setOrigin(0.5).setDepth(10000);
              setTimeout(() => errorText.destroy(), 3000);
             return;
         }


        const savingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            `Saving Stage ${this.currentStage}...`, { fontSize: '24px', color: '#fff', backgroundColor: '#000a', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000); // Ensure it's on top

        try {
            // Ensure enemyList is valid and clean before saving
            if (!Array.isArray(this.enemyList)) {
                throw new Error("Enemy list data is not an array.");
            }
            // Trim or pad rows/columns to ensure correct dimensions
            this.enemyList = this.enemyList.slice(0, this.gridRows); // Trim extra rows
            while (this.enemyList.length < this.gridRows) { // Pad rows
                this.enemyList.push(Array(this.gridCols).fill("00"));
            }
             this.enemyList = this.enemyList.map(row => {
                 if (!Array.isArray(row)) row = Array(this.gridCols).fill("00"); // Fix non-array rows
                 row = row.slice(0, this.gridCols); // Trim extra columns
                 while (row.length < this.gridCols) { // Pad columns
                     row.push("00");
                 }
                 // Ensure all elements are strings
                 return row.map(cell => (typeof cell === 'string' ? cell : "00"));
             });


            const path = `games/evil-invaders/stage${this.currentStage}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            this.hasUnsavedChanges = false;
            this.updateSaveButtonState(); // Update button visual
            savingText.setText(`Stage ${this.currentStage} Saved!`).setColor('#00ff00');
            console.log(`Stage ${this.currentStage} saved successfully.`);

            setTimeout(() => savingText.destroy(), 2000);
        } catch (error) { // Use simple catch
            console.error(`Error saving stage ${this.currentStage}:`, error);
            savingText.setText(`Save Error: ${error.message || 'Unknown error'}`).setColor('#ff0000');
            // Don't destroy instantly on error, let user see message
             setTimeout(() => savingText.destroy(), 5000);
        }
    }


    async changeStage(stageNumber) {
        if (this.currentStage === stageNumber) return; // No change needed

        // Use window.confirm for simple confirmation
        if (this.hasUnsavedChanges && !window.confirm(`Unsaved changes in stage ${this.currentStage}. Discard changes and load stage ${stageNumber}?`)) {
            return; // User canceled
        }
         if (!this.database) {
             console.error("Database not available. Cannot change stage.");
             // Show error message
              const errorText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                  `Error: No Database Connection`, { fontSize: '20px', color: '#ff0000', backgroundColor: '#000a', padding: { x: 10, y: 5 } }
              ).setOrigin(0.5).setDepth(10000);
              setTimeout(() => errorText.destroy(), 3000);
             return;
         }

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            `Loading Stage ${stageNumber}...`, { fontSize: '24px', color: '#fff', backgroundColor: '#000a', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

         const previousStage = this.currentStage; // Store previous stage in case of error

        try {
            this.currentStage = stageNumber;
            this.updateStageButtons(); // Reflect change immediately in UI (if palette exists)
            await this.fetchEnemyList(); // Fetch new data (includes validation/init)

            // Re-populate grid (fetchEnemyList initializes if needed)
             // populateGridFromEnemyList calls cleanup internally
            this.populateGridFromEnemyList();

            this.hasUnsavedChanges = false; // Reset flag
             this.updateSaveButtonState(); // Update button visual
            loadingText.destroy();
            console.log(`Changed to stage ${stageNumber}.`);
        } catch (error) {
            console.error(`Error changing to stage ${stageNumber}:`, error);
            loadingText.setText(`Error Loading Stage ${stageNumber}!`).setColor('#ff0000');
             // Revert currentStage if loading fails
             this.currentStage = previousStage;
             this.updateStageButtons(); // Update UI back
             // Maybe try to reload the previous stage's data? Or leave corrupted state?
             // For now, just show error and revert the number.
            setTimeout(() => loadingText.destroy(), 3000);
        }
    }

    async createNewStage() {
        // Use window.confirm
        if (this.hasUnsavedChanges && !window.confirm("Unsaved changes. Discard and create new stage?")) return;

         if (!this.database) {
             console.error("Database not available. Cannot create new stage.");
               const errorText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                  `Error: No Database Connection`, { fontSize: '20px', color: '#ff0000', backgroundColor: '#000a', padding: { x: 10, y: 5 } }
              ).setOrigin(0.5).setDepth(10000);
              setTimeout(() => errorText.destroy(), 3000);
             return;
         }

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Creating New Stage...", { fontSize: '24px', color: '#fff', backgroundColor: '#000a', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

        try {
            // Determine the next stage number safely
            const newStageNumber = this.availableStages.length > 0
                ? Math.max(...this.availableStages.map(Number)) + 1 // Ensure numbers before max
                : 0;
            console.log(`Creating new stage ${newStageNumber}`);

            // Update state
            this.currentStage = newStageNumber;
            this.availableStages.push(newStageNumber);
            this.availableStages.sort((a, b) => a - b); // Keep sorted
            this.initializeDefaultEnemyList(); // Prepare empty list for the new stage

            // Save the empty grid for the new stage to Firebase
            const path = `games/evil-invaders/stage${newStageNumber}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            // Update UI completely
            this.cleanupGameObjects(); // Clear existing sprites/previews

            // Recreate palette panel to include the new stage button
            // this.palettePanel might be destroyed in cleanup, ensure it's handled
             if (this.palettePanel) this.palettePanel.destroy();
             if (this.saveButton) this.saveButton.destroy();
             if (this.saveButtonBg) this.saveButtonBg.destroy();
            this.createPalettePanel(); // Recreates panel, stage buttons, save button

            // Populate the (now empty) grid visually
            this.populateGridFromEnemyList();

            this.hasUnsavedChanges = false; // New stage starts clean
             this.updateSaveButtonState(); // Update button visual
            loadingText.setText(`Stage ${newStageNumber} Created!`).setColor('#00ff00');
            setTimeout(() => loadingText.destroy(), 2000);

        } catch (error) {
            console.error("Error creating new stage:", error);
            loadingText.setText("Error Creating Stage!").setColor('#ff0000');
            // Consider reverting state changes if creation failed partially
            setTimeout(() => loadingText.destroy(), 3000);
        }
    }


    // --- Helpers & Utilities ---

    updateStageButtons() {
         if (!this.paletteIcons) return; // Check if icons exist

        this.paletteIcons.forEach(icon => {
            // Check if icon is valid and has expected data/methods
            if (icon && icon.active && icon.getData && typeof icon.getData === 'function') {
                if (icon.getData('isStageButton')) {
                    const stageNum = icon.getData('stageNumber');
                    const bg = icon.getData('stageButtonBg'); // Get background graphic
                    const isActive = (stageNum === this.currentStage);

                     // Check if text object methods exist
                     if (typeof icon.setColor === 'function') {
                         icon.setColor(isActive ? "#fff" : "#ccc");
                     }

                     // Check if background graphic exists and has methods
                     if (bg && bg.active && typeof bg.clear === 'function' && typeof bg.fillStyle === 'function' && typeof bg.fillRoundedRect === 'function') {
                         const buttonX = icon.x - icon.displayWidth / 2; // Approximate position based on display width
                         const buttonY = icon.y - icon.displayHeight / 2;
                         const buttonSize = 30; // Assuming fixed size used during creation
                         // Need original position/size used in creation. Let's retrieve from data if possible.
                         const storedX = icon.getData('buttonX');
                         const storedY = icon.getData('buttonY');
                         const storedSize = icon.getData('buttonSize') || buttonSize;
                         bg.clear()
                             .fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8)
                              .fillRoundedRect(storedX !== undefined ? storedX : buttonX, storedY !== undefined ? storedY : buttonY, storedSize, storedSize, 15);
                    }
                }
            }
        });
    }

    cleanupGameObjects() {
         console.log("Cleaning up game objects...");
         // Destroy powerup containers attached to sprites first
         // Check if enemyGroup exists and has getChildren method
         if (this.enemyGroup && typeof this.enemyGroup.getChildren === 'function') {
             this.enemyGroup.getChildren().forEach(sprite => {
                 if (sprite && sprite.getData && typeof sprite.getData === 'function') {
                     const powerupContainer = sprite.getData("powerupContainer");
                     if (powerupContainer && typeof powerupContainer.destroy === 'function') {
                         powerupContainer.destroy();
                         sprite.setData("powerupContainer", null); // Clear reference
                     }
                 }
             });
             // Clear sprites from group and destroy them
              if (typeof this.enemyGroup.clear === 'function') {
                 this.enemyGroup.clear(true, true);
              }
         } else if (this.enemyGroup) {
              console.warn("enemyGroup exists but seems invalid for cleanup.");
         }

        // Destroy cursor preview
        if (this.cursorPreview && typeof this.cursorPreview.destroy === 'function') {
            this.cursorPreview.destroy();
            this.cursorPreview = null;
        }
        // Close menus if they are open
        this.closeEnemySelectMenu();
        this.closeItemSelectMenu();
        this.menuOpen = false; // Reset menu flag

        console.log("Game objects cleanup finished.");
    }

    highlightEnemyToolButton() {
         if (!this.paletteIcons) return;
        const enemyToolIcon = this.paletteIcons.find(icon => icon && icon.getData && icon.getData('toolType') === 'enemy');
        if (enemyToolIcon) this.highlightToolButton(enemyToolIcon);
    }

    highlightPowerupToolButton() {
         if (!this.paletteIcons) return;
        const powerupToolIcon = this.paletteIcons.find(icon => icon && icon.getData && icon.getData('toolType') === 'powerup');
        if (powerupToolIcon) this.highlightToolButton(powerupToolIcon);
    }

    highlightDeleteToolButton() {
         if (!this.paletteIcons) return;
        const deleteToolIcon = this.paletteIcons.find(icon => icon && icon.getData && icon.getData('toolType') === 'delete');
        if (deleteToolIcon) this.highlightToolButton(deleteToolIcon);
    }

    // Use imported analyzeEnemyList
    analyzeLevelDistribution() {
        return analyzeEnemyList(this.enemyList); // Assumes layoutGenerator.js is imported
    }

    // Use imported generateAestheticLayout
    async randomizeLevel() { // Make async if layout generation could be slow
        const now = Date.now();
        if (now - this.lastRandomizeTime < this.RANDOMIZE_COOLDOWN) return;
        this.lastRandomizeTime = now;

        // Use window.confirm
        if (this.hasUnsavedChanges && !window.confirm("Unsaved changes. Randomize anyway?")) return;

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Randomizing...", { fontSize: '24px', color: '#fff', backgroundColor: '#000a', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

        try {
            // Ensure grid config is correct
            const gridConfig = { gridRows: this.gridRows, gridCols: this.gridCols };
            const distribution = this.analyzeLevelDistribution(); // Analyze current or fallback

            // Check if distribution has enemies before generating
            if (!distribution || Object.keys(distribution.enemies || {}).length === 0) {
                 console.warn("No enemies found in current distribution to randomize. Generating default layout or keeping empty.");
                  // Option 1: Initialize with a default empty list
                  this.initializeDefaultEnemyList();
                  // Option 2: Generate a small random default set (more complex)
                  // Example: distribution = { enemies: { 'enemyA': 10 }, powerups: { '1': 2 } };
                  // this.enemyList = generateAestheticLayout(gridConfig, distribution);
                  // For now, just initialize empty
            } else {
                 // Generate layout using imported function
                this.enemyList = generateAestheticLayout(gridConfig, distribution);
            }

             // Validate the generated list
             if (!Array.isArray(this.enemyList) || this.enemyList.length !== this.gridRows || !this.enemyList.every(r => Array.isArray(r) && r.length === this.gridCols)) {
                  console.error("Generated enemy list is invalid. Re-initializing default.");
                  this.initializeDefaultEnemyList();
                  throw new Error("Layout generation failed validation.");
             }


            this.hasUnsavedChanges = true;
            this.updateSaveButtonState(); // Update button
            this.populateGridFromEnemyList(); // This now calls cleanup

            loadingText.setText("Level Randomized!").setColor('#00ff00');
            setTimeout(() => loadingText.destroy(), 2000);
        } catch (error) {
            console.error("Error randomizing level:", error);
            loadingText.setText("Randomize Error!").setColor('#ff0000');
            // Don't destroy instantly, let user see the error
             setTimeout(() => loadingText.destroy(), 3000);
        }
    }

    // --- Gamepad Instructions ---
    createGamepadInstructions() {
        // Store reference to button if needed elsewhere
        this.gamepadInfoButton = this.add.text(this.cameras.main.width - 30, this.cameras.main.height - 30, "ℹ️",
            { fontSize: '24px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 2 }, }
        ).setOrigin(0.5).setInteractive().setDepth(501); // Above save button bg

         this.gamepadInfoButton.on("pointerdown", () => this.showGamepadHelp());

         // Optional: Add hover effect
          this.gamepadInfoButton.on("pointerover", () => this.gamepadInfoButton.setColor('#ffff00'));
          this.gamepadInfoButton.on("pointerout", () => this.gamepadInfoButton.setColor('#ffffff'));

        // Simple pulse tween
         if (this.tweens) {
             this.tweens.add({ targets: this.gamepadInfoButton, scale: { from: 1, to: 1.2 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
         }
    }


    showGamepadHelp() { // Public for GamepadManager
        // Close previous help if open
         if (this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
         if (this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();


        this.gamepadHelpOverlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(10001); // Ensure overlay is above everything

        this.gamepadHelpPanel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2)
            .setDepth(10002); // Ensure panel is above overlay

        const panelWidth = 500;
        const panelHeight = 400;
        const bg = this.add.graphics(); // Create graphics for the panel background
         bg.fillStyle(0x333333, 0.95);
         bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
         bg.lineStyle(2, 0xAAAAAA);
         bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);
        this.gamepadHelpPanel.add(bg); // Add background to the container


        const title = this.add.text(0, -panelHeight / 2 + 30, "GAMEPAD CONTROLS", {
            fontFamily: "Arial", fontSize: "24px", fontStyle: "bold", color: "#FFFFFF"
        }).setOrigin(0.5);
        this.gamepadHelpPanel.add(title);

        const instructions = [
            "Left Stick : Move cursor",
            "A Button   : Place / Select",
            "B Button   : Delete tool",
            "X Button   : Enemy tool (opens menu)",
            "Y Button   : Item tool (opens menu)",
            "Start      : Save level",
            "Select     : Randomize level",
            "LB / RB    : Switch stages (-/+)",
            "",
            "Tap screen to close"
        ];
        let y = -panelHeight / 2 + 70; // Start below title
        const textStyle = { fontFamily: "monospace", fontSize: "17px", color: "#E0E0E0", align: 'left'}; // Monospace looks nice here
         const textX = -panelWidth / 2 + 30; // Left align text

        instructions.forEach(line => {
             const txt = this.add.text(textX, y, line, textStyle).setOrigin(0, 0); // Align top-left within panel coords
            this.gamepadHelpPanel.add(txt);
            y += 28; // Line spacing
        });

        // Make overlay clickable to close
        this.gamepadHelpOverlay.on("pointerdown", () => {
            if(this.gamepadHelpPanel) this.gamepadHelpPanel.destroy();
            if(this.gamepadHelpOverlay) this.gamepadHelpOverlay.destroy();
             this.gamepadHelpPanel = null;
             this.gamepadHelpOverlay = null;
        });
    }

    // Added refresh method for potential use by EditorScene (though not strictly needed if it's a top-level scene)
    refresh () {
         // This scene is likely intended to be run directly or replace EditorScene,
         // but if it were launched *within* EditorScene as a draggable window,
         // this method would handle updating its camera position.
         // For now, it does nothing as it controls the main camera.
         console.log("LevelEditorScene refresh called (currently no-op)");
    }

    // Define static properties for potential use by EditorScene if loaded as a window
    static WIDTH = 800; // Example default width
    static HEIGHT = 600; // Example default height


}