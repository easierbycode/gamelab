// Removed CONSTANTS and PROPERTIES imports as they might not be needed or should be managed globally.
// Removed LoadScene import.
import {
  Boss,
  FlirtyGirl,
  FlirtyRevenge,
  MonkeyBrain,
  Pyramid,
  Trump,
} from "https://codepen.io/CodeMonkeyGames/pen/MWRrLqy.js"; // Keep boss logic imports

class BossViewerScene extends Phaser.Scene {
  // --- Window Properties ---
  parent; // Reference to the parent zone in EditorScene

  // --- Boss Viewer State ---
  explosionTextures = [];
  validatedFramesCache = new Map();
  animationCache = new Map();
  activeBoss = null;
  activeSprite = null;
  animButtons = [];
  bossButtons = [];
  currentBossInstance = null; // Track the current boss instance
  bossData = null; // Store loaded boss data
  rawBossData = null; // Store raw data for animation lookups
  bossInfo = []; // Store UI elements for boss info
  characterContainer = null; // Container for the boss sprite
  animButtonsContainer = null; // Container for anim buttons
  bossButtonsContainer = null; // Container for boss selection buttons
  pixelImages = []; // For pixel effect
  particleContainer = null; // Container for pixel particles


  // --- Constructor for Window Scene ---
  constructor (handle, parent)
  {
      // Pass the scene key to the Phaser.Scene constructor
      super({ key: handle });
      this.parent = parent; // Store the parent zone reference
      // window.gameScene = this; // Avoid global exposure if possible
  }

  // No preload needed here if assets (game.json, game_asset atlas) are loaded by EditorScene/LoadScene
  preload() {
      // pixel image might still be needed if not loaded globally
       this.load.image(
           "pixel",
           "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjBFNUJGMUI5NjEwRjExRTdCNTdDQUEzMzM1RTIyRjg2IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjBFNUJGMUJBNjEwRjExRTdCNTdDQUEzMzM1RTIyRjg2Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MEU1QkYxQjc2MTBGMTFFN0I1N0NBQTMzMzVFMjJGODYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MEU1QkYxQjg2MTBGMTFFN0I1N0NBQTMzMzVFMjJGODYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4FxQZlAAAAHElEQVR42mL8//8/AymAiYFEMKphVMPQ0QAQYABVbQMd0MbiHwAAAABJRU5ErkJggg=="
       );
  }

  create() {
      // --- Camera and Viewport Setup ---
      this.cameras.main.setViewport(this.parent.x, this.parent.y, BossViewerScene.WIDTH, BossViewerScene.HEIGHT);
      this.cameras.main.setBackgroundColor(0x2d2d2d); // Match original background
      this.cameras.main.setScroll(0, 0);

      // --- Load Boss Data ---
      // Assume 'game.json' is loaded globally and accessible via cache
      if (this.cache.json.has('game.json')) {
          this.bossData = this.cache.json.get('game.json').bossData;
      } else {
          this.add.text(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT / 2, 'Error: game.json not found in cache.', { color: '#ff0000', fontSize: '16px' }).setOrigin(0.5);
          console.error("BossViewerScene Error: 'game.json' not found in cache.");
          return; // Stop creation if data is missing
      }

      // --- Initialize Scene ---
      this.initScene();

       // Add a subtle background or frame if desired, or keep it simple
       const bg = this.add.graphics();
       bg.fillStyle(0x1a1a1a, 0.5); // Darker, slightly transparent background
       bg.fillRect(0, 0, BossViewerScene.WIDTH, BossViewerScene.HEIGHT);
       bg.lineStyle(1, 0x555555);
       bg.strokeRect(0, 0, BossViewerScene.WIDTH, BossViewerScene.HEIGHT);
       this.add.existing(bg);
  }

  // Called by EditorScene when the parent zone is dragged
  refresh ()
  {
      // Update camera position to match the parent zone
      this.cameras.main.setPosition(this.parent.x, this.parent.y);

      // Bring this scene to the top of the display list
      if (this.sys && this.sys.bringToTop) {
           this.sys.bringToTop();
      }
  }

