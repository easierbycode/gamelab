/**
 * GamepadManager - Handles gamepad connectivity and input for the level editor
 * Uses Phaser's built-in gamepad support
 */

export class GamepadManager {
  constructor(scene) {
    this.scene = scene;
    this.gamepad = null;
    this.isEnabled = false;
    this.cursorSpeed = 10; // Base speed for cursor movement
    this.deadZone = 0.2;   // Analog stick dead zone
    
    // Keep track of button states to detect changes
    this.buttonStates = {
      A: false,       // Primary action (place/select)
      B: false,       // Cancel/back/delete
      X: false,       // Secondary action (tool 1)
      Y: false,       // Secondary action (tool 2)
      L1: false,      // Switch tool left (Left shoulder)
      R1: false,      // Switch tool right (Right shoulder)
      START: false,   // Open menu / save
      SELECT: false,  // Change stage
      UP: false,
      DOWN: false,
      LEFT: false,
      RIGHT: false
    };
    
    // Track cursor position
    this.cursor = {
      x: scene.cameras.main.width / 2,
      y: scene.cameras.main.height / 2
    };
    
    // Create cursor visual if enabled
    this.cursorVisual = null;
    
    // Gamepad state
    this.connected = false;
    
    // Initialize gamepad detection
    this.initialize();
  }
  
  initialize() {
    // Enable Phaser's gamepad plugin
    this.scene.input.gamepad.on('connected', this.handleGamepadConnected, this);
    this.scene.input.gamepad.on('disconnected', this.handleGamepadDisconnected, this);
  }
  
  handleGamepadConnected(pad) {
    console.log(`Gamepad connected: ${pad.id}`);
    this.gamepad = pad;
    this.connected = true;
    this.isEnabled = true;
    this.createCursorVisual();
    
    // Show a notification
    const notification = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height - 50,
      "Gamepad connected! Press START for controls",
      {
        fontFamily: "Arial",
        fontSize: "18px",
        fill: "#00ff00",
        backgroundColor: "#000000aa",
        padding: { x: 15, y: 10 }
      }
    ).setOrigin(0.5).setDepth(10000);
    
