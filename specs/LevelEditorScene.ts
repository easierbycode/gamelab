
// File: /Users/danieljohnson/CODE/evil-invaders/src/LevelEditorScene.ts
// New file: Adapted from spritehub/src/script.js
import Phaser from 'phaser';

// ESM Firebase web import
import { initializeApp, type FirebaseApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, type Database } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Import gamepad manager
import { createGamepadManager, GamepadManager } from "./gamepadManager";

// Import layout generator functions
import {
    analyzeEnemyList,
    generateAestheticLayout,
    shuffleArray,
    EnemyDistribution,
    GridConfig
} from "./layoutGenerator";

// Import firebase config
import { firebaseConfig } from "./firebase-config";

// Define interfaces for data structures
interface ItemData {
    [key: string]: { name: string; texture: string[] };
}

interface EnemyInfo {
    name: string;
    texture: string[];
    // Add other properties from your enemyData structure if needed
    hp?: number;
    speed?: number;
    // ...
}

interface EnemyData {
    [key: string]: EnemyInfo;
}

export class LevelEditorScene extends Phaser.Scene {
    // Grid and stage properties
    private gridRows: number = 45;
    private gridCols: number = 8;
    private cellWidth: number = 100;
    private cellHeight: number = 50;
    private enemyList: string[][] = [];
    public currentStage: number = 0;
    public availableStages: number[] = [];

    // Tools and selection state
    public currentTool: string | null = null;
    public selectedEnemy: string | null = null;
    public selectedItem: string | null = null;
    private lastSelectionTime: number = 0;
    private readonly SELECTION_COOLDOWN: number = 500; // ms
    private lastRandomizeTime: number = 0;
    private readonly RANDOMIZE_COOLDOWN: number = 1000; // ms
    private menuOpen: boolean = false; // Flag to track if a selection menu is open

    // Firebase properties
    private app: FirebaseApp;
    private database: Database;

    // Game data
    private enemyData: EnemyData = {};
    private readonly itemData: ItemData = {
        '1': { name: "SHOOT_NAME_BIG", texture: ["powerupBig0.png", "powerupBig1.png"] },
        '2': { name: "SHOOT_NAME_3WAY", texture: ["powerup3way0.png", "powerup3way1.png"] },
        '3': { name: "SHOOT_SPEED_HIGH", texture: ["speedupItem0.png", "speedupItem1.png"] },
        '9': { name: "BARRIER", texture: ["barrierItem0.png", "barrierItem1.png"] }
    };
    private hasUnsavedChanges: boolean = false;

    // Phaser specific properties
    private palettePanel!: Phaser.GameObjects.Container;
    public paletteIcons: any[] = []; // Consider defining a stricter type
    private enemyGroup!: Phaser.GameObjects.Group;
    private saveButton!: Phaser.GameObjects.Text;
    public cursorPreview: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | null = null;
    private enemySelectContainer: Phaser.GameObjects.Container | null = null;
    private enemySelectOverlay: Phaser.GameObjects.Rectangle | null = null;
    private itemSelectContainer: Phaser.GameObjects.Container | null = null;
    private itemSelectOverlay: Phaser.GameObjects.Rectangle | null = null;
    private activeToolButton: any | null = null; // Consider defining a stricter type

    // Input properties
    public mouseX: number = 0;
    public mouseY: number = 0;
    private placeObjectHandler: Phaser.Events.EventEmitter | null = null;

    // Gamepad properties
    private gamepadEnabled: boolean = true; // Can be controlled via config or setting
    private gamepadManager!: GamepadManager;

    // Atlas loading flag
    private atlasLoaded: boolean = false;

    constructor() {
        super({ key: "LevelEditorScene" }); // Use a unique key

        // Initialize Firebase App
        this.app = initializeApp(firebaseConfig);
        this.database = getDatabase(this.app);
    }