  initScene() {
      // bossData is already loaded in create()

      console.log("BossViewerScene: Raw boss data:", this.bossData);

      // Process the boss data to ensure proper format
      this.processBossData();

      if (
          !this.bossData ||
          !this.bossData.bosses ||
          this.bossData.bosses.length === 0
      ) {
          this.add
              .text(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT / 2, "Error: Could not load boss data", {
                  color: "#ff0000",
                  fontSize: "18px",
              })
              .setOrigin(0.5);
          return;
      }

      console.log("BossViewerScene: Processed boss data:", this.bossData);

      // Check if 'game_asset' atlas is loaded
       if (!this.textures.exists('game_asset')) {
            this.add.text(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT / 2, 'Error: game_asset atlas not loaded.', { color: '#ffcc00', fontSize: '16px' }).setOrigin(0.5);
            console.error("BossViewerScene Error: 'game_asset' atlas not found.");
            return; // Stop if essential texture is missing
       }

      // Set up UI
      this.createUI();

      // Select first boss by default if available
      if (this.bossData.bosses.length > 0) {
          this.selectBoss(this.bossData.bosses[0]);
      }
  }

  processBossData() {
      // If we don't have boss data, create a default format
      if (!this.bossData) {
          this.bossData = { bosses: [] };
          return;
      }

      console.log("Processing boss data in BossViewerScene:", this.bossData);

      // Add specific frameKey mappings for each boss
      const frameKeyMappings = {
          boss0: "pyramidNewer0.png",
          boss1: "flirty_girl0.png",
          boss2: "trump10.png",
          boss3: "flirtyRevenge0.png",
          boss4: "monkeyBrain0.png",
          bossExtra: "elon0.png",
      };

      // If we already have a bosses array, ensure each boss has the correct properties
      if (this.bossData.bosses && this.bossData.bosses.length > 0) {
          this.bossData.bosses.forEach((boss) => {
              if (!boss || typeof boss !== 'object') return; // Skip invalid entries

              // Make sure we have an id
              if (!boss.id && boss.name) {
                  const knownBosses = {
                      pyramid: "boss0",
                      flirty_girl: "boss1",
                      trump: "boss2",
                      flirty_revenge: "boss3",
                      monkeyBrain: "boss4",
                      bison: "bossExtra", // Assuming 'elon' corresponds to 'bison' in name? Adjust if needed.
                  };
                  boss.id = knownBosses[boss.name] || `boss${boss.name.toLowerCase()}`;
              }

              // Add the correct frameKey based on the boss ID
              if (boss.id && frameKeyMappings[boss.id]) {
                  boss.frameKey = frameKeyMappings[boss.id];
              }

              // Extract animation names if not already present
              if (!boss.anims && boss.anim && typeof boss.anim === 'object') {
                   boss.anims = Object.keys(boss.anim).filter(k => !k.startsWith('_'));
                   console.log(`Found ${boss.anims.length} animations for ${boss.name || boss.id}:`, boss.anims);
              } else if (!boss.anims) {
                   boss.anims = []; // Default to empty if no anim data
              }
          });
          // Filter out any invalid boss entries that might have crept in
          this.bossData.bosses = this.bossData.bosses.filter(boss => boss && boss.id);
          // Store raw data for animation lookups (assuming bossData itself holds the needed structure)
           this.rawBossData = this.bossData.bosses.reduce((acc, boss) => {
               // Need to find the original raw data associated with this boss ID from the cached JSON
               const originalData = this.cache.json.get('game.json')?.bossData?.[boss.id];
               if (originalData) {
                   acc[boss.id] = originalData;
               }
               return acc;
           }, {});
           console.log("Storing raw boss data for animation access:", this.rawBossData);
          return;
      }

      // Fallback: Extract bosses from the object structure (boss0, boss1, etc.) if 'bosses' array is missing
      const bossList = [];
      const bossContainer = this.bossData; // Assume bossData is the container { boss0: {...}, boss1: {...} }
      this.rawBossData = bossContainer; // Store this as raw data

      for (const key in bossContainer) {
          if (key.startsWith("boss") && bossContainer[key] && typeof bossContainer[key] === 'object') {
              const boss = { ...bossContainer[key] }; // Clone to avoid modifying cache

              boss.id = key;
              if (!boss.name) boss.name = key.charAt(0).toUpperCase() + key.slice(1);
              if (frameKeyMappings[key]) boss.frameKey = frameKeyMappings[key];

              if (boss.anim && typeof boss.anim === 'object') {
                  boss.anims = Object.keys(boss.anim).filter(k => !k.startsWith('_'));
              } else {
                  boss.anims = [];
              }
              bossList.push(boss);
          }
      }

      if (bossList.length > 0) {
          this.bossData = { bosses: bossList };
          console.log("Extracted bosses in BossViewerScene:", bossList.length);
      } else {
          this.bossData = { bosses: [] };
          console.error("No bosses found in the data structure in BossViewerScene!");
      }
  }