    this.scene.tweens.add({
      targets: notification,
      alpha: { from: 1, to: 0 },
      y: notification.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
  }
  
  handleGamepadDisconnected(pad) {
    console.log(`Gamepad disconnected: ${pad.id}`);
    if (this.gamepad === pad) {
      this.gamepad = null;
      this.connected = false;
      this.isEnabled = false;
      this.destroyCursorVisual();
    }
  }
  
  createCursorVisual() {
    if (!this.cursorVisual && this.isEnabled) {
      // Create a game cursor visual for gamepad mode
      this.cursorVisual = this.scene.add.graphics();
      this.cursorVisual.lineStyle(2, 0x00ff00, 1);
      this.cursorVisual.strokeCircle(0, 0, 10);
      this.cursorVisual.fillStyle(0x00ff00, 0.5);
      this.cursorVisual.fillCircle(0, 0, 5);
      this.cursorVisual.setDepth(10000); // Ensure it's on top
      
      // Position at the current cursor
      this.cursorVisual.x = this.cursor.x;
      this.cursorVisual.y = this.cursor.y;
    }
  }
  
  destroyCursorVisual() {
    if (this.cursorVisual) {
      this.cursorVisual.destroy();
      this.cursorVisual = null;
    }
  }
  
  update() {
    if (!this.gamepad || !this.isEnabled) return;
    
    // Process input from gamepad
    this.processAnalogStick();
    this.processButtons();
    
    // Update cursor visual if present
    if (this.cursorVisual) {
      this.cursorVisual.x = this.cursor.x;
      this.cursorVisual.y = this.cursor.y;
    }
  }
  
  processAnalogStick() {
    if (!this.gamepad) return;
    
    // Read analog stick values using Phaser's gamepad API
    let lx = this.gamepad.leftStick.x;
    let ly = this.gamepad.leftStick.y;
    
    // Apply dead zone (Phaser has its own deadzone handling but we'll keep this for consistency)
    if (Math.abs(lx) < this.deadZone) lx = 0;
    if (Math.abs(ly) < this.deadZone) ly = 0;
    
    // Adjust cursor position based on analog stick
    if (lx !== 0 || ly !== 0) {
      // Squared response curve for more precision
      const magnitude = Math.min(1, Math.sqrt(lx*lx + ly*ly));
      const speedFactor = magnitude * (0.5 + 1.5 * magnitude); // Progressive speed
      
      this.cursor.x += lx * this.cursorSpeed * speedFactor;
      this.cursor.y += ly * this.cursorSpeed * speedFactor;
      
      // Bound cursor to screen
      this.cursor.x = Math.max(0, Math.min(this.scene.cameras.main.width, this.cursor.x));
      this.cursor.y = Math.max(0, Math.min(this.scene.cameras.main.height, this.cursor.y));
      
      // Update scene's mouse position for cursor-based tools
      this.scene.mouseX = this.cursor.x;
      this.scene.mouseY = this.cursor.y;
      
      // Move any existing cursor preview
      if (this.scene.cursorPreview) {
        if (this.scene.cursorPreview.x !== undefined) {
          this.scene.cursorPreview.x = this.cursor.x;
          this.scene.cursorPreview.y = this.cursor.y;
        } else if (this.scene.cursorPreview.setPosition) {
          this.scene.cursorPreview.setPosition(this.cursor.x, this.cursor.y);
        }
      }
    }
  }
  
  processButtons() {
    if (!this.gamepad) return;
    
    // Get previous button states
    const prevStates = {...this.buttonStates};
    
    // Update button states using Phaser's gamepad API
    this.buttonStates = {
      A: this.gamepad.A,                // A button
      B: this.gamepad.B,                // B button
      X: this.gamepad.X,                // X button
      Y: this.gamepad.Y,                // Y button
      L1: this.gamepad.L1,              // Left shoulder
      R1: this.gamepad.R1,              // Right shoulder
      SELECT: this.gamepad.back,        // Back/Select button
      START: this.gamepad.start,        // Start button
      UP: this.gamepad.up,              // D-pad up
      DOWN: this.gamepad.down,          // D-pad down
      LEFT: this.gamepad.left,          // D-pad left
      RIGHT: this.gamepad.right         // D-pad right
    };
    
    // Check for button press events (not held)
    if (this.buttonStates.A && !prevStates.A) {
      this.onButtonPressed('A');
    }
    if (this.buttonStates.B && !prevStates.B) {
      this.onButtonPressed('B');
    }
    if (this.buttonStates.X && !prevStates.X) {
      this.onButtonPressed('X');
    }
    if (this.buttonStates.Y && !prevStates.Y) {
      this.onButtonPressed('Y');
    }
    if (this.buttonStates.L1 && !prevStates.L1) {
      this.onButtonPressed('L1');
    }
    if (this.buttonStates.R1 && !prevStates.R1) {
      this.onButtonPressed('R1');
    }
    if (this.buttonStates.START && !prevStates.START) {
      this.onButtonPressed('START');
    }
    if (this.buttonStates.SELECT && !prevStates.SELECT) {
      this.onButtonPressed('SELECT');
    }
    if (this.buttonStates.UP && !prevStates.UP) {
      this.onButtonPressed('UP');
    }
    if (this.buttonStates.DOWN && !prevStates.DOWN) {
      this.onButtonPressed('DOWN');
    }
    if (this.buttonStates.LEFT && !prevStates.LEFT) {
      this.onButtonPressed('LEFT');
    }
    if (this.buttonStates.RIGHT && !prevStates.RIGHT) {
      this.onButtonPressed('RIGHT');
    }
  }
  
  onButtonPressed(button) {
    if (!this.scene) return;
    
    // Create fake pointer event at the cursor position
    const fakePointer = {
      x: this.cursor.x,
      y: this.cursor.y,
      event: { stopPropagation: () => {} }
    };
    
    switch (button) {
      case 'A': // Primary action
        // Emulate pointer down at current cursor position
        if (this.scene.handlePlaceObject) {
          this.scene.handlePlaceObject(fakePointer);
        }
        break;
        
      case 'B': // Delete tool
        // Select delete tool
        if (this.scene.paletteIcons) {
          for (let icon of this.scene.paletteIcons) {
            if (icon.toolType === "delete") {
              this.scene.currentTool = "delete";
              this.scene.selectedEnemy = null;
              this.scene.selectedItem = null;
              this.scene.highlightToolButton(icon);
              break;
            }
          }
        }
        break;
        
      case 'X': // Enemy tool
        // Select enemy placement tool
        if (this.scene.paletteIcons) {
          for (let icon of this.scene.paletteIcons) {
            if (icon.toolType === "enemy") {
              // Set tool and show menu
              this.scene.currentTool = "enemy";
              this.scene.highlightToolButton(icon);
              this.scene.showEnemySelectMenu();
              break;
            }
          }
        }
        break;
        
      case 'Y': // Item tool
        // Select powerup tool
        if (this.scene.paletteIcons) {
          for (let icon of this.scene.paletteIcons) {
            if (icon.toolType === "powerup") {
              // Set tool and show menu
              this.scene.currentTool = "powerup";
              this.scene.highlightToolButton(icon);
              this.scene.showItemSelectMenu();
              break;
            }
          }
        }
        break;
        
      case 'START': // Save level
        // Show help dialog or save level
        if (this.gamepad && this.gamepad.B) {
          // If B is also held, show gamepad help
          this.scene.showGamepadHelp();
        } else if (this.scene.saveLevel) {
          this.scene.saveLevel();
        }
        break;
        
      case 'SELECT': // Randomize level
        if (this.scene.paletteIcons) {
          for (let icon of this.scene.paletteIcons) {
            if (icon.toolType === "randomize") {
              this.scene.currentTool = "randomize";
              this.scene.highlightToolButton(icon);
              this.scene.randomizeLevel();
              break;
            }
          }
        }
        break;
        
      case 'L1': // Previous stage
        if (this.scene.availableStages && this.scene.currentStage !== undefined) {
          const currentIndex = this.scene.availableStages.indexOf(this.scene.currentStage);
          const prevStage = currentIndex - 1;
          if (prevStage >= 0) {
            this.scene.changeStage(this.scene.availableStages[prevStage]);
          }
        }
        break;
        
      case 'R1': // Next stage
        if (this.scene.availableStages && this.scene.currentStage !== undefined) {
          const currentIndex = this.scene.availableStages.indexOf(this.scene.currentStage);
          const nextStage = currentIndex + 1;
          if (nextStage < this.scene.availableStages.length) {
            this.scene.changeStage(this.scene.availableStages[nextStage]);
          }
        }
        break;
    }
  }
  
  // Check if any button is pressed
  isAnyButtonPressed() {
    return Object.values(this.buttonStates).some(state => state === true);
  }
  
  // Enable or disable gamepad control
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.createCursorVisual();
    } else {
      this.destroyCursorVisual();
    }
  }
}

// Export a function to create the gamepad manager
export function createGamepadManager(scene) {
  // Make sure gamepad support is enabled in Phaser
  scene.input.gamepad.active = true;
  
  return new GamepadManager(scene);
}