    preload() {
        // Load the necessary 'game_asset' atlas from Firebase
        // This replicates the logic from spritehub's LoadScene
        const atlasRef = ref(this.database, "atlases/evil-invaders");
        get(atlasRef).then(atlasesSnapshot => {
            if (atlasesSnapshot.exists()) {
                const atlasVal = atlasesSnapshot.val();
                const base64PNG = "data:image/png;base64," + atlasVal.png;
                const atlasJSON = JSON.parse(atlasVal.json);

                // Add the atlas image as a base64 texture
                this.textures.addBase64('game_asset', base64PNG);

                // Wait for the base64 texture to be added before adding the atlas frames
                this.textures.once('onload', () => {
                    this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                    this.atlasLoaded = true;
                    // Optionally, restart the scene to trigger create()
                    if (this.scene.isActive()) {
                        this.scene.restart();
                    }
                });

                // Fallback: If 'onload' doesn't fire, set a timeout to add the atlas after a short delay
                setTimeout(() => {
                    if (!this.atlasLoaded && this.textures.exists('game_asset')) {
                        this.textures.addAtlasJSONHash('game_asset', atlasJSON);
                        this.atlasLoaded = true;
                        if (this.scene.isActive()) {
                            this.scene.restart();
                        }
                    }
                }, 200);

            } else {
                console.error("Atlas 'evil-invaders' not found in Firebase!");
                // Handle error: maybe load a placeholder or show an error message
            }
        }).catch(error => {
            console.error("Error loading atlas from Firebase:", error);
        });

        // Indicate loading via text while atlas loads async
        const loadingText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Loading Assets...", { fontSize: "24px", color: "#fff" }
        ).setOrigin(0.5);
        // Remove loading text when scene restarts (atlas loaded)
        this.events.once('shutdown', () => loadingText.destroy());
    }

    async create() {
        // Wait for atlas to be loaded before proceeding
        if (!this.textures.exists('game_asset')) {
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                "Loading assets, please wait...", { fontSize: "20px", color: "#ff0000" }).setOrigin(0.5);
            // Don't proceed until atlas is loaded; scene will restart when ready
            return;
        }

        console.log("LevelEditorScene create started");
        // Ensure atlas is ready before proceeding
        if (!this.textures.exists('game_asset')) {
            console.error("'game_asset' texture atlas not loaded. Cannot proceed.");
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                "Error: Required assets not loaded.", { fontSize: "20px", color: "#ff0000" }).setOrigin(0.5);
            return;
        }

        const loadingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "Loading level data...",
            { fontSize: "24px", color: "#fff" } // Use 'color' instead of 'fill'
        ).setOrigin(0.5);

        try {
            await this.fetchGameStructure();
            await Promise.all([this.fetchEnemyData(), this.fetchEnemyList()]);
            loadingText.destroy();

            if (!this.enemyList || this.enemyList.length === 0) {
                this.initializeDefaultEnemyList();
                console.log("Initialized default empty enemy list.");
            } else {
                console.log(`Loaded enemy list for stage ${this.currentStage} with ${this.enemyList.length} rows.`);
            }

            this.drawGrid();
            this.createPalettePanel(); // Ensure this uses loaded assets
            this.enemyGroup = this.add.group();
            this.populateGridFromEnemyList(); // Ensure this uses loaded assets

            // Use Scene's input manager for pointerdown
            this.input.on("pointerdown", this.handlePlaceObject, this);
            this.placeObjectHandler = this.input; // Reference input manager

            // Initialize gamepad manager
            if (this.gamepadEnabled) {
                this.gamepadManager = createGamepadManager(this);
                this.createGamepadInstructions();
            }

            window.addEventListener("beforeunload", (e) => {
                if (this.hasUnsavedChanges) {
                    e.preventDefault();
                    e.returnValue = "Unsaved changes will be lost!";
                }
            });
            console.log("LevelEditorScene creation complete.");

        } catch (error) {
            loadingText.setText("Error loading data. Check console.");
            console.error("Error during LevelEditorScene create:", error);
        }
    }

    update() {
        // Pointer position update logic
        const pointer = this.input.activePointer;
        const isGamepadControlling = this.gamepadManager?.isEnabled && this.gamepadManager?.connected;

        if (!isGamepadControlling) {
            this.mouseX = pointer.x;
            this.mouseY = pointer.y;

            // Update cursor preview position if it exists and is not controlled by gamepad
            if (this.cursorPreview) {
                if (this.cursorPreview instanceof Phaser.GameObjects.Container || this.cursorPreview instanceof Phaser.GameObjects.Sprite) {
                    this.cursorPreview.setPosition(this.mouseX, this.mouseY);
                }
            }
        }
        // Update gamepad manager (it handles its own cursor updates)
        if (this.gamepadManager && this.gamepadEnabled) {
            this.gamepadManager.update();
            // If gamepad is controlling, mouseX/mouseY are updated inside gamepadManager
            if (isGamepadControlling) {
                this.mouseX = this.gamepadManager.cursor.x;
                this.mouseY = this.gamepadManager.cursor.y;
            }
        }
    }

    // --- Data Fetching ---

    async fetchGameStructure() {
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
            this.currentStage = this.availableStages[0]; // Start at the first available stage
            console.log("Available stages:", this.availableStages);
        } else {
            this.availableStages = [0]; // Default if no game data
            console.log("No game data found, defaulting to stage 0.");
        }
    }

    async fetchEnemyData() {
        const snapshot = await get(ref(this.database, "games/evil-invaders/enemyData"));
        this.enemyData = snapshot.exists() ? snapshot.val() : {};
        console.log("Enemy data fetched:", Object.keys(this.enemyData).length, "entries");
    }

    async fetchEnemyList() {
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
                console.log(`Enemy list for stage ${this.currentStage} fetched successfully.`);
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
        const graphics = this.add.graphics().lineStyle(1, 0xffffff, 0.3);
        const gridTotalWidth = this.gridCols * this.cellWidth;
        const gridTotalHeight = this.gridRows * this.cellHeight;

        for (let r = 0; r <= this.gridRows; r++) {
            graphics.strokeLineShape(new Phaser.Geom.Line(0, r * this.cellHeight, gridTotalWidth, r * this.cellHeight));
        }
        for (let c = 0; c <= this.gridCols; c++) {
            graphics.strokeLineShape(new Phaser.Geom.Line(c * this.cellWidth, 0, c * this.cellWidth, gridTotalHeight));
        }
        console.log("Grid drawn.");
    }

    createPalettePanel() {
        const panelWidth = this.cameras.main.width; // Use camera width
        const panelHeight = 70;
        this.palettePanel = this.add.container(0, 0);
        this.paletteIcons = []; // Reset icons array

        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.7);
        bg.fillRoundedRect(0, 0, panelWidth, panelHeight, 15);
        this.palettePanel.add(bg);

        const iconSpacing = 70;
        let iconX = 25;
        const paletteY = 15;
        const buttonSize = 40;

        const tools = [
            { key: "enemyIcon", type: "enemy", color: 0x3498db, labelText: "Enemy" },
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

            let uiElement: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
            if (tool.key) {
                uiElement = this.add.image(iconX + buttonSize / 2, paletteY + buttonSize / 2, tool.key)
                    .setOrigin(0.5).setInteractive().setScale(0.4);
            } else {
                uiElement = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize / 2, tool.label, {
                    fontFamily: "Arial", fontSize: "20px", color: "#fff"
                }).setOrigin(0.5).setInteractive();
            }

            const label = this.add.text(iconX + buttonSize / 2, paletteY + buttonSize + 5, tool.labelText, {
                fontFamily: "Arial", fontSize: "12px", color: "#ffffff", stroke: "#000000", strokeThickness: 1
            }).setOrigin(0.5, 0);
            this.palettePanel.add(label);

            // Store references and data on the uiElement itself (use 'any' for simplicity here)
            (uiElement as any).toolButton = buttonBg;
            (uiElement as any).toolType = tool.type;
            (uiElement as any).toolColor = tool.color;
            (uiElement as any).buttonX = iconX;
            (uiElement as any).buttonY = paletteY;
            (uiElement as any).buttonSize = buttonSize;

            uiElement.on("pointerdown", () => this.handleToolSelection(tool.type, uiElement));
            uiElement.on("pointerover", () => this.handleToolHover(uiElement, true));
            uiElement.on("pointerout", () => this.handleToolHover(uiElement, false));

            this.palettePanel.add(uiElement);
            this.paletteIcons.push(uiElement);
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
        this.paletteIcons.push(stageText); // Add to icons for potential bounds checking
        iconX += stageText.width + 10; // Adjust spacing based on text width

        this.updateStageButtonsUI(iconX, paletteY); // Call helper to create stage buttons

        // Save Button (Positioned below the panel)
        const saveButtonWidth = 130;
        const saveButtonHeight = 35;
        const saveButtonX = 20;
        const saveButtonY = panelHeight + 10;

        const saveButtonBg = this.add.graphics();
        saveButtonBg.fillStyle(0x9b59b6, 0.9); // Purple
        saveButtonBg.fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
        this.add.existing(saveButtonBg); // Add graphics to scene

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
            .on("pointerover", () => {
                saveButtonBg.clear().fillStyle(0x8e44ad, 1).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
            })
            .on("pointerout", () => {
                saveButtonBg.clear().fillStyle(0x9b59b6, 0.9).fillRoundedRect(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, 10);
            })
            .on("pointerdown", () => this.saveLevel());

        this.paletteIcons.push(this.saveButton); // Also add save button for bounds checking

        console.log("Palette panel created.");
    }

    updateStageButtonsUI(startX: number, startY: number) {
        let currentX = startX;
        const buttonSize = 30;
        const buttonSpacing = 5;
        const paletteY = startY; // Use the passed Y position

        // Remove existing stage buttons and "+" button before recreating
        this.paletteIcons = this.paletteIcons.filter(icon => {
            if (icon.getData && icon.getData('isStageButton')) {
                if (icon.getData('stageButtonBg')) icon.getData('stageButtonBg').destroy();
                icon.destroy();
                return false;
            }
            if (icon.getData && icon.getData('isAddButton')) {
                if (icon.getData('addButtonBg')) icon.getData('addButtonBg').destroy();
                icon.destroy();
                return false;
            }
            return true;
        });

        // Add stage number buttons based on available stages
        this.availableStages.forEach(stageNum => {
            const stageButtonBg = this.add.graphics();
            stageButtonBg.fillStyle(stageNum === this.currentStage ? 0xf39c12 : 0x555555, stageNum === this.currentStage ? 0.9 : 0.8);
            stageButtonBg.fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
            this.palettePanel.add(stageButtonBg);

            const stageBtn = this.add.text(currentX + buttonSize / 2, paletteY + 5 + buttonSize / 2, stageNum.toString(), {
                fontFamily: "Arial", fontSize: "16px", fontStyle: 'bold',
                color: stageNum === this.currentStage ? "#fff" : "#ccc"
            })
                .setOrigin(0.5)
                .setInteractive()
                .setData('isStageButton', true) // Mark as stage button
                .setData('stageNumber', stageNum)
                .setData('stageButtonBg', stageButtonBg); // Store ref

            stageBtn.on("pointerover", () => {
                stageButtonBg.clear().fillStyle(stageNum === this.currentStage ? 0xf1c40f : 0x777777, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
            });
            stageBtn.on("pointerout", () => {
                stageButtonBg.clear().fillStyle(stageNum === this.currentStage ? 0xf39c12 : 0x555555, 0.8).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
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
            addButtonBg.clear().fillStyle(0x2ecc71, 1).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
        });
        addStageBtn.on("pointerout", () => {
            addButtonBg.clear().fillStyle(0x27ae60, 0.9).fillRoundedRect(currentX, paletteY + 5, buttonSize, buttonSize, 15);
        });
        addStageBtn.on("pointerdown", () => {
            this.createNewStage();
        });

        this.palettePanel.add(addStageBtn);
        this.paletteIcons.push(addStageBtn); // Add to main list
    }

    handleToolSelection(toolType: string, uiElement: any) {
        this.currentTool = toolType;
        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = null;
        this.highlightToolButton(uiElement);

        if (toolType === "enemy") this.showEnemySelectMenu();
        else if (toolType === "powerup") this.showItemSelectMenu();
        else if (toolType === "delete") {
            this.selectedEnemy = null;
            this.selectedItem = null;
            console.log("Selected tool:", toolType);
        } else if (toolType === "randomize") this.randomizeLevel();
    }

    handleToolHover(uiElement: any, isOver: boolean) {
        const buttonBg = uiElement.toolButton;
        const tool = uiElement; // uiElement already has the data

        if (!buttonBg) return; // Safety check

        buttonBg.clear();
        if (isOver) {
            buttonBg.fillStyle(tool.toolColor, 1); // Full opacity on hover
            buttonBg.fillRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.7); // Brighter border
            buttonBg.strokeRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
        } else if (this.activeToolButton !== uiElement) { // Only reset if not the active button
            buttonBg.fillStyle(tool.toolColor, 0.9); // Default opacity
            buttonBg.fillRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
            buttonBg.lineStyle(2, 0xFFFFFF, 0.3); // Default border
            buttonBg.strokeRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
        } else {
            // Redraw active state if pointer moves out but it's still active
            this.highlightToolButton(this.activeToolButton);
        }

        // Scale animation
        const targetScale = (tool.key ? 0.4 : 1.0) * (isOver ? 1.1 : 1.0); // Base scale * hover multiplier
        this.tweens.add({
            targets: uiElement,
            scale: targetScale,
            duration: 100,
            ease: "Linear"
        });
    }

    highlightToolButton(tool: any) {
        // Reset previous active tool
        if (this.activeToolButton && this.activeToolButton !== tool && this.activeToolButton.toolButton) {
            const prevTool = this.activeToolButton;
            const prevBg = prevTool.toolButton as Phaser.GameObjects.Graphics;
            prevBg.clear();
            prevBg.fillStyle(prevTool.toolColor, 0.9);
            prevBg.fillRoundedRect(prevTool.buttonX, prevTool.buttonY, prevTool.buttonSize, prevTool.buttonSize, 10);
            prevBg.lineStyle(2, 0xFFFFFF, 0.3);
            prevBg.strokeRoundedRect(prevTool.buttonX, prevTool.buttonY, prevTool.buttonSize, prevTool.buttonSize, 10);
        }

        // Highlight new active tool
        this.activeToolButton = tool;
        if (tool.toolButton) {
            const activeToolBg = tool.toolButton as Phaser.GameObjects.Graphics;
            activeToolBg.clear();
            activeToolBg.fillStyle(tool.toolColor, 1); // Full opacity
            activeToolBg.fillRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
            activeToolBg.lineStyle(3, 0xFFFFFF, 1); // Thicker, brighter border
            activeToolBg.strokeRoundedRect(tool.buttonX, tool.buttonY, tool.buttonSize, tool.buttonSize, 10);
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
            .setOrigin(0).setInteractive();
        this.enemySelectOverlay.on("pointerdown", this.closeEnemySelectMenu, this);

        this.enemySelectContainer = this.add.container(50, 100);
        const numEnemies = Object.keys(this.enemyData).length;
        const menuHeight = Math.min(numEnemies * 60 + 20, this.cameras.main.height - 120); // Limit height
        const menuWidth = 300;

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.enemySelectContainer.add(bg);

        // Add a scrollable area if needed (simple implementation)
        const scrollMask = this.make.graphics();
        scrollMask.fillStyle(0xffffff);
        scrollMask.fillRect(0, 0, menuWidth, menuHeight);
        const mask = scrollMask.createGeometryMask();
        this.enemySelectContainer.setMask(mask);

        let i = 0;
        const spacing = 60;
        for (let enemyKey in this.enemyData) {
            const enemyInfo = this.enemyData[enemyKey];
            const yPos = 10 + i * spacing;

            const enemyImage = this.add.image(10, yPos, "game_asset", enemyInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            enemyImage.on("pointerdown", (p: Phaser.Input.Pointer) => this.selectEnemy(p, enemyKey, enemyInfo));

            const enemyLabel = this.add.text(70, yPos + enemyImage.height / 2, enemyInfo.name, { // Center label vertically
                fontFamily: "Arial", fontSize: "18px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive(); // Align to middle
            enemyLabel.on("pointerdown", (p: Phaser.Input.Pointer) => this.selectEnemy(p, enemyKey, enemyInfo));

            this.enemySelectContainer.add(enemyImage);
            this.enemySelectContainer.add(enemyLabel);
            i++;
        }
        // Basic scroll functionality (could be enhanced with scrollbar)
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
            if (this.enemySelectContainer && this.enemySelectOverlay) {
                const menuBounds = this.enemySelectContainer.getBounds();
                if (Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y)) {
                    const newY = this.enemySelectContainer.y - deltaY * 0.5;
                    const contentHeight = numEnemies * spacing + 20;
                    // Clamp scroll position
                    const minY = -(contentHeight - menuHeight); // Max scroll up
                    const maxY = 0; // Max scroll down (initial position)
                    this.enemySelectContainer.y = Phaser.Math.Clamp(newY, minY, maxY);
                }
            }
        });
    }

    closeEnemySelectMenu() {
        if (this.enemySelectContainer) this.enemySelectContainer.destroy();
        if (this.enemySelectOverlay) this.enemySelectOverlay.destroy();
        this.enemySelectContainer = null;
        this.enemySelectOverlay = null;
        // Re-enable main pointer handler
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel'); // Turn off wheel listener
    }

    selectEnemy(pointer: Phaser.Input.Pointer, enemyKey: string, enemyInfo: EnemyInfo) {
        pointer.event.stopPropagation(); // Prevent overlay click

        this.selectedEnemy = enemyKey;
        this.currentTool = "enemy";
        this.selectedItem = null;

        if (this.cursorPreview) this.cursorPreview.destroy();
        this.cursorPreview = this.add.sprite(this.mouseX, this.mouseY, "game_asset", enemyInfo.texture[0])
            .setAlpha(0.7).setScale(0.5).setDepth(1000);

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
            .setOrigin(0).setInteractive();
        this.itemSelectOverlay.on("pointerdown", this.closeItemSelectMenu, this);

        this.itemSelectContainer = this.add.container(50, 150); // Position differently from enemy menu
        const numItems = Object.keys(this.itemData).length;
        const menuHeight = Math.min(numItems * 60 + 20, this.cameras.main.height - 170);
        const menuWidth = 300;

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 0.9);
        bg.fillRoundedRect(0, 0, menuWidth, menuHeight, 10);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);
        this.itemSelectContainer.add(bg);

        // Scrolling setup similar to enemy menu
        const scrollMask = this.make.graphics().fillStyle(0xffffff).fillRect(0, 0, menuWidth, menuHeight);
        this.itemSelectContainer.setMask(scrollMask.createGeometryMask());

        let i = 0;
        const spacing = 60;
        for (let itemId in this.itemData) {
            const itemInfo = this.itemData[itemId];
            const yPos = 10 + i * spacing;

            const itemImage = this.add.image(10, yPos, "game_asset", itemInfo.texture[0])
                .setOrigin(0, 0).setInteractive();
            itemImage.on("pointerdown", (p: Phaser.Input.Pointer) => this.selectItem(p, itemId, itemInfo));

            const itemLabel = this.add.text(70, yPos + itemImage.height / 2, itemInfo.name, {
                fontFamily: "Arial", fontSize: "18px", color: "#fff", stroke: "#000", strokeThickness: 2
            }).setOrigin(0, 0.5).setInteractive();
            itemLabel.on("pointerdown", (p: Phaser.Input.Pointer) => this.selectItem(p, itemId, itemInfo));

            this.itemSelectContainer.add(itemImage);
            this.itemSelectContainer.add(itemLabel);
            i++;
        }

        // Basic scroll functionality
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
            if (this.itemSelectContainer && this.itemSelectOverlay) {
                const menuBounds = this.itemSelectContainer.getBounds();
                if (Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y)) {
                    const newY = this.itemSelectContainer.y - deltaY * 0.5;
                    const contentHeight = numItems * spacing + 20;
                    const minY = -(contentHeight - menuHeight);
                    const maxY = 150; // Initial Y position
                    this.itemSelectContainer.y = Phaser.Math.Clamp(newY, minY, maxY);
                }
            }
        });
    }

    closeItemSelectMenu() {
        if (this.itemSelectContainer) this.itemSelectContainer.destroy();
        if (this.itemSelectOverlay) this.itemSelectOverlay.destroy();
        this.itemSelectContainer = null;
        this.itemSelectOverlay = null;
        if (this.placeObjectHandler) this.placeObjectHandler.on("pointerdown", this.handlePlaceObject, this);
        this.menuOpen = false;
        this.input.off('wheel');
    }

    selectItem(pointer: Phaser.Input.Pointer, itemId: string, itemInfo: { name: string; texture: string[] }) {
        pointer.event.stopPropagation();

        this.selectedItem = itemId;
        this.currentTool = "powerup";
        this.selectedEnemy = null;

        if (this.cursorPreview) this.cursorPreview.destroy();

        const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.3);
        const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.75);
        this.cursorPreview = this.add.container(this.mouseX, this.mouseY, [bubble, powerupImage]).setDepth(1000);

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
            return;
        }

        for (let row = 0; row < this.gridRows; row++) {
            // Ensure the row exists and is an array
            if (!this.enemyList[row] || !Array.isArray(this.enemyList[row])) {
                console.warn(`Row ${row} missing or invalid in enemyList. Skipping.`);
                // Optionally fix the row:
                if (!this.enemyList[row]) this.enemyList[row] = [];
                while (this.enemyList[row].length < this.gridCols) {
                    this.enemyList[row].push("00");
                }
                continue; // Skip to next row after fixing/warning
            }

            for (let col = 0; col < this.gridCols; col++) {
                // Ensure the cell exists
                if (this.enemyList[row][col] === undefined) {
                    console.warn(`Cell (${row}, ${col}) missing in enemyList. Setting to '00'.`);
                    this.enemyList[row][col] = "00";
                }

                const code = this.enemyList[row][col];
                if (typeof code === 'string' && code !== "00") {
                    const letter = code.charAt(0);
                    const powerup = code.charAt(1);
                    const enemyKey = "enemy" + letter;

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
                            continue;
                        }

                        const enemySprite = this.add.sprite(x, y, "game_asset", enemyInfo.texture[0])
                            .setInteractive(); // Draggable can be added later if needed
                        enemySprite.setData("enemyKey", enemyKey);
                        enemySprite.setData("gridPos", { row, col });
                        this.enemyGroup.add(enemySprite);

                        if (powerup !== "0" && this.itemData[powerup]) {
                            const itemInfo = this.itemData[powerup];

                            // Ensure item texture frame exists
                            if (!itemInfo.texture || itemInfo.texture.length === 0 || !this.textures.get('game_asset').has(itemInfo.texture[0])) {
                                console.warn(`Texture frame for powerup ${powerup} ('${itemInfo.texture[0]}') not found. Skipping powerup visual.`);
                            } else {
                                const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.3);
                                const powerupImage = this.add.image(0, 0, "game_asset", itemInfo.texture[0]).setScale(0.75);
                                const powerupContainer = this.add.container(x + 20, y, [bubble, powerupImage]);
                                powerupContainer.setData("itemId", powerup);
                                enemySprite.setData("powerup", powerup);
                                enemySprite.setData("powerupContainer", powerupContainer); // Store reference directly
                            }
                        }
                    } else {
                        console.warn(`Enemy data not found for key: ${enemyKey} at (${row}, ${col}). Cell value: ${code}`);
                    }
                }
            }
        }
        console.log("Grid population complete.");
    }

    placeEnemy(row: number, col: number, enemyKey: string) {
        console.log(`Attempting to place ${enemyKey} at grid cell (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
            console.warn("Placement outside grid bounds.");
            return;
        }

        const x = col * this.cellWidth + this.cellWidth / 2;
        const y = row * this.cellHeight + this.cellHeight / 2;

        this.removeEnemyAtCell(row, col); // Clear cell first

        const letter = enemyKey.replace("enemy", "");
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
        enemySprite.setData("enemyKey", enemyKey);
        enemySprite.setData("gridPos", { row, col });
        this.enemyGroup.add(enemySprite);

        if (!this.enemyList[row]) this.enemyList[row] = Array(this.gridCols).fill("00");
        this.enemyList[row][col] = letter + "0"; // Default no powerup
        this.hasUnsavedChanges = true;

        console.log(`Enemy ${enemyKey} placed.`);
        return enemySprite;
    }

    placePowerup(row: number, col: number, itemId: string) {
        console.log(`Attempting to place powerup ${itemId} at grid cell (${row}, ${col})`);
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return;

        // Check if an enemy exists at the target cell
        const currentCode = this.enemyList[row]?.[col];
        if (!currentCode || currentCode === "00") {
            console.log("No enemy at this position to attach powerup to.");
            return;
        }

        // Find the enemy sprite
        let enemySprite: Phaser.GameObjects.Sprite | null = null;
        for (const sprite of this.enemyGroup.getChildren()) {
            const pos = sprite.getData("gridPos");
            if (pos && pos.row === row && pos.col === col) {
                enemySprite = sprite as Phaser.GameObjects.Sprite;
                break;
            }
        }

        if (!enemySprite) {
            console.error(`Enemy list indicates an enemy at (${row}, ${col}) but no sprite was found.`);
            return;
        }

        // Remove existing powerup visual if present
        const existingPowerupContainer = enemySprite.getData("powerupContainer");
        if (existingPowerupContainer) {
            existingPowerupContainer.destroy();
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
            const powerupContainer = this.add.container(enemySprite.x + 20, enemySprite.y, [bubble, powerupImage]);
            powerupContainer.setData("itemId", itemId);
            enemySprite.setData("powerupContainer", powerupContainer);
        }

        // Update sprite data and main enemy list
        enemySprite.setData("powerup", itemId);
        const letter = currentCode.charAt(0);
        this.enemyList[row][col] = letter + itemId;
        this.hasUnsavedChanges = true;

        console.log(`Powerup ${itemId} attached.`);
    }

    removeEnemyAtCell(row: number, col: number) {
        if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols || !this.enemyList[row] || this.enemyList[row][col] === "00") {
            return; // Nothing to remove
        }

        console.log(`Removing entity at cell (${row}, ${col})`);
        // Find and remove sprite and its powerup container
        const children = this.enemyGroup.getChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const sprite = children[i] as Phaser.GameObjects.Sprite;
            const pos = sprite.getData("gridPos");
            if (pos && pos.row === row && pos.col === col) {
                const powerupContainer = sprite.getData("powerupContainer");
                if (powerupContainer) {
                    powerupContainer.destroy();
                }
                sprite.destroy(); // This also removes it from the group
                break;
            }
        }

        this.enemyList[row][col] = "00"; // Update data
        this.hasUnsavedChanges = true;
    }

    handlePlaceObject(pointer: Phaser.Input.Pointer) {
        // Cooldown check
        const now = Date.now();
        if (now - this.lastSelectionTime < this.SELECTION_COOLDOWN) return;

        // Prevent action if a menu is open (redundant check, but safe)
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

        const col = Math.floor(pointer.x / this.cellWidth);
        const row = Math.floor(pointer.y / this.cellHeight);

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

    isOverUI(pointer: Phaser.Input.Pointer): boolean {
        // Check palette panel background bounds
        if (this.palettePanel && Phaser.Geom.Rectangle.Contains(this.palettePanel.getBounds(), pointer.x, pointer.y)) {
            return true;
        }
        // Check save button bounds
        if (this.saveButton && Phaser.Geom.Rectangle.Contains(this.saveButton.getBounds(), pointer.x, pointer.y)) {
            return true;
        }
        // Check enemy select menu overlay bounds (if it exists)
        if (this.enemySelectOverlay && Phaser.Geom.Rectangle.Contains(this.enemySelectOverlay.getBounds(), pointer.x, pointer.y)) {
            return true;
        }
        // Check item select menu overlay bounds (if it exists)
        if (this.itemSelectOverlay && Phaser.Geom.Rectangle.Contains(this.itemSelectOverlay.getBounds(), pointer.x, pointer.y)) {
            return true;
        }

        return false;
    }

    // --- Stage Management ---

    async saveLevel() {
        const savingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            `Saving Stage ${this.currentStage}...`, { fontSize: '24px', color: '#fff', backgroundColor: '#000', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000); // Ensure it's on top

        try {
            // Ensure enemyList is valid
            if (!Array.isArray(this.enemyList) || !this.enemyList.every(row => Array.isArray(row))) {
                throw new Error("Enemy list data is corrupted or invalid.");
            }
            // Trim or pad rows to ensure correct column count
            this.enemyList = this.enemyList.map(row => {
                if (row.length > this.gridCols) {
                    return row.slice(0, this.gridCols);
                }
                while (row.length < this.gridCols) {
                    row.push("00");
                }
                return row;
            });
            // Ensure correct number of rows
            while (this.enemyList.length < this.gridRows) {
                this.enemyList.push(Array(this.gridCols).fill("00"));
            }
            if (this.enemyList.length > this.gridRows) {
                this.enemyList = this.enemyList.slice(0, this.gridRows);
            }

            const path = `games/evil-invaders/stage${this.currentStage}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            this.hasUnsavedChanges = false;
            savingText.setText(`Stage ${this.currentStage} Saved!`);
            console.log(`Stage ${this.currentStage} saved successfully.`);

            setTimeout(() => savingText.destroy(), 2000);
        } catch (error: any) {
            console.error(`Error saving stage ${this.currentStage}:`, error);
            savingText.setText(`Save Error: ${error.message}`).setColor('#ff0000');
            setTimeout(() => savingText.destroy(), 5000);
        }
    }

    async changeStage(stageNumber: number) {
        if (this.currentStage === stageNumber) return; // No change needed

        if (this.hasUnsavedChanges && !confirm(`Unsaved changes in stage ${this.currentStage}. Discard changes and load stage ${stageNumber}?`)) {
            return; // User canceled
        }

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            `Loading Stage ${stageNumber}...`, { fontSize: '24px', color: '#fff', backgroundColor: '#000', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

        try {
            this.currentStage = stageNumber;
            this.updateStageButtons(); // Reflect change immediately in UI
            await this.fetchEnemyList(); // Fetch new data

            // Re-populate grid (fetchEnemyList initializes if needed)
            this.populateGridFromEnemyList(); // This now calls cleanupGameObjects internally

            this.hasUnsavedChanges = false; // Reset flag
            loadingText.destroy();
            console.log(`Changed to stage ${stageNumber}.`);
        } catch (error) {
            console.error(`Error changing to stage ${stageNumber}:`, error);
            loadingText.setText(`Error Loading Stage ${stageNumber}!`).setColor('#ff0000');
            setTimeout(() => loadingText.destroy(), 3000);
            // Optionally revert currentStage if loading fails
            // this.currentStage = previousStage;
            // this.updateStageButtons();
        }
    }

    async createNewStage() {
        if (this.hasUnsavedChanges && !confirm("Unsaved changes. Discard and create new stage?")) return;

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Creating New Stage...", { fontSize: '24px', color: '#fff', backgroundColor: '#000', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

        try {
            const newStageNumber = this.availableStages.length > 0 ? Math.max(...this.availableStages) + 1 : 0;
            console.log(`Creating new stage ${newStageNumber}`);

            this.currentStage = newStageNumber;
            this.availableStages.push(newStageNumber);
            this.availableStages.sort((a, b) => a - b); // Keep sorted
            this.initializeDefaultEnemyList();

            // Save the empty grid for the new stage
            const path = `games/evil-invaders/stage${newStageNumber}/enemylist`;
            await set(ref(this.database, path), this.enemyList);

            // Update UI completely
            this.cleanupGameObjects();
            this.palettePanel.destroy(); // Destroy old panel
            this.createPalettePanel(); // Recreate panel with new stage button
            this.populateGridFromEnemyList(); // Populate the (empty) grid

            this.hasUnsavedChanges = false;
            loadingText.setText(`Stage ${newStageNumber} Created!`);
            setTimeout(() => loadingText.destroy(), 2000);

        } catch (error) {
            console.error("Error creating new stage:", error);
            loadingText.setText("Error Creating Stage!").setColor('#ff0000');
            setTimeout(() => loadingText.destroy(), 3000);
        }
    }

    // --- Helpers & Utilities ---

    updateStageButtons() {
        this.paletteIcons.forEach((icon: any) => {
            if (icon.getData && icon.getData('isStageButton')) {
                const stageNum = icon.getData('stageNumber');
                const bg = icon.getData('stageButtonBg') as Phaser.GameObjects.Graphics;
                const isActive = (stageNum === this.currentStage);

                icon.setColor(isActive ? "#fff" : "#ccc");
                if (bg) {
                    bg.clear()
                        .fillStyle(isActive ? 0xf39c12 : 0x555555, isActive ? 0.9 : 0.8)
                        .fillRoundedRect(icon.x - 15, icon.y - 15, 30, 30, 15);
                }
            }
        });
    }

    cleanupGameObjects() {
        // Destroy powerup containers attached to sprites first
        this.enemyGroup?.getChildren().forEach((sprite: any) => {
            const powerupContainer = sprite.getData("powerupContainer");
            if (powerupContainer) {
                powerupContainer.destroy();
            }
        });
        this.enemyGroup?.clear(true, true); // Clear sprites from group and destroy them

        if (this.cursorPreview) {
            this.cursorPreview.destroy();
            this.cursorPreview = null;
        }
        this.closeEnemySelectMenu(); // Ensure menus are closed and cleaned up
        this.closeItemSelectMenu();
        this.menuOpen = false; // Reset menu flag
        console.log("Game objects cleaned up.");
    }

    highlightEnemyToolButton() {
        const enemyToolIcon = this.paletteIcons.find(icon => icon.getData && icon.getData('toolType') === 'enemy');
        if (enemyToolIcon) this.highlightToolButton(enemyToolIcon);
    }

    highlightPowerupToolButton() {
        const powerupToolIcon = this.paletteIcons.find(icon => icon.getData && icon.getData('toolType') === 'powerup');
        if (powerupToolIcon) this.highlightToolButton(powerupToolIcon);
    }

    highlightDeleteToolButton() {
        const deleteToolIcon = this.paletteIcons.find(icon => icon.getData && icon.getData('toolType') === 'delete');
        if (deleteToolIcon) this.highlightToolButton(deleteToolIcon);
    }

    // Use imported analyzeEnemyList
    analyzeLevelDistribution(): EnemyDistribution {
        return analyzeEnemyList(this.enemyList);
    }

    // Use imported generateAestheticLayout
    async randomizeLevel() {
        const now = Date.now();
        if (now - this.lastRandomizeTime < this.RANDOMIZE_COOLDOWN) return;
        this.lastRandomizeTime = now;

        if (this.hasUnsavedChanges && !confirm("Unsaved changes. Randomize anyway?")) return;

        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
            "Randomizing...", { fontSize: '24px', color: '#fff', backgroundColor: '#000', padding: { x: 16, y: 8 } }
        ).setOrigin(0.5).setDepth(10000);

        try {
            const gridConfig: GridConfig = { gridRows: this.gridRows, gridCols: this.gridCols };
            const distribution = this.analyzeLevelDistribution(); // Analyze current or fallback

            // Check if distribution has enemies before generating
            if (Object.keys(distribution.enemies).length === 0) {
                console.warn("No enemies found in current distribution to randomize. Using defaults or keeping empty.");
                // Optionally initialize with some default enemies if desired
                this.initializeDefaultEnemyList(); // Or generate a minimal random set
            } else {
                this.enemyList = generateAestheticLayout(gridConfig, distribution);
            }

            this.hasUnsavedChanges = true;
            this.populateGridFromEnemyList(); // This now calls cleanup

            loadingText.setText("Level Randomized!");
            setTimeout(() => loadingText.destroy(), 2000);
        } catch (error) {
            console.error("Error randomizing level:", error);
            loadingText.setText("Randomize Error!").setColor('#ff0000');
            setTimeout(() => loadingText.destroy(), 3000);
        }
    }

    // --- Gamepad Instructions ---
    createGamepadInstructions() {
        const infoButton = this.add.text(this.cameras.main.width - 30, this.cameras.main.height - 30, "ℹ️",
            { fontSize: '24px', color: '#ffffff' }
        ).setOrigin(0.5).setInteractive();
        infoButton.on("pointerdown", () => this.showGamepadHelp());

        this.tweens.add({ targets: infoButton, scale: { from: 1, to: 1.2 }, duration: 1000, yoyo: true, repeat: -1 });
    }

    public showGamepadHelp() { // Make public for GamepadManager
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(10001); // Ensure overlay is above everything

        const panel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2)
            .setDepth(10002); // Ensure panel is above overlay

        const bg = this.add.rectangle(0, 0, 500, 400, 0x333333).setOrigin(0.5);
        panel.add(bg);

        const title = this.add.text(0, -170, "GAMEPAD CONTROLS", {
            fontFamily: "Arial", fontSize: "24px", fontStyle: "bold", color: "#FFFFFF"
        }).setOrigin(0.5);
        panel.add(title);

        const instructions = [
            "Left Stick: Move cursor", "A Button: Place/Select", "B Button: Delete tool",
            "X Button: Enemy tool", "Y Button: Powerup tool", "Start: Save level",
            "Select: Randomize level", "LB/RB: Switch stages", "", "Click anywhere to close"
        ];
        let y = -130;
        instructions.forEach(line => {
            panel.add(this.add.text(0, y, line, { fontFamily: "Arial", fontSize: "18px", color: "#FFFFFF" }).setOrigin(0.5));
            y += 30;
        });

        overlay.on("pointerdown", () => {
            overlay.destroy();
            panel.destroy();
        });
    }
}