  createUI() {
      // Add title within the window
      this.add
          .text(BossViewerScene.WIDTH / 2, 20, "Boss Character Viewer", {
              color: "#ffffff", fontSize: "20px", fontStyle: "bold",
          })
          .setOrigin(0.5);

      // Character display area centered in the window
      this.characterContainer = this.add.container(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT / 2 - 30); // Adjust Y position

      // Boss selection buttons container (horizontal list below title)
      this.bossButtonsContainer = this.add.container(BossViewerScene.WIDTH / 2, 60); // Y position for boss buttons
      this.createBossButtons();

      // Animation buttons container (bottom area)
      this.animButtonsContainer = this.add.container(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT - 50); // Y position for anim buttons

      // Instructions (optional, smaller text)
       this.add
           .text(BossViewerScene.WIDTH / 2, BossViewerScene.HEIGHT - 15, "Select boss & animation", {
               color: "#aaaaaa", fontSize: "12px",
           })
           .setOrigin(0.5);
  }

  createBossButtons() {
       if (!this.bossData || !this.bossData.bosses) return;

      const bosses = this.bossData.bosses;
      // Clear previous buttons
      this.bossButtonsContainer.removeAll(true); // Clear container children
      this.bossButtons = []; // Reset array

       if (bosses.length === 0) {
           this.bossButtonsContainer.add(this.add.text(0, 0, "No bosses loaded", { color: '#ffcc00', fontSize: '14px' }).setOrigin(0.5));
           return;
       }


      const buttonWidth = 100; // Slightly smaller buttons
      const spacing = 8;
      const totalWidth = (buttonWidth + spacing) * bosses.length - spacing;
      let startX = -totalWidth / 2; // Center the buttons relative to the container

      // Create a button for each boss
      bosses.forEach((boss, index) => {
          if (!boss || !boss.name) return; // Skip invalid bosses

          const x = startX + (buttonWidth + spacing) * index + buttonWidth / 2; // Center button

          // Button background
          const bg = this.add
              .rectangle(x, 0, buttonWidth, 30, 0x333333) // Smaller height
              .setInteractive()
              .on("pointerdown", () => {
                   this.highlightBossButton(bg);
                   this.selectBoss(boss);
              })
              .on('pointerover', () => { if(bg !== this.activeBossButton) bg.setFillStyle(0x555555); })
              .on('pointerout', () => { if(bg !== this.activeBossButton) bg.setFillStyle(0x333333); });


          // Button text
          const text = this.add
              .text(x, 0, boss.name.replace('_', ' '), { // Replace underscores for display
                  color: "#ffffff", fontSize: "12px", // Smaller font
                  align: 'center',
                  wordWrap: { width: buttonWidth - 10 }
              })
              .setOrigin(0.5);

          // Add to container and track
          this.bossButtonsContainer.add([bg, text]);
          this.bossButtons.push({ bg, text, boss }); // Store references for highlighting
      });
  }

   highlightBossButton(selectedBg) {
       this.bossButtons.forEach(btn => {
           btn.bg.setFillStyle(0x333333); // Reset all backgrounds
           btn.text.setColor('#ffffff');
       });
       selectedBg.setFillStyle(0x0077cc); // Highlight selected
       // Find corresponding text and highlight it too if needed
       const selectedButton = this.bossButtons.find(btn => btn.bg === selectedBg);
       if (selectedButton) {
           selectedButton.text.setColor('#ffff00');
       }
       this.activeBossButton = selectedBg; // Track active button
   }

  createAnimButtons(boss) {
      // Clear previous buttons
      this.animButtonsContainer.removeAll(true);
      this.animButtons = [];

      if (!boss.anims || boss.anims.length === 0) {
          const noAnims = this.add
              .text(0, 0, "No animations available", { color: "#ff5555", fontSize: "14px" })
              .setOrigin(0.5);
          this.animButtonsContainer.add(noAnims);
          this.animButtons.push(noAnims); // Add to array for potential cleanup
          return;
      }

      const buttonWidth = 100;
      const spacing = 8;
      const totalWidth = (buttonWidth + spacing) * boss.anims.length - spacing;
      let startX = -totalWidth / 2; // Center relative to container

      // Create a button for each animation
      boss.anims.forEach((anim, index) => {
          const x = startX + (buttonWidth + spacing) * index + buttonWidth / 2;

          // Button background
          const bg = this.add
              .rectangle(x, 0, buttonWidth, 30, 0x444444)
              .setInteractive()
              .on("pointerdown", () => {
                  this.highlightAnimButton(bg);
                  this.playAnimation(anim);
               })
              .on('pointerover', () => { if (bg !== this.activeAnimButton) bg.setFillStyle(0x666666); })
              .on('pointerout', () => { if (bg !== this.activeAnimButton) bg.setFillStyle(0x444444); });

          // Button text
          const text = this.add
              .text(x, 0, anim, { color: "#00ff00", fontSize: "12px", align: 'center' })
              .setOrigin(0.5);

          this.animButtonsContainer.add([bg, text]);
          this.animButtons.push({ bg, text }); // Store for highlighting/cleanup
      });
  }

   highlightAnimButton(selectedBg) {
       this.animButtons.forEach(btn => {
           if (btn.bg) btn.bg.setFillStyle(0x444444);
           if (btn.text) btn.text.setColor('#00ff00');
       });
       selectedBg.setFillStyle(0x009900);
       const selectedButton = this.animButtons.find(btn => btn.bg === selectedBg);
       if (selectedButton && selectedButton.text) {
           selectedButton.text.setColor('#ffffff');
       }
       this.activeAnimButton = selectedBg; // Track active button
   }

  selectBoss(boss) {
      if (!boss || !boss.id) {
           console.error("Invalid boss object passed to selectBoss:", boss);
           this.showError("Invalid boss selected.");
           return;
       }
      // Early return if selecting the same boss
      if (this.activeBoss && this.activeBoss.id === boss.id) {
          console.log(`Boss ${boss.name || boss.id} already selected`);
          return;
      }

      console.log(`Selecting boss: ${boss.name || boss.id}`);
      this.activeBoss = boss;

      // Clean up previous resources
      this.cleanup();

      // Check texture availability early
      if (!this.textures.exists("game_asset")) {
          this.displayPlaceholder(boss);
          return;
      }

      try {
          // Create boss instance (needed for potential data access, less critical for viewer)
          // const bossInstance = this.createBossInstance(boss); // Might not be needed just for viewing

          // Create sprite with optimal frame selection
          const sprite = this.createBossSprite(boss);
          if (!sprite) {
              this.showError("Failed to create sprite for " + (boss.name || boss.id));
              return;
          }

          // Scale and add to container
          sprite.setScale(boss.scale || 1.5); // Adjusted default scale for window view
          this.characterContainer.add(sprite);
          this.activeSprite = sprite;

          // Create animations first, then play
          this.ensureAnimationsExist(boss);
          this.playBossAnimation(boss);

          // Update UI elements
          this.createAnimButtons(boss);
          this.updateBossInfo(boss);

           // Initial button highlight
           const initialButton = this.bossButtons.find(btn => btn.boss.id === boss.id);
           if (initialButton) this.highlightBossButton(initialButton.bg);

      } catch (e) {
          console.error("Error in selectBoss:", e);
          this.showError(`Error selecting ${boss.name || boss.id}: ${e.message}`);
      }
  }

  // Extract sprite creation logic
  createBossSprite(boss) {
      const frameKey = boss.frameKey;

      try {
          let sprite = null;

          // Try the specified frameKey first
          if (frameKey && this.textures.getFrame("game_asset", frameKey)) {
              sprite = this.add.sprite(0, 0, "game_asset", frameKey).setVisible(false); // Start invisible for effect

              // Start the pixel assembly effect
              this.assemblePixelCharacter(boss).then(() => {
                  this.time.delayedCall(1500, () => {
                      this.explodePixelCharacter();
                      this.time.delayedCall(300, () => {
                          if (this.activeSprite === sprite) { // Ensure we are still on the same boss
                              sprite.setVisible(true);
                          } else {
                              sprite.destroy(); // Clean up if boss changed during effect
                          }
                      });
                  });
              }).catch(err => {
                   console.error("Pixel assembly failed:", err);
                   if(sprite && sprite.active) sprite.setVisible(true); // Show sprite immediately if effect fails
              });

              return sprite;
          }

          // Try finding a suitable frame based on boss ID if frameKey fails
          console.warn(`FrameKey '${frameKey}' not found for boss ${boss.id}. Searching...`);
          const frameNames = this.textures.get("game_asset").getFrameNames();
          const bossIdPattern = boss.id.replace("boss", "").toLowerCase();
          const matchingFrames = frameNames.filter((name) =>
              name.toLowerCase().includes(bossIdPattern) && name.includes('.png') // Basic check
          );

          if (matchingFrames.length > 0) {
               console.log(`Using fallback frame '${matchingFrames[0]}' for boss ${boss.id}`);
              return this.add.sprite(0, 0, "game_asset", matchingFrames[0]);
          }

          // Last resort - use first frame in atlas
          if (frameNames.length > 0) {
               console.warn(`Using first atlas frame '${frameNames[0]}' as last resort for boss ${boss.id}`);
              return this.add.sprite(0, 0, "game_asset", frameNames[0]);
          }

          // If all else fails
          console.error(`Could not find any suitable frame for boss ${boss.id}.`);
          this.showError(`No frame found for ${boss.name || boss.id}`);
          return null; // Indicate failure

      } catch (e) {
          console.error("Error creating sprite:", e);
          this.showError(`Sprite creation error: ${e.message}`);
          return null;
      }
  }

  // Function to assemble pixels into a character (implode effect)
  // Modified to return a Promise that resolves when all particles are assembled
  assemblePixelCharacter(boss) {
      return new Promise((resolve, reject) => {
          if (!this.textures.exists('pixel')) {
               return reject(new Error("Pixel texture not loaded."));
          }

          const frameKey = boss.frameKey;
          if (!frameKey || !this.textures.getFrame("game_asset", frameKey)) {
               return reject(new Error(`Invalid frameKey '${frameKey}' for pixel assembly.`));
           }

          // Get the frame information
          const frame = this.textures.getFrame("game_asset", frameKey);

          // Create a temporary canvas with ONLY the exact frame dimensions
          const tempCanvas = Phaser.Display.Canvas.CanvasPool.create(this, frame.width, frame.height);
          const tempCtx = tempCanvas.getContext("2d");

          try {
               // Draw only the specific frame portion to our canvas
               tempCtx.drawImage(
                   frame.source.image,
                   frame.cutX, frame.cutY, frame.width, frame.height,
                   0, 0, frame.width, frame.height
               );

               // Get the image data directly from this cutout
               const imageData = tempCtx.getImageData(0, 0, frame.width, frame.height);
               Phaser.Display.Canvas.CanvasPool.remove(tempCanvas); // Return canvas to pool

               const color = new Phaser.Display.Color();

               // Clean up any previous pixel images
               if (this.pixelImages) {
                   this.pixelImages.forEach((pixelObj) => pixelObj.image?.destroy());
               }
               this.pixelImages = [];

               // Create a container specifically for particles
               if (this.particleContainer) this.particleContainer.destroy();
               this.particleContainer = this.add.container(0, 0).setDepth(1); // Ensure particles are behind main sprite

               // Calculate character center position in the scene window
               const centerX = BossViewerScene.WIDTH / 2;
               const centerY = BossViewerScene.HEIGHT / 2 - 30; // Match characterContainer offset

               const sampleRate = 2; // Performance adjustment
               const maxParticles = 5000; // Performance limit
               let particleCount = 0;
               let completedParticles = 0;

               const scaleFactor = boss.scale || 1.5; // Use sprite scale

               // Process each pixel in the cutout frame
               for (let y = 0; y < frame.height; y += sampleRate) {
                   for (let x = 0; x < frame.width; x += sampleRate) {
                       if (particleCount >= maxParticles) break;

                       const i = (y * frame.width + x) * 4;
                       const r = imageData.data[i];
                       const g = imageData.data[i + 1];
                       const b = imageData.data[i + 2];
                       const a = imageData.data[i + 3];

                       if (a > 127) { // Only process visible pixels
                           const offsetX = (x - frame.width / 2) * scaleFactor;
                           const offsetY = (y - frame.height / 2) * scaleFactor;
                           const finalX = centerX + offsetX;
                           const finalY = centerY + offsetY;

                           const startX = Phaser.Math.Between(0, BossViewerScene.WIDTH);
                           const startY = Phaser.Math.Between(0, BossViewerScene.HEIGHT);

                           const image = this.add.image(startX, startY, "pixel").setScale(0);
                           color.setTo(r, g, b, a);
                           image.setTint(color.color);

                           this.particleContainer.add(image); // Add to dedicated container
                           this.pixelImages.push({ image: image, finalX: finalX, finalY: finalY });

                           const delay = Math.random() * 500; // Random delay for assembly

                           this.tweens.add({
                               targets: image,
                               duration: 1000 + Math.random() * 500,
                               x: finalX, y: finalY,
                               scaleX: 1, scaleY: 1,
                               angle: Math.random() * 720 - 360,
                               delay: delay,
                               ease: "Cubic.easeOut",
                               onComplete: () => {
                                   completedParticles++;
                                   if (completedParticles >= particleCount) {
                                       console.log('All particles assembled.');
                                       resolve();
                                   }
                               }
                           });
                           particleCount++;
                       }
                   }
                    if (particleCount >= maxParticles) break;
               }

               if (particleCount === 0) {
                   console.log('No particles to assemble');
                   resolve(); // Resolve immediately if no particles
               } else {
                   console.log(`Created ${particleCount} particles for assembly effect.`);
               }
                // Ensure character container is above particle container
               if (this.characterContainer) this.characterContainer.setDepth(10);

           } catch (err) {
                Phaser.Display.Canvas.CanvasPool.remove(tempCanvas); // Ensure cleanup on error
                console.error("Error during pixel processing:", err);
                reject(err);
           }
      });
  }


  // Function to scatter pixels from the character (explode effect)
  explodePixelCharacter() {
      if (!this.pixelImages || this.pixelImages.length === 0) {
          console.warn("No pixel images found to explode");
          return;
      }
       console.log(`Exploding ${this.pixelImages.length} particles.`);

      // Loop through all the pixel images
      this.pixelImages.forEach((pixelObj, index) => {
           if (!pixelObj.image || !pixelObj.image.active) return; // Skip destroyed/inactive

          // Random destination points outside the window
          const angle = Math.random() * Math.PI * 2;
          const distance = BossViewerScene.WIDTH / 2 + Math.random() * 200; // Explode outwards
          const destX = BossViewerScene.WIDTH / 2 + Math.cos(angle) * distance;
          const destY = BossViewerScene.HEIGHT / 2 + Math.sin(angle) * distance;

          this.tweens.add({
              targets: pixelObj.image,
              duration: 1500 + Math.random() * 1000, // Longer duration for explosion
              x: destX, y: destY,
              scaleX: 0, scaleY: 0, // Shrink to nothing
              angle: pixelObj.image.angle + Math.random() * 720 - 360, // Add random spin
              delay: Math.random() * 200, // Slight delay variation
              ease: "Cubic.easeIn",
              onComplete: () => {
                  pixelObj.image.destroy(); // Destroy the image when complete
              },
          });
      });
      this.pixelImages = []; // Clear the array after starting tweens
  }


  // Add a cleanup method to handle resource management
  cleanup() {
      // Stop any running tweens associated with particles or sprite
      this.tweens.killTweensOf(this.pixelImages.map(p => p.image));
      if(this.activeSprite) this.tweens.killTweensOf(this.activeSprite);

      // Clean up pixel images
      if (this.pixelImages) {
          this.pixelImages.forEach((pixelObj) => pixelObj.image?.destroy());
          this.pixelImages = [];
      }

      // Clean up particle container
      if (this.particleContainer) {
          this.particleContainer.destroy();
          this.particleContainer = null;
      }

      // Clean up main sprite
      if (this.activeSprite) {
          this.activeSprite.destroy();
          this.activeSprite = null;
      }

      // Clean up container contents but keep the container
      if (this.characterContainer) {
           this.characterContainer.removeAll(true);
      }

      // Clean up boss instance (less critical for viewer, but good practice)
      if (this.currentBossInstance) {
          // No shooting logic needed for viewer
          // No bullet cleanup needed
          // Just nullify reference
          this.currentBossInstance = null;
      }

      // Clear boss info text
       if (this.bossInfo) {
           this.bossInfo.forEach(item => item?.destroy());
           this.bossInfo = [];
       }

       // Reset active button highlights
       this.activeBossButton = null;
       this.activeAnimButton = null;
  }

  // Optimize boss instance creation (simplified for viewer)
  createBossInstance(boss) {
      // For the viewer, we might not need the full boss logic instance,
      // only the data. If specific methods are needed later, uncomment/adapt.
       this.currentBossInstance = { data: boss }; // Store data reference
       return this.currentBossInstance;

      /* // Original logic if full instance is needed:
      if (!this.rawBossData || !boss || !boss.id) return null;
      const bossData = this.rawBossData[boss.id];
      if (!bossData) return null;

      // Add explosion frames dynamically if needed by boss class constructor
      bossData.explosion = [ "explosion00.png", /* ... * / ];

      try {
          const stageId = boss.id.replace("boss", "");
          let bossInstance = null;
          // ... switch statement to create specific boss types ...
          this.currentBossInstance = bossInstance;
          return bossInstance;
      } catch (e) {
          console.error(`Error creating boss instance for ${boss.id}:`, e);
          return null;
      }
      */
  }

  // Optimize animation existence check and creation
  ensureAnimationsExist(boss) {
      if (!this.textures.exists("game_asset") || !this.rawBossData || !boss || !boss.id) {
           console.warn("Cannot ensure animations: Missing textures, rawBossData, or boss ID.");
          return;
      }

      const originalBossData = this.rawBossData[boss.id];
       // Check if raw data exists and has the 'anim' property
      if (!originalBossData || typeof originalBossData !== 'object' || !originalBossData.anim || typeof originalBossData.anim !== 'object') {
           console.warn(`No animation data found in rawBossData for boss ${boss.id}`);
           boss.anims = []; // Ensure anims array is empty if no data
           return; // Exit if no animation data
       }

      const validAnims = [];

      for (const animName in originalBossData.anim) {
          if (animName.startsWith("_")) continue; // Skip private/internal anims

          validAnims.push(animName); // Add to the list of available anims for the UI

          const animKey = `${boss.id}_${animName}`;
          if (this.animationCache.has(animKey) && this.anims.exists(animKey)) continue; // Skip if cached and exists

          const frameKeys = originalBossData.anim[animName];
          if (!Array.isArray(frameKeys) || frameKeys.length === 0) {
               console.warn(`No frame keys defined for animation '${animName}' in boss ${boss.id}`);
               continue;
           }

          const validFrameKeys = this.getValidFrameKeys(frameKeys);
          if (validFrameKeys.length === 0) {
               console.warn(`No valid frames found for animation '${animName}' in boss ${boss.id}. Frames checked: [${frameKeys.join(', ')}]`);
               continue; // Skip if no valid frames found after filtering
           }

          try {
              if (this.anims.exists(animKey)) this.anims.remove(animKey);

              this.anims.create({
                  key: animKey,
                  frames: validFrameKeys.map((frame) => ({ key: "game_asset", frame })),
                  frameRate: 6, // Adjust frame rate as needed
                  repeat: validFrameKeys.length > 1 ? -1 : 0, // Don't repeat single-frame anims
              });
              this.animationCache.set(animKey, true); // Cache successful creation
              console.log(`Created animation: ${animKey} with ${validFrameKeys.length} frames.`);
          } catch (e) {
              console.error(`Failed to create animation ${animKey}:`, e);
          }
      }

      // Update the boss object with the list of successfully processed animations
      boss.anims = validAnims;
      console.log(`Final available animations for ${boss.id}:`, boss.anims);
  }


  // Helper to get valid frame keys with caching
  getValidFrameKeys(frameKeys) {
      const cacheKey = frameKeys.join(",");
      if (this.validatedFramesCache.has(cacheKey)) {
          return this.validatedFramesCache.get(cacheKey);
      }

      // Validate frames against the 'game_asset' texture atlas
      const validFrames = frameKeys.filter(frame => {
           if (typeof frame !== 'string' || frame === '') return false; // Ensure frame is a non-empty string
           try {
               // Check if the frame exists in the atlas
               return this.textures.get("game_asset").has(frame);
           } catch (e) {
                // Catch potential errors if texture doesn't exist (should be checked earlier)
                console.error(`Error checking frame '${frame}' in texture 'game_asset':`, e);
               return false;
           }
       });

      this.validatedFramesCache.set(cacheKey, validFrames);
      return validFrames;
  }


  // Optimize animation playback
  playBossAnimation(boss) {
      if (!this.activeSprite || !this.activeSprite.active) {
           console.warn("Cannot play animation: Active sprite not available.");
           return;
      }
       if (!boss || !boss.anims || boss.anims.length === 0) {
            console.warn("Cannot play animation: No animations defined for the boss.");
            this.activeSprite.stop(); // Stop any previous animation
            // Optionally display a placeholder frame if sprite exists
            if (boss && boss.frameKey && this.textures.get("game_asset").has(boss.frameKey)) {
                 this.activeSprite.setFrame(boss.frameKey);
            }
           return;
       }

       let animToPlay = null;
       // Prioritize 'idle' animation
      if (boss.anims.includes("idle")) {
          animToPlay = "idle";
      } else {
          // Fallback to the first animation in the list
           animToPlay = boss.anims[0];
      }

       console.log(`Attempting to play animation '${animToPlay}' for boss ${boss.id}`);
       const success = this.playAnimation(animToPlay);

       if(success) {
           // Highlight the corresponding button if playback is successful
           const targetButton = this.animButtons.find(btn => btn.text && btn.text.text === animToPlay);
           if(targetButton && targetButton.bg) {
               this.highlightAnimButton(targetButton.bg);
           }
       } else {
            console.warn(`Failed to play default animation '${animToPlay}'. Stopping animation.`);
            this.activeSprite.stop();
            // Set to default frame if possible
            if (boss.frameKey && this.textures.get("game_asset").has(boss.frameKey)) {
                 this.activeSprite.setFrame(boss.frameKey);
            }
       }
  }


  // Simplify animation playback logic
  playAnimation(animName) {
      if (!this.activeSprite || !this.activeSprite.active || !this.activeBoss || !this.activeBoss.id) {
           console.warn(`Cannot play animation '${animName}': Missing sprite or boss context.`);
           return false;
      }

      const animKey = `${this.activeBoss.id}_${animName}`;

      // Check if the animation exists in Phaser's animation manager
      if (this.anims.exists(animKey)) {
           try {
               this.activeSprite.play(animKey);
               console.log(`Playing animation: ${animKey}`);
               return true;
           } catch (e) {
               console.error(`Error playing animation ${animKey}:`, e);
               this.showError(`Error playing ${animName}`);
               return false;
           }
      } else {
           console.warn(`Animation key '${animKey}' not found. Cannot play.`);
           // Attempt to ensure animations exist again? Might be redundant if called correctly before.
           // this.ensureAnimationsExist(this.activeBoss);
           // if (this.anims.exists(animKey)) { ... } // Retry playback if created
           this.showError(`Animation '${animName}' not found.`);
           return false;
      }
  }


  // Scene shutdown handler
  shutdown() {
      console.log(`Shutting down BossViewerScene (${this.scene.key})`);
      // Clean up resources
      this.cleanup();

      // Clear caches
      this.validatedFramesCache.clear();
      this.animationCache.clear();

      // Clear UI containers explicitly if they might persist
       this.bossButtonsContainer?.destroy();
       this.animButtonsContainer?.destroy();
       this.characterContainer?.destroy();

      // Clear references
      this.activeBoss = null;
      this.rawBossData = null;
      this.bossData = null;
      this.parent = null; // Break reference to parent zone
  }

  updateBossInfo(boss) {
      // Remove previous info if any
      if (this.bossInfo) {
          this.bossInfo.forEach(item => item?.destroy());
      }
      this.bossInfo = [];

      // Add boss name (positioned below buttons)
      const nameText = this.add
          .text(BossViewerScene.WIDTH / 2, 100, (boss.name || boss.id).replace('_', ' '), { // Y position below boss buttons
              color: "#ffffff", fontSize: "16px", fontStyle: "bold",
          })
          .setOrigin(0.5);

      // Add other info if needed (e.g., boss.description)
      // const descText = this.add.text(...)

      this.bossInfo = [nameText].filter(Boolean); // Filter out null/undefined
  }

  // --- Error Handling ---
   showError(message) {
       console.error("BossViewerScene Error:", message);
       // Display error message within the scene window
       const errorText = this.add.text(
           BossViewerScene.WIDTH / 2,
           BossViewerScene.HEIGHT - 80, // Position near the bottom
           `Error: ${message}`,
           { color: '#ff5555', fontSize: '14px', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 5, y: 3 } }
       ).setOrigin(0.5);
        // Add to bossInfo array so it gets cleaned up
        this.bossInfo.push(errorText);
   }

    displayPlaceholder(boss) {
        console.warn(`Displaying placeholder for boss: ${boss.name || boss.id}`);
        this.characterContainer.add(
            this.add.text(0, 0, `Cannot display\n${boss.name || boss.id}\n(Missing Assets)`, {
                color: '#ffcc00', fontSize: '18px', align: 'center'
            }).setOrigin(0.5)
        );
         this.createAnimButtons({ anims: [] }); // Show "No animations" message
         this.updateBossInfo(boss);
    }

  // --- Removed Methods ---
  // updateBody (likely specific to game logic, not needed for viewer)
  // createPlayer (not needed for viewer)
}

// Define static dimensions for use in EditorScene
BossViewerScene.WIDTH = 600; // Adjust size as needed
BossViewerScene.HEIGHT = 450; // Adjust size as needed

export default BossViewerScene; // Export the scene class

// Remove the Phaser game initialization logic from this file
// const config = { ... };
// window.addEventListener("DOMContentLoaded", () => { ... });